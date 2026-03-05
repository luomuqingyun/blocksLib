// ----------------------------------------------------------------------------
// 脚本名称: 4_generate_stm32_data.ts
// 用途: STM32 独立离线数据文件生成器
// 描述: 
// 1. 读取基础数据 (stm32_board_data.json) 和详细引脚功能数据 (detailed_board_data.json)。
// 2. 将它们进行合并 (Join)，生成最终完整的板卡对象。
// 3. 将数据按系列 (Series, 如 STM32F4, STM32L0) 分拆到独立的子目录中。
// 4. 每个板卡生成一个独立的 .json 文件 (如 STM32F103C8T6.json)，方便前端按需加载。
// 5. 自动清理过时的 JSON 文件并移除空目录。
// 6. [新增] 生成增强的兼容性映射 (stm32_compatibility_enhanced.json)，替代 Script 7 的功能。
// ----------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os'; // Add os import
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 20. 输入与输出路径配置
const INPUT_BASIC = path.join(__dirname, '../generated', 'stm32_board_data.json'); // Changed to generated
const INPUT_DETAILS = path.join(__dirname, '../generated', 'detailed_board_data.json'); // Changed to generated
const INPUT_LAYOUTS = path.join(__dirname, '../generated', 'stm32_layouts_cache.json');
const INPUT_REGISTRY = path.join(__dirname, '../generated', 'stm32duino_support_registry.json');
const STATE_FILE = path.join(__dirname, '../generated', 'stm32_previous_state.json');
const OUTPUT_DIR = path.join(__dirname, '../../src/data/boards/stm32');
const OUTPUT_ENHANCED_COMPAT = path.join(__dirname, '../../electron/config/stm32_compatibility_enhanced.json');
const PIO_PACKAGE_JSON = path.join(os.homedir(), '.platformio', 'packages', 'framework-arduinoststm32', 'package.json');

import { ST_OPEN_PIN_DATA_PATH } from '../utils/data_sources';

/** [NEW] MCU 架构映射缓存 **/
const mcuXmlMap = new Map<string, string>();
const archCache = new Map<string, string>();

/** [NEW] 复杂正则匹配器列表 (处理 (4-6), (B-D) 等范围模式) **/
interface ComplexMatcher {
    regex: RegExp;
    path: string;
}
const complexMatchers: ComplexMatcher[] = [];


