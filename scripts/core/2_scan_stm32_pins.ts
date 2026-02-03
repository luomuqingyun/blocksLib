// ----------------------------------------------------------------------------
// 脚本名称: 2_scan_stm32_pins.ts
// 用途: STM32 硬件引脚定义解析器 (C 语言解析)
// 描述: 
// 1. 深入读取 STM32 变体文件夹中的 `PeripheralPins.c` 源文件。
// 2. 使用正则表达式解析 C 代码结构，提取外设引脚映射 (PinMap)。
// 3. 支持复杂的文件夹名称匹配 (通过递归模式展开)。
// 4. 生成详细的引脚数据 JSON，供后续生成各板卡独立的 JSON 文件使用。
// ----------------------------------------------------------------------------
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { ARDUINO_CORE_STM32_PATH, resolveDataPath } from '../utils/data_sources';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置信息
const PIO_HOME = path.join(os.homedir(), '.platformio');
const STM32_BOARDS_DIR = path.join(PIO_HOME, 'platforms/ststm32/boards');
const PIO_VARIANTS_DIR = path.join(PIO_HOME, 'packages/framework-arduinoststm32/variants');

// 优先使用本地克隆的官方仓库，如果不存在则回退到 PlatformIO 目录
const STM32_VARIANTS_DIR = resolveDataPath(path.join(ARDUINO_CORE_STM32_PATH, 'variants'), PIO_VARIANTS_DIR);
const INPUT_JSON = path.join(__dirname, '../generated', 'stm32_board_data.json'); // Changed to generated
const OUTPUT_JSON = path.join(__dirname, '../generated', 'detailed_board_data.json'); // Changed to generated

const variantCache = new Map<string, string | null>();

// 外设功能接口
interface PeripheralFunction {
    pin: string;
    instance: string;
    function: string; // 如 TX, RX, MOSI 等
}

