// ----------------------------------------------------------------------------
// 脚本名称: 1c_discover_from_open_data.ts
// 用途: 从 STM32 Open Pin Data (权威开源数据) 同步芯片数据库
// 描述: 
// 1. 本脚本从本地 embassy-rs 数据副本中读取所有 STM32 芯片的原始 JSON 定义。
// 2. 根据型号名称 (Part Number) 自动推断 Flash 和 RAM 大小，并过滤掉当前不受支持的系列。
// 3. 生成基础的逻辑型号列表 stm32_board_data.json，作为后续数据处理流程的源头 (SSOT)。
// 4. 采用 1:1 映射策略：一个逻辑型号对应一个 Board ID (例如 generic_stm32f103c8)。
// ----------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import { EMBASSY_STM32_DATA_PATH } from '../utils/data_sources';

const OUTPUT_STM32 = path.join(__dirname, '../generated', 'stm32_board_data.json'); // Changed to generated
const CHIPS_DIR = path.join(EMBASSY_STM32_DATA_PATH, 'data/chips');
const REGISTRY_PATH = path.join(__dirname, '../generated', 'stm32duino_support_registry.json'); // Changed to generated

// ----------------------------------------------------------------------------
// 辅助函数：从 MCU 名称推断硬件规格
// 依据 ST 官方命名规则：STM32 + 系列(2) + 产品线(2) + 引脚数(1) + Flash容量(1)
// ----------------------------------------------------------------------------

function getSpecsFromMcuName(mcu: string): string {
    const norm = mcu.toUpperCase();
    // 正则表达式匹配：STM32 + 系列(如F1) + 产品线(如03) + 引脚代码 + 容量代码
    const match = norm.match(/STM32([A-Z0-9]{2})([0-9]{2})[A-Z]([0-9A-Z])/);
    if (!match) return 'Unknown specs (from open data)';

    const series = match[1]; // 系列: F1, F4, L0 等
    const line = match[2];   // 产品线: 03, 07 等
    const flashCode = match[3]; // 容量代码: 8=64K, B=128K 等

    // 1. Flash 容量解码表
    const flashSizes: Record<string, number> = {
        '4': 16, '6': 32, '8': 64, 'B': 128, 'C': 256,
        'D': 384, 'E': 512, 'F': 768, 'G': 1024, 'H': 1536, 'I': 2048, 'Z': 192 // 特殊型号
    };

    const flashKb = flashSizes[flashCode];
    if (!flashKb) return 'Unknown specs (from open data)';

    // 2. RAM 容量启发式推断
    // 依据 STM32 同系列的主流配比进行预估
    let ramKb = 0;

    if (series === 'F1') {
        if (flashKb <= 32) ramKb = 6;
        else if (flashKb <= 128) ramKb = 20;
        else if (flashKb <= 512) ramKb = 64;
        else ramKb = 96;
    }
    else if (series === 'F4') {
        if (line === '01') ramKb = 64;
        else if (line === '11') ramKb = 128;
        else if (flashKb <= 512) ramKb = 128; // 405/407 512K 对应 128K RAM
        else ramKb = 192;
    }
    else if (series === 'F0') {
        if (flashKb <= 32) ramKb = 4;
        else ramKb = 8;
    }
    else if (series === 'L0') {
        if (flashKb <= 32) ramKb = 8;
        else ramKb = 20;
    }
    else if (series === 'G0') {
        ramKb = Math.floor(flashKb / 4); // G0 系列通常比例为 1/4
        if (ramKb > 144) ramKb = 144;
    }
    else if (series === 'C0') {
        if (flashKb <= 16) ramKb = 6;
        else if (flashKb <= 32) ramKb = 12;
        else ramKb = 6;
    }
    else {
        // 安全兜底默认值
        ramKb = Math.floor(flashKb / 8);
        if (ramKb < 4) ramKb = 4;
    }

    return `${flashKb}k Flash / ${ramKb}k RAM`;
}

// ----------------------------------------------------------------------------
// 主逻辑
// ----------------------------------------------------------------------------

