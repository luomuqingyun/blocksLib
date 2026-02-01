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
import { EMBASSY_STM32_DATA_PATH } from './data_sources';

const OUTPUT_STM32 = path.join(__dirname, 'stm32_board_data.json');
const CHIPS_DIR = path.join(EMBASSY_STM32_DATA_PATH, 'data/chips');

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

    for (const file of chipFiles) {
        const filePath = path.join(CHIPS_DIR, file);
        try {
            const chipData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const name = chipData.name; // 例如 "STM32F103C8"
            const family = chipData.family; // 例如 "STM32F1"

            // [核心增强] 过滤掉 PlatformIO 目前完全不支持的系列 (防止生成无效板卡)
            const EXCLUDED_SERIES = ['STM32C0', 'STM32N6', 'STM32U0', 'STM32U3', 'STM32WB0', 'STM32WBA'];
            if (EXCLUDED_SERIES.includes(family)) {
                continue;
            }

            // [增强] 过滤掉 STM32duino 尚未支持的子系列 (可以在 PIO 版本更新后移除)
            // - STM32H7A3/H7B0/H7B3/H7R/H7S: 较新的 H7 子系列
            // - STM32U5: 超低功耗系列尚未完全支持
            // - STM32H5: 较新系列
            // - STM32L5: 部分支持，但 variant 不完整
            const EXCLUDED_SUB_SERIES = [
                'STM32H7A', 'STM32H7B', 'STM32H7R', 'STM32H7S', // H7 新子系列
                'STM32U5',  // U5 超低功耗系列
                'STM32H5',  // H5 新系列
                'STM32L5',  // L5 安全系列
            ];
            const chipSubSeries = name.substring(0, 7).toUpperCase(); // 例: STM32H7A
            if (EXCLUDED_SUB_SERIES.some(sub => chipSubSeries.startsWith(sub))) {
                continue;
            }

            // [增强] 过滤掉 L1xx 系列的 -A 变体 (STM32duino 将其合并到基础型号)
            // 例: STM32L100C6-A -> 使用 STM32L100C6 的 variant
            if (name.endsWith('-A')) {
                continue;
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
}

main();