function main() {
    console.log('正在开始生成最终 STM32 独立数据文件...');

    // [New] 初始化 MCU -> XML 映射索引 (Accelerate file lookup)
    initMcuXmlMap();

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
    const generatedFiles = new Set<string>();
    const excluded8kbChips: any[] = [];
    const currentChips = new Set<string>();

    // [New] Detect STM32duino Version
    let currentVersion = 'Unknown';
    if (fs.existsSync(PIO_PACKAGE_JSON)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(PIO_PACKAGE_JSON, 'utf8'));
            currentVersion = pkg.version || 'Unknown';
            console.log(`检测到当前 STM32duino 版本: ${currentVersion}`);
        } catch (e) {
            console.warn('警告: 无法解析 stm32duino package.json 版本信息');
        }
    }

    // [New] Load Previous State
    let prevState: { version: string, chipIds: string[] } = { version: '', chipIds: [] };
    if (fs.existsSync(STATE_FILE)) {
        try {
            prevState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        } catch (e) {
            console.warn('警告: 无法加载历史状态文件，将无法对比增量。');
        }
    }

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

            // [FIX] User explicitly requested to completely eradicate 8KB flash chips from the UI/JSON data
            if (b.specs && /\b8k flash\b/i.test(b.specs)) {
                console.log(`[过滤] 跳过不支持的 8KB 芯片: ${mcuName}`);
                excluded8kbChips.push({ id: b.id, name: b.name || b.id, specs: b.specs });
                return; // 跳出此板卡的处理循环，不生成 JSON 文件
            }

            // 记录有效芯片用于增量对比 (排除被过滤的)
            currentChips.add(b.id);

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

                // [Enhanced] Infer CPU Architecture
                build: {
                    ...(b.build || {}),
                    cpu: getCpuArch(mcuName)
                },

                package: b.package || 'Unknown',
                fcpu: b.fcpu || 0,
                specs: b.specs,
                description: `${b.name} - ${series} series board`,
                page_url: `https://www.st.com/en/microcontrollers-microprocessors/${baseModelForUrl.toLowerCase()}.html`,
                has_ldscript: rawDetails?.has_ldscript || false,
                tier: b.tier || 'official',
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

            // [MODIFIED] 增加布局匹配优先级：优先匹配 LQFP -> QFP -> QFN -> TSSOP -> BGA
            const getLayoutPriority = (key: string) => {
                const k = key.toUpperCase();
                if (k.includes('LQFP')) return 1;
                if (k.includes('QFP')) return 2;
                if (k.includes('QFN')) return 3;
                if (k.includes('TSSOP')) return 4;
                if (k.includes('BGA')) return 10;
                return 5;
            };

            const sortedLayouts = mcuLayouts.sort((a, b) => getLayoutPriority(a) - getLayoutPriority(b));

            if (sortedLayouts.length > 0) {
                if (pkgFamily) {
                    const bestMatch = sortedLayouts.find(k => k.includes(pkgFamily));
                    bestMatchKey = bestMatch || sortedLayouts[0];
                    layout = layoutCache[bestMatchKey];
                } else {
                    bestMatchKey = sortedLayouts[0];
                    layout = layoutCache[bestMatchKey];
                }
            } else {
                // 策略 2: 基础型号回退匹配 (去除封装细节)
                const baseName = mcuKey.length > 10 ? mcuKey.substring(0, mcuKey.length - 2) : mcuKey;
                const baseLayouts = Object.keys(layoutCache)
                    .filter(k => k.startsWith(baseName))
                    .sort((a, b) => getLayoutPriority(a) - getLayoutPriority(b));

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

    // ------------------------------------------------------------------
    // [新增] 导出芯片支持变更报告 (含版本记录、增减对比、8KB 过滤)
    // ------------------------------------------------------------------
    console.log('\n正在生成芯片支持变更与兼容性报告...');
    const outJsonPath = path.join(__dirname, '../../electron/config/unsupported_8kb_chips.json');
    const outMdPath = path.join(__dirname, '../../docs/STM32芯片支持变更与兼容性报告.md');
    // 旧文件清理
    const oldMdPath = path.join(__dirname, '../../docs/unsupported_8kb_chips.md');
    if (fs.existsSync(oldMdPath)) fs.unlinkSync(oldMdPath);

    fs.writeFileSync(outJsonPath, JSON.stringify(excluded8kbChips.map(c => c.id), null, 2), 'utf-8');

    // 计算增量
    const addedChips = [...currentChips].filter(id => !prevState.chipIds.includes(id));
    const removedChips = prevState.chipIds.filter(id => !currentChips.has(id));

    const mdContent = [
        '# STM32 芯片支持变更与兼容性报告 (EmbedBlocks)',
        '',
        `> **记录时间**: ${new Date().toLocaleString('zh-CN')}`,
        `> **核心版本**: STM32duino (Arduino_Core_STM32) \`${currentVersion}\``,
        '',
        '## 1. 框架版本更新摘要',
        ''
    ];

    if (prevState.version && prevState.version !== currentVersion) {
        mdContent.push(`- **版本变动**: 从 \`${prevState.version}\` 更新至 \`${currentVersion}\``);
    } else {
        mdContent.push(`- **当前状态**: 已是最新版本 (\`${currentVersion}\`)，无核心框架变动。`);
    }

    mdContent.push('', '## 2. 芯片支持定义变动', '');
    if (addedChips.length > 0) {
        mdContent.push(`### 🆕 新增支持 (${addedChips.length})`);
        addedChips.slice(0, 20).forEach(id => mdContent.push(`- \`${id}\``));
        if (addedChips.length > 20) mdContent.push(`- *(及其他 ${addedChips.length - 20} 款...)*`);
        mdContent.push('');
    }

    if (removedChips.length > 0) {
        mdContent.push(`### 🗑️ 移除支持 (${removedChips.length})`);
        removedChips.slice(0, 20).forEach(id => mdContent.push(`- \`${id}\``));
        if (removedChips.length > 20) mdContent.push(`- *(及其他 ${removedChips.length - 20} 款...)*`);
        mdContent.push('');
    }

    if (addedChips.length === 0 && removedChips.length === 0) {
        mdContent.push('*(本次扫描未发现芯片定义的增减变动)*', '');
    }

    mdContent.push(
        '## 3. 物理容量限制拦截列表 (8KB Flash)',
        '',
        '以下芯片虽被 STM32duino 官方库收录，但因其 **8KB Flash** 物理体积过小，无法满足 Arduino 最小运行时要求（即使优化后空程序仍需约 11KB），已被 EmbedBlocks 策略性屏蔽。',
        ''
    );

    excluded8kbChips.forEach(chip => {
        mdContent.push(`- **${chip.name}** (\`${chip.id}\`) - ${chip.specs}`);
    });

    if (!fs.existsSync(path.dirname(outMdPath))) {
        fs.mkdirSync(path.dirname(outMdPath), { recursive: true });
    }
    fs.writeFileSync(outMdPath, mdContent.join('\n'), 'utf-8');

    // 保存当前状态供下次对比
    fs.writeFileSync(STATE_FILE, JSON.stringify({
        version: currentVersion,
        chipIds: [...currentChips]
    }, null, 2));

    console.log(`[报告] 已生成并保存芯片支持变更记录。`);

    // ------------------------------------------------------------------
    // [新增] 生成兼容性映射 (stm32_compatibility_enhanced.json)
    // ------------------------------------------------------------------
    console.log('\n正在生成兼容性映射...');
    if (fs.existsSync(INPUT_REGISTRY)) {
        generateCompatibilityMap(generatedFiles, INPUT_REGISTRY, OUTPUT_ENHANCED_COMPAT);
    } else {
        console.warn('警告: 未找到 stm32duino_support_registry.json，跳过兼容性映射生成。');
    }

    console.log(`\n全部完成！共在 ${OUTPUT_DIR} 中生成了 ${totalFiles} 个独立的 STM32 数据文件。`);
}

