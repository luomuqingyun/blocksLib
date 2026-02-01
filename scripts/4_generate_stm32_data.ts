// ----------------------------------------------------------------------------
// 脚本名称: 4_generate_stm32_data.ts
// 用途: STM32 独立离线数据文件生成器
// 描述: 
// 1. 读取基础数据 (stm32_board_data.json) 和详细引脚功能数据 (detailed_board_data.json)。
// 2. 将它们进行合并 (Join)，生成最终完整的板卡对象。
// 3. 将数据按系列 (Series, 如 STM32F4, STM32L0) 分拆到独立的子目录中。
// 4. 每个板卡生成一个独立的 .json 文件 (如 STM32F103C8T6.json)，方便前端按需加载。
// 5. 自动清理过时的 JSON 文件并移除空目录。
// ----------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 输入与输出路径配置
const INPUT_BASIC = path.join(__dirname, 'stm32_board_data.json');
const INPUT_DETAILS = path.join(__dirname, 'detailed_board_data.json');
const INPUT_LAYOUTS = path.join(__dirname, 'out_scripts', 'stm32_layouts_cache.json');
const OUTPUT_DIR = path.join(__dirname, '../src/data/boards/stm32');

function main() {
    console.log('正在开始生成最终 STM32 独立数据文件...');

    if (!fs.existsSync(INPUT_BASIC) || !fs.existsSync(INPUT_DETAILS)) {
        console.error('错误: 找不到输入数据文件 (stm32_board_data 或 detailed_board_data)');
        return;
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const basicData = JSON.parse(fs.readFileSync(INPUT_BASIC, 'utf8'));
    const detailsData = JSON.parse(fs.readFileSync(INPUT_DETAILS, 'utf8'));

    let layoutCache: any = {};
    if (fs.existsSync(INPUT_LAYOUTS)) {
        layoutCache = JSON.parse(fs.readFileSync(INPUT_LAYOUTS, 'utf8'));
    } else {
        console.warn('警告: 找不到引脚布局缓存 (stm32_layouts_cache.json)，引脚位置将缺失。');
    }

    const stm32Series = basicData['STM32'];
    let totalFiles = 0;
    // 收集生成的文名用于后期清理过时文件
    const generatedFiles = new Set<string>();

    // 遍历每一个系列 (Series)
    Object.keys(stm32Series).forEach(series => {
        const boards = stm32Series[series];
        // 目标子目录: src/data/boards/stm32/STM32F4/
        const seriesDir = path.join(OUTPUT_DIR, series);

        if (!fs.existsSync(seriesDir)) {
            fs.mkdirSync(seriesDir, { recursive: true });
        }

        // 依据基础数据中的 1:1 映射进行处理
        const uniqueBoards: any[] = [];
        boards.forEach((b: any) => {
            uniqueBoards.push(b);
        });

        let seriesCount = 0;
        uniqueBoards.forEach((b: any) => {
            const mcuNameRaw = b.mcu || 'UNKNOWN';
            const mcuName = mcuNameRaw.trim(); // 修正尾部空格问题

            // ------------------------------------------------------------------
            // 硬件规格补全逻辑
            // ------------------------------------------------------------------
            if (!b.specs || b.specs.includes('Unknown')) {
                b.specs = getSpecsFromMcuName(mcuName);
            }

            // 获取该型号的详细外设数据和默认引脚
            const rawDetails = detailsData[b.id];
            const details = rawDetails?.peripherals;
            const defaults = rawDetails?.defaults;

            // 自动侦测硬件能力 (Capabilities)，用于前端 Block 套件过滤
            const capabilities: any = {
                can: false,
                usb: false,
                ethernet: false,
                flash: true, // 所有 STM32 均默认支持 Flash
                sdio: false
            };

            if (details) {
                // CAN 检测
                if (details.CAN || details.CAN1 || details.CAN2 || details.FDCAN1) {
                    capabilities.can = true;
                }

                // USB 检测
                const usbKeys = ['USB', 'USB_OTG_FS', 'USB_OTG_HS', 'USB_DRD_FS'];
                if (usbKeys.some(key => details[key])) {
                    capabilities.usb = true;
                }

                // 以太网检测
                if (details.ETH || details.EMAC || details.ETHERNET) {
                    capabilities.ethernet = true;
                }

                // SDIO/SDMMC 检测
                if (details.SD) {
                    if (details.SD.SDIO || details.SD.SDMMC1 || details.SD.SDMMC2) {
                        capabilities.sdio = true;
                    }
                }
            }

            // 强制启用某些已知系列的核心能力 (作为兜底)
            if (series.startsWith('STM32F4') || series.startsWith('STM32F7')) {
                if (!capabilities.can) capabilities.can = true;
                if (!capabilities.usb) capabilities.usb = true;
            }

            // ------------------------------------------------------------------
            // 文档链接生成逻辑 (自动去除封装后缀)
            // ------------------------------------------------------------------
            const urlMatch = mcuName.match(/(STM32.*?[0-9]{1,4}[A-Z][0-9A-Z])/i);
            const baseModelForUrl = urlMatch ? urlMatch[1] : (mcuName.length > 11 ? mcuName.slice(0, -2) : mcuName);

            // 构造最终的离线板卡 JSON 对象
            const finalBoard: any = {
                id: b.id,
                name: b.name,
                platform: b.platform || 'ststm32',
                mcu: mcuName,
                variant: rawDetails?.variant || 'generic',
                pinCount: b.pinCount || 0,
                package: b.package || 'Unknown',
                fcpu: b.fcpu || 0,
                specs: b.specs,
                description: `${b.name} - ${series} series board`,
                page_url: `https://www.st.com/en/microcontrollers-microprocessors/${baseModelForUrl.toLowerCase()}.html`,
                has_ldscript: rawDetails?.has_ldscript || false,
                capabilities: capabilities,
                defaults: defaults || {},
                pinout: details || {},
                pinMap: [], // 物理引脚坐标映射
                pin_options: { // 提供给前端下拉列表的选项
                    digital: [],
                    analog: [],
                    pwm: [],
                    i2c: [],
                    spi: []
                }
            };

            // ------------------------------------------------------------------
            // 物理布局匹配逻辑 (从 embassy-rs 数据中恢复引脚坐标)
            // ------------------------------------------------------------------
            const mcuKey = mcuName.toUpperCase();
            const pkgFamily = b.package ? b.package.toUpperCase() : '';

            let layout = null;
            let bestMatchKey = '';

            // 策略 1: 全名优先级匹配 (包含封装信息)
            const mcuLayouts = Object.keys(layoutCache).filter(k => k.startsWith(mcuKey));

            if (mcuLayouts.length > 0) {
                if (pkgFamily) {
                    const bestMatch = mcuLayouts.find(k => k.includes(pkgFamily));
                    bestMatchKey = bestMatch || mcuLayouts[0];
                    layout = layoutCache[bestMatchKey];
                } else {
                    bestMatchKey = mcuLayouts[0];
                    layout = layoutCache[bestMatchKey];
                }
            } else {
                // 策略 2: 基础型号回退匹配 (去除封装细节)
                const baseName = mcuKey.length > 10 ? mcuKey.substring(0, mcuKey.length - 2) : mcuKey;
                const baseLayouts = Object.keys(layoutCache).filter(k => k.startsWith(baseName));
                if (baseLayouts.length > 0) {
                    if (pkgFamily) {
                        const bestMatch = baseLayouts.find(k => k.includes(pkgFamily));
                        bestMatchKey = bestMatch || baseLayouts[0];
                        layout = layoutCache[bestMatchKey];
                    } else {
                        bestMatchKey = baseLayouts[0];
                        layout = layoutCache[bestMatchKey];
                    }
                }
            }

            // 如果找到布局，则注入物理引脚 ID (用于 ChipRenderer)
            if (layout && layout.pins) {
                finalBoard.pinMap = layout.pins.map((p: any) => {
                    const functions: string[] = [];
                    const pinName = p.name;

                    // 反向遍历外设表，找出该引脚支持的所有功能
                    if (details) {
                        Object.keys(details).forEach(type => {
                            const insts = details[type];
                            Object.keys(insts).forEach(inst => {
                                const roles = insts[inst];
                                Object.keys(roles).forEach(role => {
                                    if (roles[role].includes(pinName)) {
                                        functions.push(`${inst}_${role}`);
                                    }
                                });
                            });
                        });
                    }
                    return { ...p, functions: functions.sort() };
                });

                // 从布局键名中修正封装名称 (例如 MCU_LQFP64_x -> LQFP64)
                const packageMatch = bestMatchKey.match(/_([A-Z]+)(\d+)?/);
                if (packageMatch) {
                    const officialPackage = packageMatch[1] + (packageMatch[2] || '');
                    if (officialPackage && ['LQFP', 'TFBGA', 'UFBGA', 'WLCSP', 'QFN', 'UFQFPN', 'TSSOP', 'SOIC', 'BGA', 'LFBGA', 'VFBGA'].some(p => officialPackage.includes(p))) {
                        finalBoard.package = officialPackage;
                    }
                }
                // 以官方引脚数为准
                if (layout.pins.length > 0) {
                    finalBoard.pinCount = layout.pins.length;
                }
            }

            // ------------------------------------------------------------------
            // 生成 pin_options 供前端下拉菜单使用
            // ------------------------------------------------------------------
            if (rawDetails && rawDetails.pinMapArray) {
                // 优先使用来自 Arduino 变体映射定义的名称 (D0, A0...)
                const { digital, analog } = rawDetails.pinMapArray;

                if (Array.isArray(digital)) {
                    finalBoard.pin_options.digital = digital.map((p: string, idx: number) => {
                        if (p === 'NC' || !p) return null;
                        return [`D${idx} (${p})`, p];
                    }).filter(Boolean);
                }

                if (Array.isArray(analog) && Array.isArray(digital)) {
                    finalBoard.pin_options.analog = analog.map((dIdx: number, aIdx: number) => {
                        const p = digital[dIdx];
                        if (p === 'NC' || !p) return null;
                        return [`A${aIdx} (${p})`, p];
                    }).filter(Boolean);
                }
            } else if (details) {
                // 兜底方案：如果没有预定义的映射，则列出全部带 PA/PB 的物理引脚
                const allPins = new Set<string>();
                const collectPins = (obj: any) => {
                    if (Array.isArray(obj)) {
                        obj.forEach(p => { if (typeof p === 'string' && p.match(/P[A-Z]\d+/)) allPins.add(p); });
                    } else if (obj && typeof obj === 'object') {
                        Object.values(obj).forEach(collectPins);
                    }
                };
                collectPins(details);

                const sortedPins = Array.from(allPins).sort();
                finalBoard.pin_options.digital = sortedPins.map(p => [p, p]);

                if (details.ADC) {
                    const adcSet = new Set<string>();
                    Object.values(details.ADC).forEach((inst: any) => {
                        inst.IN?.forEach((p: string) => adcSet.add(p));
                    });
                    finalBoard.pin_options.analog = Array.from(adcSet).sort().map(p => [p, p]);
                }
            }

            // PWM/I2C/SPI 选项生成逻辑...
            if (details && details.TIM) {
                const pwmSet = new Set<string>();
                Object.values(details.TIM).forEach((inst: any) => {
                    Object.values(inst).forEach((pins: any) => {
                        pins.forEach((p: string) => pwmSet.add(p));
                    });
                });
                finalBoard.pin_options.pwm = Array.from(pwmSet).sort().map(p => [p, p]);
            }

            if (details) {
                if (details.I2C) {
                    const i2cSet = new Set<string>();
                    Object.values(details.I2C).forEach((inst: any) => {
                        inst.SDA?.forEach((p: string) => i2cSet.add(p));
                        inst.SCL?.forEach((p: string) => i2cSet.add(p));
                    });
                    finalBoard.pin_options.i2c = Array.from(i2cSet).sort().map(p => [p, p]);
                }
                if (details.SPI) {
                    const spiSet = new Set<string>();
                    Object.values(details.SPI).forEach((inst: any) => {
                        ['MOSI', 'MISO', 'SCLK', 'SSEL'].forEach(role => {
                            inst[role]?.forEach((p: string) => spiSet.add(p));
                        });
                    });
                    finalBoard.pin_options.spi = Array.from(spiSet).sort().map(p => [p, p]);
                }
            }

            // ------------------------------------------------------------------
            // 写入文件与持久化保护
            // ------------------------------------------------------------------
            const safeName = mcuName.replace(/[^a-zA-Z0-9_-]/g, '_');
            const fileName = `${safeName}.json`;
            const filePath = path.join(seriesDir, fileName);

            // 数据保留：如果是已存在文件，保留其中的手工修改内容（如特殊定制的描述或能力位）
            if (fs.existsSync(filePath)) {
                try {
                    const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    if (existing.description) finalBoard.description = existing.description;
                    if (existing.capabilities) {
                        finalBoard.capabilities = { ...finalBoard.capabilities, ...existing.capabilities };
                    }
                    if (existing.name && existing.name !== finalBoard.name) finalBoard.name = existing.name;
                } catch (e) { /* 忽略错误 */ }
            }

            fs.writeFileSync(filePath, JSON.stringify(finalBoard, null, 2));
            generatedFiles.add(path.resolve(filePath));
            seriesCount++;
            totalFiles++;
        });

        console.log(`[${series}] 已生成 ${seriesCount} 个板卡文件。`);
    });

    // ------------------------------------------------------------------
    // 过时文件清理 (Stale File Cleanup)
    // ------------------------------------------------------------------
    console.log('正在执行过时文件清理...');
    let cleanedCount = 0;

    function cleanRecursive(dir: string) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.lstatSync(fullPath).isDirectory()) {
                cleanRecursive(fullPath);
                if (fs.readdirSync(fullPath).length === 0) {
                    fs.rmdirSync(fullPath);
                    console.log(`移除空目录: ${fullPath}`);
                }
            } else {
                if (file.endsWith('.json')) {
                    const resolvedPath = path.resolve(fullPath);
                    if (!generatedFiles.has(resolvedPath)) {
                        try {
                            fs.unlinkSync(fullPath);
                            cleanedCount++;
                        } catch (e) { /* 忽略错误 */ }
                    }
                }
            }
        });
    }

    cleanRecursive(OUTPUT_DIR);
    console.log(`清理完成，共移除了 ${cleanedCount} 个过时文件。`);
    console.log(`\n全部完成！共在 ${OUTPUT_DIR} 中生成了 ${totalFiles} 个独立的 STM32 数据文件。`);
}