async function main() {
    console.log('正在从 STM32 Open Pin Data (embassy-rs) 同步芯片数据库...');
    console.log(`数据源路径: ${CHIPS_DIR}`);

    let stm32Data: any = { STM32: {} };

    // 加载现有的数据文件以便进行部分保留
    if (fs.existsSync(OUTPUT_STM32)) {
        try {
            stm32Data = JSON.parse(fs.readFileSync(OUTPUT_STM32, 'utf8'));
        } catch (e) {
            console.warn(`无法解析 ${OUTPUT_STM32}，将重置数据: ${e}`);
        }
    } else {
        console.log(`生成新的 ${OUTPUT_STM32}...`);
    }

    if (!fs.existsSync(CHIPS_DIR)) {
        console.error(`错误: 找不到芯片数据目录 ${CHIPS_DIR}`);
        return;
    }

    // [核心增强] 加载 STM32duino 支持注册表 (白名单)
    const supportedMcus = new Set<string>();
    if (fs.existsSync(REGISTRY_PATH)) {
        try {
            const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
            Object.values(registry).forEach((entry: any) => {
                if (entry.mcu) supportedMcus.add(entry.mcu.toLowerCase());
            });
            console.log(`[白名单] 已加载 ${supportedMcus.size} 个支持的 MCU 定义 (来自于 Variants)`);
        } catch (e) {
            console.warn(`[警告] 无法加载注册表 ${REGISTRY_PATH}, 将放行所有解析出的芯片 (风险模式)`);
        }
    } else {
        console.warn(`[警告] 注册表 ${REGISTRY_PATH} 不存在, 请先运行脚本 7`);
        return;
    }

    // 策略：保留所有不是由本同步脚本自动生成的板卡（即 platform !== 'ststm32' 的手动添加项）
    const preservedBoards: any[] = [];
    Object.keys(stm32Data.STM32).forEach(series => {
        const boards = stm32Data.STM32[series];
        boards.forEach((b: any) => {
            if (b.platform !== 'ststm32') {
                preservedBoards.push({ ...b, series }); // 暂时记录所属系列
            }
        });
    });

    // 重置自动生成的芯片列表
    stm32Data.STM32 = {};

    // 恢复手动保留的板卡
    preservedBoards.forEach(b => {
        const s = b.series;
        delete b.series;
        if (!stm32Data.STM32[s]) stm32Data.STM32[s] = [];
        stm32Data.STM32[s].push(b);
    });

    // 遍历抓取新的芯片数据
    const chipFiles = fs.readdirSync(CHIPS_DIR).filter(f => f.endsWith('.json'));
    let addedCount = 0;

    // 初始化未支持芯片统计
    const unsupportedStats: Record<string, number> = {};
    const unsupportedList: string[] = [];

    for (const file of chipFiles) {
        const filePath = path.join(CHIPS_DIR, file);
        try {
            const chipData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const name = chipData.name; // 例如 "STM32F103C8"
            const family = chipData.family; // 例如 "STM32F1"

            // [核心增强] 动态白名单检查
            // 策略：只要该芯片在 Open Data 里的名称 (如 STM32F103C8) 
            // 能够匹配到 STM32duino Variants 注册表里的任何一个 MCU (如 stm32f103c8tx)
            // 即认为底层支持该芯片，予以放行。

            // 名称归一化：STM32F103C8 -> stm32f103c8
            const normalizedName = name.toLowerCase();

            // 检查：注册表中是否有以当前芯片名为前缀的条目
            // 例如：Open Data 有 "STM32WBA65CG", Registry 有 "stm32wba65cgux" -> 匹配成功
            const isSupported = Array.from(supportedMcus).some(mcu => mcu.startsWith(normalizedName));

            // [改进] 不再直接跳过不支持的芯片，而是打上 tier: preview 标签
            // 这样可以让用户看到引脚图，但提示功能可能受限
            const tier = isSupported ? 'official' : 'preview';

            if (!isSupported) {
                unsupportedList.push(name);
                const series = family || 'Unknown';
                unsupportedStats[series] = (unsupportedStats[series] || 0) + 1;
            }

            const seriesName = family;
            if (!stm32Data.STM32[seriesName]) {
                stm32Data.STM32[seriesName] = [];
            }

            // 1:1 映射：为每个逻辑型号生成一个独立的 Board ID
            // 我们取首个封装包的信息来填充基础元数据（引脚数、封装类型）
            if (chipData.packages && Array.isArray(chipData.packages) && chipData.packages.length > 0) {
                const firstPkg = chipData.packages[0];
                const pkgType = firstPkg.package; // 例如 "LQFP48"
                const pinCount = firstPkg.pins.length;

                const boardId = `generic_${name.toLowerCase()}`;

                // 避免重复项
                if (stm32Data.STM32[seriesName].some((b: any) => b.id === boardId)) {
                    continue;
                }

                stm32Data.STM32[seriesName].push({
                    id: boardId,
                    name: name, // 逻辑型号名称作为显示名称
                    platform: 'ststm32',
                    mcu: name,
                    fcpu: 0,
                    pinCount: pinCount,
                    package: pkgType,
                    specs: getSpecsFromMcuName(name), // 自动推断 Flash/RAM
                    tier: tier,
                    capabilities: []
                });

                addedCount++;
            } else {
                console.warn(`跳过 ${file}: 未找到封装信息。`);
            }
        } catch (e) {
            console.warn(`跳过 ${file}: ${e}`);
        }
    }

    // 保存最终结果
    fs.writeFileSync(OUTPUT_STM32, JSON.stringify(stm32Data, null, 2));
    console.log(`同步完成。共加载了 ${addedCount} 个权威芯片型号。`);
    console.log(`保留了 ${preservedBoards.length} 个手动添加的板卡。`);

    // 输出未支持芯片报告
    if (unsupportedList.length > 0) {
        console.log('\n----------------------------------------');
        console.log(' Unsupported Chips Report (Currently marked as Preview)');
        console.log('----------------------------------------');
        console.log(`Total Unsupported: ${unsupportedList.length}`);
        console.log(' Breakdown by Series:');
        Object.keys(unsupportedStats).forEach(s => {
            console.log(`  - ${s}: ${unsupportedStats[s]}`);
        });
        console.log('\n(这些芯片已被添加为 preview 级别，引脚图可用，但 PIO 编译可能需要额外配置)');
        console.log('----------------------------------------\n');
    }
}

main();