// 正则表达式：用于提取 { 引脚, 实例, ... } 结构
// 例如: {PA_9, USART1, STM_PIN_DATA(...)}
const ENTRY_REGEX = /{\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*,/;

/**
 * 解析 C 代码中的 PinMap 数组
 * @param content 文件内容
 * @param mapType 地图类型 (如 UART_TX, SPI_MOSI)
 * @param functionRole 功能角色 (如 TX, MOSI)
 */
function parseGranularMap(content: string, mapType: string, functionRole: string): PeripheralFunction[] {
    const arrayRegex = new RegExp(`PinMap_${mapType}\\[\\]\\s*=\\s*\\{([\\s\\S]*?)\\};`, 'm');
    const match = content.match(arrayRegex);
    if (!match) return [];

    const body = match[1];
    const results: PeripheralFunction[] = [];

    const lines = body.split('\n');
    for (const line of lines) {
        const m = line.match(ENTRY_REGEX);
        if (m) {
            let pin = m[1];
            const instance = m[2];

            if (pin !== 'NC' && pin !== 'NP') {
                pin = pin.replace(/_ALT\d*/, '').replace('_', '');
                results.push({ pin, instance, function: functionRole });
            }
        }
    }
    return results;
}

/**
 * 将解析出的功能聚合到目标对象中
 * @param list 解析出的外设功能列表
 * @param type 外设类型 (如 UART, SPI)
 * @param target 聚合的目标对象
 */
function aggregatePeripherals(list: PeripheralFunction[], type: string, target: any) {
    // 按 实例 (如 USART1) -> 功能 (如 TX) -> [引脚列表] 进行分组
    for (const item of list) {
        if (!target[type]) target[type] = {};
        if (!target[type][item.instance]) target[type][item.instance] = {};

        if (!target[type][item.instance][item.function]) {
            target[type][item.instance][item.function] = [];
        }
        // 避免重复添加引脚
        if (!target[type][item.instance][item.function].includes(item.pin)) {
            target[type][item.instance][item.function].push(item.pin);
        }
    }
}

/**
 * 解析变体头文件以获取默认外设引脚
 * @param variantPath 变体文件夹路径
 */
function parseVariantDefaults(variantPath: string): any {
    const headerFile = path.join(variantPath, 'variant_generic.h');
    if (!fs.existsSync(headerFile)) return null;

    const content = fs.readFileSync(headerFile, 'utf8');
    const defaults: any = {};

    const extract = (regex: RegExp, key: string, group: string) => {
        const m = content.match(regex);
        if (m) {
            const rawPin = m[1].trim();
            // 严格过滤掉无效引脚
            if (rawPin === 'NC' || rawPin === 'NP' || rawPin.includes('NOT_DEFINED')) return;

            if (!defaults[group]) defaults[group] = {};
            // 格式化引脚名: PA_9 -> PA9, PA_9_ALT1 -> PA9
            defaults[group][key] = rawPin.replace(/_ALT\d*/, '').replace(/_/g, '');
        }
    };

    extract(/#define\s+PIN_SERIAL_TX\s+([A-Z0-9_]+)/, 'tx', 'serial');
    extract(/#define\s+PIN_SERIAL_RX\s+([A-Z0-9_]+)/, 'rx', 'serial');
    extract(/#define\s+PIN_WIRE_SDA\s+([A-Z0-9_]+)/, 'sda', 'i2c');
    extract(/#define\s+PIN_WIRE_SCL\s+([A-Z0-9_]+)/, 'scl', 'i2c');
    extract(/#define\s+PIN_SPI_MOSI\s+([A-Z0-9_]+)/, 'mosi', 'spi');
    extract(/#define\s+PIN_SPI_MISO\s+([A-Z0-9_]+)/, 'miso', 'spi');
    extract(/#define\s+PIN_SPI_SCK\s+([A-Z0-9_]+)/, 'sck', 'spi');
    extract(/#define\s+PIN_SPI_SS\s+([A-Z0-9_]+)/, 'ss', 'spi');

    // 其他常用宏
    extract(/#define\s+LED_BUILTIN\s+([A-Z0-9_]+)/, 'led', 'extra');
    extract(/#define\s+USER_BTN\s+([A-Z0-9_]+)/, 'button', 'extra');

    return Object.keys(defaults).length > 0 ? defaults : null;
}

/**
 * 解析 variant_generic.cpp 以获取 Arduino 引脚映射 (D0 -> PA0)
 * @param variantPath 变体文件夹路径
 */
function parseVariantCpp(variantPath: string): any {
    const cppFile = path.join(variantPath, 'variant_generic.cpp');
    if (!fs.existsSync(cppFile)) return null;

    const content = fs.readFileSync(cppFile, 'utf8');
    const result: any = {
        digital: [], // Index -> Physical Name (e.g. 0 -> PA_0)
        analog: []   // Index (A0=0) -> Physical Index (e.g. 0 -> 0 (PA0))
    };

    // 解析 digitalPin[]
    const digitalMatch = content.match(/const\s+PinName\s+digitalPin\[\]\s*=\s*\{([\s\S]*?)\};/);
    if (digitalMatch) {
        const lines = digitalMatch[1].split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('//'));

        lines.forEach((line) => {
            // 匹配 PA_0, 或 PA_0 | ...
            const m = line.match(/^([A-Z0-9_]+)/);
            if (m) {
                // 清理引脚名: PA_0 -> PA0
                let pin = m[1].replace(/_ALT\d*/, '').replace('_', '');
                result.digital.push(pin);
            } else if (line.includes('NC')) {
                result.digital.push('NC'); // 保持索引对齐
            }
        });
    }

    // 解析 analogInputPin[]
    // 通常是 uint32_t analogInputPin[] = { 0, 1, ... };
    // 这里的数字是指向 digitalPin 数组的索引，或者是直接的通道号？
    // 在 STM32Duino 中，analogInputPin 存储的是 index to digitalPin array? 
    // 不，STM32Duino analogInputPin保存的是 `digitalPin` 数组的索引。
    // 例如 analogInputPin[0] = 0; 说明 A0 对应 digitalPin[0]。

    // 简单起见，且为了配合前端生成，我们主要关心 "Ax" 对应哪个物理引脚。
    // 如果我们知道 A0 -> index 0 -> PA0，那么我们就可以生成 ["A0 (PA0)", "PA0"]

    // 提取 analogInputPin 数组内容
    const analogMatch = content.match(/const\s+uint32_t\s+analogInputPin\[\]\s*=\s*\{([\s\S]*?)\};/);
    if (analogMatch) {
        const body = analogMatch[1];
        // 移除所有注释 (// ...)
        const cleanBody = body.replace(/\/\/.*/g, '');
        // 匹配所有数字
        const indices = cleanBody.match(/\d+/g);
        if (indices) {
            indices.forEach((idxStr) => {
                const idx = parseInt(idxStr, 10);
                result.analog.push(idx);
            });
        }
    }

    return result;
}

/**
 * 递归查找目标文件夹名 (忽略大小写)
 * @param baseDir 搜索的起始目录
 * @param targetLeaf 目标文件夹的叶子名称
 * @returns 找到的完整路径或 null
 */
function findVariantRecursively(baseDir: string, targetLeaf: string): string | null {
    if (!fs.existsSync(baseDir)) return null;
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const fullPath = path.join(baseDir, entry.name);

        if (entry.name.toUpperCase() === targetLeaf.toUpperCase()) return fullPath;

        // 递归查找 (变体目录通常只有 2 层深)
        if (entry.name.startsWith('STM32')) {
            const found = findVariantRecursively(fullPath, targetLeaf);
            if (found) return found;
        }
    }
    return null;
}

/**
 * 核心：支持模式匹配的模糊查找
 * 处理如 "L151CC(T-U)_L152CC(T-U)" 这种复杂的文件夹结构，以匹配 MCU 名称
 * @param baseDir 搜索的起始目录
 * @param mcuName 待匹配的 MCU 名称 (如 F103C8T6)
 * @returns 找到的变体文件夹路径或 null
 */
function findVariantFuzzy(baseDir: string, mcuName: string): string | null {
    if (variantCache.has(mcuName)) return variantCache.get(mcuName)!;

    const allVariants: string[] = [];
    const traverse = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (entry.name.startsWith('STM32')) {
                    traverse(path.join(dir, entry.name));
                } else {
                    allVariants.push(path.join(dir, entry.name));
                }
            }
        }
    };
    if (fs.existsSync(baseDir)) traverse(baseDir);

    // 深度递归展开模式，支持嵌套括号和连字符，如 (A-B-C) 或 (8-B-C)
    function expand(part: string): string[] {
        const match = part.match(/([^(]*)\(([^)]+)\)(.*)/);
        if (!match) return [part];

        const prefix = match[1];
        const rawOptions = match[2];
        const suffix = match[3];

        let options: string[] = [];
        if (rawOptions.includes('-')) {
            const parts = rawOptions.split('-');
            if (parts.length >= 2) {
                for (let i = 0; i < parts.length - 1; i++) {
                    const start = parts[i];
                    const end = parts[i + 1];
                    if (start.length === 1 && end.length === 1) {
                        const alphabet = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
                        const startIndex = alphabet.indexOf(start.toUpperCase());
                        const endIndex = alphabet.indexOf(end.toUpperCase());
                        // 启发式：STM32 的范围展开通常不超过 4 个步长 (如 4-6, 8-B, C-E)
                        // 避免将 H-T (封装列表) 误认为范围
                        if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex && (endIndex - startIndex) <= 4) {
                            for (let j = startIndex; j <= endIndex; j++) {
                                options.push(alphabet[j]);
                            }
                        } else {
                            options.push(start);
                            options.push(end);
                        }
                    } else {
                        options.push(start);
                        options.push(end);
                    }
                }
            } else {
                options = rawOptions.split('-');
            }
        } else {
            options = rawOptions.split(/[-,/]/);
        }

        const results = new Set<string>();
        options.forEach(opt => {
            if (!opt) return;
            const expandedSuffixes = expand(suffix);
            expandedSuffixes.forEach(s => {
                const variant = prefix + opt.trim() + s;
                if (variant) results.add(variant);
            });
        });
        return Array.from(results);
    }

    const normMcu = mcuName.toUpperCase();

    for (const vPath of allVariants) {
        const folderName = path.basename(vPath);
        // 按下划线拆分多型号组合
        const segments = folderName.split('_');

        for (const segment of segments) {
            const patterns = expand(segment);

            for (let variantPattern of patterns) {
                // 移除通配符 'x' 并统一转大写
                const cleanVariant = variantPattern.replace(/x/g, '').toUpperCase();

                // 双向前缀匹配检查
                if (cleanVariant.length > 3 && (normMcu.startsWith(cleanVariant) || cleanVariant.startsWith(normMcu))) {
                    if (fs.existsSync(path.join(vPath, 'PeripheralPins.c'))) {
                        variantCache.set(mcuName, vPath);
                        return vPath;
                    }
                }
            }
        }
    }
    variantCache.set(mcuName, null);
    return null;
}

async function main() {
    console.log('正在加载板卡基础数据...');
    if (!fs.existsSync(INPUT_JSON)) {
        console.error('找不到输入 JSON 文件');
        return;
    }
    const data = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf8'));
    const stm32Data = data['STM32'];

    const detailedData: Record<string, any> = {};
    let count = 0;

    for (const series of Object.keys(stm32Data)) {
        for (const board of stm32Data[series]) {
            const boardId = board.id;

            // 1. 尝试从 Manifest 路径解析
            const manifestPath = path.join(STM32_BOARDS_DIR, `${boardId}.json`);
            let variantName = '';
            if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                variantName = manifest.build?.variant;
            }

            let variantPath = '';
            if (variantName) {
                variantPath = path.join(STM32_VARIANTS_DIR, variantName);
                if (!fs.existsSync(variantPath)) {
                    // 如果显式路径失败，尝试递归查找
                    const leaf = path.basename(variantName);
                    const found = findVariantRecursively(STM32_VARIANTS_DIR, leaf);
                    if (found) variantPath = found;
                }
            }

            // 2. 如果都没有找到，启动模式识别模糊查找 (如处理 Sea-Oceanus 等)
            if ((!variantPath || !fs.existsSync(variantPath)) && board.mcu) {
                const cleanMcu = board.mcu.trim().toUpperCase().replace(/^STM32/, '');
                variantPath = findVariantFuzzy(STM32_VARIANTS_DIR, cleanMcu) || '';
            }

            if (!variantPath || !fs.existsSync(variantPath)) {
                continue;
            }

            // 3. 读取并解析 PeripheralPins.c
            const ppFile = path.join(variantPath, 'PeripheralPins.c');

            if (boardId === 'vccgnd_f407zg_mini') {
                console.log(`[DEBUG] Scanning ${boardId}`);
                console.log(`[DEBUG] Manifest Variant: ${variantName}`);
                console.log(`[DEBUG] Final path: ${ppFile}`);
                console.log(`[DEBUG] File exists? ${fs.existsSync(ppFile)}`);
            }
            if (!fs.existsSync(ppFile)) continue;

            const content = fs.readFileSync(ppFile, 'utf8');
            const peripherals: any = {};

            // 解析各类外设：UART, SPI, I2C, CAN, USB, TIM, ADC, DAC ...
            aggregatePeripherals(parseGranularMap(content, 'UART_TX', 'TX'), 'UART', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'UART_RX', 'RX'), 'UART', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'UART_RTS', 'RTS'), 'UART', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'UART_CTS', 'CTS'), 'UART', peripherals);

            aggregatePeripherals(parseGranularMap(content, 'SPI_MOSI', 'MOSI'), 'SPI', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'SPI_MISO', 'MISO'), 'SPI', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'SPI_SCLK', 'SCLK'), 'SPI', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'SPI_SSEL', 'SSEL'), 'SPI', peripherals);

            aggregatePeripherals(parseGranularMap(content, 'I2C_SDA', 'SDA'), 'I2C', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'I2C_SCL', 'SCL'), 'I2C', peripherals);

            aggregatePeripherals(parseGranularMap(content, 'CAN_RD', 'RD'), 'CAN', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'CAN_TD', 'TD'), 'CAN', peripherals);

            aggregatePeripherals(parseGranularMap(content, 'USB', 'DM'), 'USB', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'USB_OTG_FS', 'OTG_FS'), 'USB', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'USB_OTG_HS', 'OTG_HS'), 'USB', peripherals);

            aggregatePeripherals(parseGranularMap(content, 'Ethernet', 'ETH'), 'ETH', peripherals);

            // 定时器 (PWM) 的特殊解析逻辑（需提取通道号）
            const timBodyRegex = /PinMap_TIM\[\]\s*=\s*\{([\s\S]*?)\};/m;
            const timMatch = content.match(timBodyRegex);
            if (timMatch) {
                const timBody = timMatch[1];
                const timLines = timBody.split('\n');
                if (!peripherals['TIM']) peripherals['TIM'] = {};

                for (const line of timLines) {
                    const entryMatch = line.match(/{\s*([A-Z0-9_]+)\s*,\s*([A-Z0-9_]+)\s*,/);
                    const commentMatch = line.match(/\/\/\s*TIM\d+_CH(\d+)(N?)/);

                    if (entryMatch) {
                        let pin = entryMatch[1];
                        const instance = entryMatch[2];
                        if (pin !== 'NC' && pin !== 'NP') {
                            pin = pin.replace(/_ALT\d*/, '').replace('_', '');

                            let func = 'CH';
                            if (commentMatch) {
                                func = `CH${commentMatch[1]}${commentMatch[2]}`;
                            }

                            if (!peripherals['TIM'][instance]) peripherals['TIM'][instance] = {};
                            if (!peripherals['TIM'][instance][func]) peripherals['TIM'][instance][func] = [];
                            if (!peripherals['TIM'][instance][func].includes(pin)) {
                                peripherals['TIM'][instance][func].push(pin);
                            }
                        }
                    }
                }
            }

            aggregatePeripherals(parseGranularMap(content, 'ADC', 'IN'), 'ADC', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'DAC', 'OUT'), 'DAC', peripherals);

            aggregatePeripherals(parseGranularMap(content, 'SD_CMD', 'CMD'), 'SD', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'SD_CK', 'CK'), 'SD', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'SD_DATA0', 'D0'), 'SD', peripherals);

            // 检查是否有数据产出
            if (Object.keys(peripherals).length > 0) {
                const defaults = parseVariantDefaults(variantPath);
                const pinMapArray = parseVariantCpp(variantPath); // 新增解析
                const hasLdScript = fs.existsSync(path.join(variantPath, 'ldscript.ld'));

                // 从 boards_entry.txt 中提取 product_line
                let productLine = '';
                const boardsEntry = path.join(variantPath, 'boards_entry.txt');
                if (fs.existsSync(boardsEntry)) {
                    const content = fs.readFileSync(boardsEntry, 'utf8');
                    const match = content.match(/\.build\.product_line=([A-Z0-9]+)/);
                    if (match) productLine = match[1];
                }

                detailedData[boardId] = {
                    variant: path.basename(variantPath),
                    product_line: productLine, // 新增：产品线代号
                    has_ldscript: hasLdScript, // 记录是否带有官方链接脚本
                    peripherals,
                    defaults: defaults || {},
                    pinMapArray: pinMapArray || null // 保存映射数据
                };
                count++;
            }
        }
    }

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(detailedData, null, 2));
    console.log(`已成功为 ${count} 个板卡生成详细引脚数据。`);
    console.log(`数据保存至: ${OUTPUT_JSON}`);
}

main();