/**
 * 辅助函数：生成兼容性映射
 */
function generateCompatibilityMap(generatedFiles: Set<string>, registryPath: string, outputPath: string) {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const pioBoards = loadPioBoards();

    // 增强的兼容性映射信息
    interface EnhancedCompatInfo {
        pioBoardId: string | null;
        variantPath: string;
        productLine: string;
        maxSize: number;
        maxDataSize: number;
        requiresLocalPatch: boolean;
    }

    const enhancedCompat: Record<string, EnhancedCompatInfo> = {};
    let matchedCount = 0;

    // 获取所有可用的 boardTags 及其归一化名称
    const allBoardTags = Object.keys(registry).map(tag => ({
        tag,
        mcu: tag.replace('GENERIC_', 'stm32').toLowerCase()
    }));

    // 遍历所有生成的文件 (generic_stm32fxxx.json 的路径)
    generatedFiles.forEach(filePath => {
        const fileName = path.basename(filePath); // e.g., generic_stm32f103c8.json (Actually STM32F103C8.json)
        const rawName = fileName.replace('.json', ''); // STM32F103C8
        // 关键修正：EmbedBlocks 内部 ID 格式为 generic_stm32... (全小写)
        const chipId = `generic_${rawName.toLowerCase()}`;

        // 核心模糊匹配逻辑
        const normalizedChipName = rawName.toLowerCase();
        const match = allBoardTags.find(bt => bt.mcu.startsWith(normalizedChipName));

        if (match) {
            const chipInfo = registry[match.tag];
            // PIO Board ID check logic needs to handle the prefix correctly or use rawName
            const directPioId = chipIdToPioBoardId(chipId);
            const hasPioBoard = pioBoards.has(directPioId);

            enhancedCompat[chipId] = {
                pioBoardId: hasPioBoard ? directPioId : null,
                variantPath: chipInfo.variantPath,
                productLine: chipInfo.productLine || '',
                maxSize: chipInfo.maxSize || 0,
                maxDataSize: chipInfo.maxDataSize || 0,
                requiresLocalPatch: !hasPioBoard
            };
            matchedCount++;
        } else {
            enhancedCompat[chipId] = {
                pioBoardId: null,
                variantPath: '',
                productLine: '',
                maxSize: 0,
                maxDataSize: 0,
                requiresLocalPatch: true
            };
        }
    });

    fs.writeFileSync(outputPath, JSON.stringify(enhancedCompat, null, 2));
    console.log(`[完成] 已为 ${matchedCount}/${generatedFiles.size} 个芯片生成了兼容性映射。`);
}

