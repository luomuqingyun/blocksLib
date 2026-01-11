// ----------------------------------------------------------------------------
// 脚本名称: 4_generate_stm32_data.ts
// 用途: STM32 独立离线数据文件生成器
// 描述: 
// 1. 读取基础数据 (`stm32_board_data.json`) 和详细引脚数据 (`detailed_board_data.json`)。
// 2. 将它们进行合并 (Join)，生成最终完整的板卡对象。
// 3. 将数据按系列 (Series, 如 STM32F4, STM32L0) 分拆到独立的子目录中。
// 4. 每个板卡生成一个 `.json` 文件 (如 STM32F103C8T6.json)。
// 5. 自动清理空目录，保持输出目录整洁。
// ----------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';

// 输入与输出路径配置
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

    // 预清理：删除旧的生成目录，防止 stale 文件 (如 Old Other 目录) 干扰
    if (fs.existsSync(OUTPUT_DIR)) {
        console.log(`正在清理旧的数据目录: ${OUTPUT_DIR}`);
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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

    // 遍历每一个系列 (Series)
    Object.keys(stm32Series).forEach(series => {
        const boards = stm32Series[series];
        // 目标子目录: src/data/boards/stm32/STM32F4/
        const seriesDir = path.join(OUTPUT_DIR, series);

        if (!fs.existsSync(seriesDir)) {
            fs.mkdirSync(seriesDir, { recursive: true });
        }

        let seriesCount = 0;
        boards.forEach((b: any) => {
            const mcuNameRaw = b.mcu || 'UNKNOWN';
            const mcuName = mcuNameRaw.trim(); // 严格修正尾部空格问题

            // 获取该型号的详细数据 (包含 peripherals 和 defaults)
            const rawDetails = detailsData[b.id];
            const details = rawDetails?.peripherals;
            const defaults = rawDetails?.defaults;

            // 构造完整的板卡对象
            const finalBoard: any = {
                id: b.id,
                name: b.name,
                platform: b.platform || 'ststm32', // 新增
                mcu: mcuName,
                variant: rawDetails?.variant || 'generic', // 新增：变体名 (如 F103V(8-B)x_F103V(8-B)x)
                pinCount: b.pinCount || 0, // 新增：引脚数
                package: b.package || 'Unknown', // 新增：封装
                fcpu: b.fcpu || 0, // 恢复为原始频率 (Hz)，方便直接用于 platformio.ini (如 72000000)
                specs: b.specs,
                description: `${b.name} - ${series} series board`,
                defaults: defaults || {}, // 新增：默认引脚
                pinout: details || {}, // 如果没有引脚数据，则设为空对象
                pinMap: [], // 新增：物理引脚映射 [ { name: "PA0", position: "10" }, ... ]
                pin_options: {
                    digital: [],
                    analog: [],
                    pwm: [],
                    i2c: [],
                    spi: []
                }
            };

            // 查找物理引脚映射 (STM32CubeMX 风格)
            const mcuKey = mcuName.toUpperCase();
            const pkgFamily = b.package ? b.package.toUpperCase() : '';

            // 尝试多种组合寻找最匹配的布局
            // 因为不同的板卡可能指向同一个 MCU 的不同变体或不同封装
            let layout = null;
            let bestMatchKey = '';

            // 策略 1: 尝试“全名匹配” (例如: STM32F401RCT6_LQFP64)
            // 首先从缓存中过滤出前缀匹配该 MCU 的所有布局项
            const mcuLayouts = Object.keys(layoutCache).filter(k => k.startsWith(mcuKey));

            if (mcuLayouts.length > 0) {
                // 如果板卡数据指定了封装系列 (pkgFamily)，则寻找包含该名称的布局
                if (pkgFamily) {
                    const bestMatch = mcuLayouts.find(k => k.includes(pkgFamily));
                    bestMatchKey = bestMatch || mcuLayouts[0];
                    layout = layoutCache[bestMatchKey]; // 找不到则回退到该 MCU 的首个匹配项
                } else {
                    bestMatchKey = mcuLayouts[0];
                    layout = layoutCache[bestMatchKey];
                }
            } else {
                // 策略 2: 尝试“降级匹配” (回退到 MCU 基础名，如 STM32F401RC)
                // 解决某些板卡定义中使用了带封装后缀的长名称，而缓存中只有短名称的情况
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

            // 如果找到了对应的官方布局，则注入物理引脚映射表，并尝试根据官方数据修正封装信息
            if (layout && layout.pins) {
                finalBoard.pinMap = layout.pins;

                // 从缓存键名中提取准确的封装信息 (键名通常格式为: MCU_PACKAGE 或 MCU_PACKAGE_PINCOUNT)
                // 例如: STM32F469NIHx_TFBGA216 -> TFBGA216
                // User Request: Use full official package name
                const packageMatch = bestMatchKey.match(/_([A-Z]+)(\d+)?/);
                if (packageMatch) {
                    const officialPackage = packageMatch[1] + (packageMatch[2] || ''); // TFBGA + 216 -> TFBGA216
                    // 仅当提取出的封装看起来合法时才覆盖
                    if (officialPackage && ['LQFP', 'TFBGA', 'UFBGA', 'WLCSP', 'QFN', 'UFQFPN', 'TSSOP', 'SOIC', 'BGA', 'LFBGA', 'VFBGA'].some(p => officialPackage.includes(p))) {
                        finalBoard.package = officialPackage;
                    }
                }

                // 既然有了官方 Layout，引脚数也应当以官方数据为准，覆盖由于 Regex 误判导致的值
                // 修复: STM32G0B1 被误判为 B(208脚)，实际应为 LQFP64
                if (layout.pins.length > 0) {
                    finalBoard.pinCount = layout.pins.length;
                }
            }

            // 如果该板卡包含详细的引脚外设数据，则自动生成 pin_options 供前端 UI 渲染下拉菜单
            if (details) {
                // 递归遍历外设对象，提取所有出现的物理引脚名 (如 PA0, PB13)
                const allPins = new Set<string>();
                const collectPins = (obj: any) => {
                    if (Array.isArray(obj)) {
                        obj.forEach(p => {
                            if (typeof p === 'string' && p.match(/P[A-Z]\d+/)) {
                                allPins.add(p);
                            }
                        });
                    } else if (obj && typeof obj === 'object') {
                        Object.values(obj).forEach(collectPins);
                    }
                };
                collectPins(details);

                const sortedPins = Array.from(allPins).sort();
                finalBoard.pin_options.digital = sortedPins.map(p => [p, p]);

                // ADC (模拟输入) 映射
                if (details.ADC) {
                    const adcSet = new Set<string>();
                    Object.values(details.ADC).forEach((inst: any) => {
                        inst.IN?.forEach((p: string) => adcSet.add(p));
                    });
                    finalBoard.pin_options.analog = Array.from(adcSet).sort().map(p => [p, p]);
                }

                // PWM (定时器匹配) 映射
                if (details.TIM) {
                    const pwmSet = new Set<string>();
                    Object.values(details.TIM).forEach((inst: any) => {
                        Object.values(inst).forEach((pins: any) => {
                            pins.forEach((p: string) => pwmSet.add(p));
                        });
                    });
                    finalBoard.pin_options.pwm = Array.from(pwmSet).sort().map(p => [p, p]);
                }
            }

            // 文件命名: 统一使用 MCU 名称作为文件名，去除不安全字符
            const safeName = mcuName.replace(/[^a-zA-Z0-9_-]/g, '_');
            const fileName = `${safeName}.json`;
            const filePath = path.join(seriesDir, fileName);

            fs.writeFileSync(filePath, JSON.stringify(finalBoard, null, 2));
            seriesCount++;
            totalFiles++;
        });

        console.log(`[${series}] 已生成 ${seriesCount} 个板卡文件。`);
    });

    // 最终清理环节：移除空目录 (如 Other)
    if (fs.existsSync(OUTPUT_DIR)) {
        const remainingDirs = fs.readdirSync(OUTPUT_DIR);
        remainingDirs.forEach(d => {
            const full = path.join(OUTPUT_DIR, d);
            if (fs.lstatSync(full).isDirectory()) {
                const files = fs.readdirSync(full);
                if (files.length === 0) {
                    fs.rmdirSync(full);
                    console.log(`清理空系列目录: ${d}`);
                }
            }
        });
    }

    console.log(`\n全部完成！共在 ${OUTPUT_DIR} 中生成了 ${totalFiles} 个独立的 STM32 数据文件。`);
}

main();