/**
 * 辅助函数: 从 MCU 名称推断规格 (Flash/RAM)
 */
function getSpecsFromMcuName(mcu: string): string {
    const norm = mcu.toUpperCase();
    const match = norm.match(/STM32([A-Z0-9]{2})([0-9]{2})[A-Z]([0-9A-Z])/);
    if (!match) return 'Unknown specs (from variants)';

    const series = match[1];
    const line = match[2];
    const flashCode = match[3];

    const flashSizes: Record<string, number> = {
        '3': 8, '4': 16, '6': 32, '8': 64, 'B': 128, 'C': 256,
        'D': 384, 'E': 512, 'F': 768, 'G': 1024, 'H': 1536, 'I': 2048,
        'Z': 192, 'Y': 640
    };

    const flashKb = flashSizes[flashCode];
    if (!flashKb) return 'Unknown specs (from variants)';

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
        else if (flashKb <= 512) ramKb = 128;
        else ramKb = 192;
    }
    else if (series === 'F0') {
        if (flashKb <= 16) ramKb = 4;
        else if (flashKb <= 32) ramKb = 6;
        else if (flashKb <= 64) ramKb = 8;
        else ramKb = 16;
    }
    else if (series === 'L0') {
        if (flashKb <= 32) ramKb = 8;
        else ramKb = 20;
    }
    else if (series === 'G0') {
        ramKb = Math.floor(flashKb / 4);
        if (ramKb > 144) ramKb = 144;
    }
    else if (series === 'C0') {
        if (flashKb <= 16) ramKb = 6;
        else if (flashKb <= 32) ramKb = 12;
        else ramKb = 6;
    }
    else {
        ramKb = Math.floor(flashKb / 8);
        if (ramKb < 4) ramKb = 4;
    }

    return `${flashKb}k Flash / ${ramKb}k RAM`;
}

main();