/**
 * [辅助] 加载现有的 PIO boards 列表
 * 
 * 逻辑说明:
 * 1. 扫描本机 PlatformIO 安装目录下的 `platforms/ststm32/boards` 文件夹。
 *    路径通常为: `~/.platformio/platforms/ststm32/boards/*.json`
 * 2. 如果某款芯片（如 genericSTM32F401RE）在该目录下有对应的 JSON 定义文件，
 *    则认为它是 PIO "官方支持" 的板卡，可以直接使用。
 * 3. 如果找不到对应文件，则说明需要启用 `local_patch` 模式，
 *    由 EmbedBlocks 自行生成 `eb_custom_board.json` 和 variant 文件。
 */
function loadPioBoards(): Set<string> {
    const pioBoards = new Set<string>();
    const pioBoardsDir = path.join(os.homedir(), '.platformio', 'platforms', 'ststm32', 'boards');

    if (fs.existsSync(pioBoardsDir)) {
        const files = fs.readdirSync(pioBoardsDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            pioBoards.add(file.replace('.json', ''));
        }
    }
    return pioBoards;
}

/**
 * [辅助] 将 chipId 转换为可能的 PIO board ID
 */
function chipIdToPioBoardId(chipId: string): string {
    return chipId.replace(/_stm32/i, 'STM32').replace(/_/g, '');
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

/**
 * [New] 初始化 MCU 文件映射。
 * 遍历 ST_OPEN_PIN_DATA_PATH/mcu 目录，建立索引。
 */
function initMcuXmlMap() {
    const mcuDir = path.join(ST_OPEN_PIN_DATA_PATH, 'mcu');
    if (!fs.existsSync(mcuDir)) {
        console.warn(`警告: 未找到官方 OpenPinData 目录: ${mcuDir}。将回退到硬编码匹配。`);
        return;
    }

    console.log('正在建立 MCU XML 索引...');
    const files = fs.readdirSync(mcuDir);
    files.forEach(file => {
        if (file.endsWith('.xml')) {
            // 文件名通常为 STM32WBA50KGUx.xml
            const mcuPattern = file.replace('.xml', '').toUpperCase();
            const fullPath = path.join(mcuDir, file);

            // 1. 存入快速搜索表
            mcuXmlMap.set(mcuPattern, fullPath);

            // 2. 如果包含括号，建立正则匹配器 (处理范围模式，如 STM32F103R(C-D-E)Tx)
            if (mcuPattern.includes('(')) {
                try {
                    // 转换逻辑: (8-B) -> [8-B], (C-D-E) -> [CDE], x -> .*
                    let regexStr = mcuPattern.replace(/\((.*?)\)/g, (match, p1) => {
                        // 如果是 A-B 形式且长度为 3 (如 4-6 或 C-E)，转为标准正则范围 [A-B]
                        if (p1.length === 3 && p1[1] === '-') {
                            return `[${p1}]`;
                        }
                        // 如果是 C-D-E 形式，转为字符集 [CDE]
                        return `[${p1.replace(/-/g, '')}]`;
                    }).replace(/X/g, '.*'); // 将 x 通配符替换为 .*

                    complexMatchers.push({
                        regex: new RegExp(`^${regexStr}$`, 'i'),
                        path: fullPath
                    });
                } catch (e) {
                    // 跳过无效正则
                }
            }
        }
    });
    console.log(`已索引 ${mcuXmlMap.size} 个官方 XML 定义文件 (含 ${complexMatchers.length} 个复杂匹配规则)。`);
}

/**
 * 辅助函数: 根据 MCU 名称推断 CPU 架构
 * 优化策略: 优先尝试从官方 XML 抓取，失败后回退到硬编码前缀匹配。
 */
function getCpuArch(mcu: string): string {
    const rawMcu = mcu.toUpperCase();

    // 1. 检查缓存
    if (archCache.has(rawMcu)) return archCache.get(rawMcu)!;

    // 2. 尝试从官方 XML 获取
    let arch = fetchArchFromXml(rawMcu);

    // 3. 兜底策略: 硬编码前缀匹配
    if (!arch) {
        if (rawMcu.startsWith('STM32WBA') || rawMcu.startsWith('STM32H5') || rawMcu.startsWith('STM32U5') || rawMcu.startsWith('STM32L5')) {
            arch = "cortex-m33";
        } else if (['STM32F4', 'STM32F3', 'STM32G4', 'STM32L4'].some(p => rawMcu.startsWith(p)) || (rawMcu.startsWith('STM32WB') && !rawMcu.startsWith('STM32WB0'))) {
            arch = "cortex-m4";
        } else if (['STM32F7', 'STM32H7'].some(p => rawMcu.startsWith(p))) {
            arch = "cortex-m7";
        } else if (['STM32G0', 'STM32F0', 'STM32L0', 'STM32C0', 'STM32WB0'].some(p => rawMcu.startsWith(p))) {
            arch = "cortex-m0plus";
        } else if (['STM32F2'].some(p => rawMcu.startsWith(p))) {
            arch = "cortex-m3";
        } else {
            arch = "cortex-m3"; // 默认退路到 M3 (F1 系列等)
        }
    }

    archCache.set(rawMcu, arch);
    return arch;
}

/**
 * 核心逻辑: 解析官方 XML 中的 <Core> 标签
 */
function fetchArchFromXml(mcu: string): string | null {
    // 1. 精准匹配
    let xmlPath = mcuXmlMap.get(mcu);

    // 2. 复杂模式识别 (解决带有范围 (4-6) 的文件名)
    if (!xmlPath) {
        const found = complexMatchers.find(m => m.regex.test(mcu));
        if (found) xmlPath = found.path;
    }

    // 3. 模糊前缀搜索 (兜底策略)
    if (!xmlPath) {
        for (const [key, path] of mcuXmlMap.entries()) {
            if (key.startsWith(mcu)) {
                xmlPath = path;
                break;
            }
        }
    }

    if (!xmlPath || !fs.existsSync(xmlPath)) return null;

    try {
        const content = fs.readFileSync(xmlPath, 'utf8');
        // 使用正则提取 <Core>ARM Cortex-M33</Core>
        const match = content.match(/<Core>(.*?)<\/Core>/);
        if (match && match[1]) {
            const rawCore = match[1].toLowerCase();
            if (rawCore.includes('m33')) return "cortex-m33";
            if (rawCore.includes('m4')) return "cortex-m4";
            if (rawCore.includes('m7')) return "cortex-m7";
            if (rawCore.includes('m0+')) return "cortex-m0plus";
            if (rawCore.includes('m0')) return "cortex-m0";
            if (rawCore.includes('m3')) return "cortex-m3";
        }
    } catch (e) {
        console.warn(`无法解析 XML 内容: ${xmlPath}`, e);
    }
    return null;
}

main();

