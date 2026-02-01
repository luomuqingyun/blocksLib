import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { ARDUINO_CORE_STM32_PATH, resolveDataPath } from './data_sources';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PIO_HOME = path.join(os.homedir(), '.platformio');
const PIO_VARIANTS_DIR = path.join(PIO_HOME, 'packages/framework-arduinoststm32/variants');

// 优先使用本地克隆的官方仓库，如果不存在则回退到 PlatformIO 目录
const STM32_VARIANTS_DIR = resolveDataPath(path.join(ARDUINO_CORE_STM32_PATH, 'variants'), PIO_VARIANTS_DIR);
const OUTPUT_STM32 = path.join(__dirname, 'stm32_board_data.json');

/**
 * 模式展开函数: 处理如 F407V(E-G)T 这种带括号和连字符的文件夹名
 */
function expand(part: string): string[] {
    const match = part.match(/([^(]*)\(([^)]+)\)(.*)/);
    if (!match) return [part];

    const prefix = match[1];
    const rawOptions = match[2];
    const suffix = match[3];

    let options: string[] = [];
    if (rawOptions.includes('-')) {
        // [Bug Fix] 处理如 8-B 这种跨越数字和字母的范围
        // 原始逻辑直接使用 ASCII 码会导致生成 : ; < = > ? @ 等非字母数字字符
        const parts = rawOptions.split('-');
        if (parts.length >= 2) {
            // 我们不再使用简单的 ASCII 范围，而是针对常见的 STM32 命名位进行处理
            // 如果是连续的字符 (如 4-6, A-C) 则展开，否则视为离散列表
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
        options = rawOptions.split(/[-,/]/); // 支持连字符、逗号、斜杠分隔
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

/**
 * 从 MCU 型号名中解析引脚数和封装
 */
function parseStm32Metadata(mcu: string) {
    const norm = mcu.toUpperCase();
    const pinCounts: Record<string, number> = {
        'J': 8, 'D': 14, 'F': 20, 'E': 25, 'G': 28, 'K': 32, 'T': 36, 'S': 44, 'C': 48,
        'R': 64, 'M': 80, 'O': 90, 'V': 100, 'Q': 132, 'Z': 144, 'A': 169, 'I': 176, 'B': 208, 'N': 216
    };
    const packages: Record<string, string> = {
        'T': 'LQFP', 'H': 'BGA', 'U': 'QFPN', 'Y': 'WLCSP', 'P': 'TSSOP', 'M': 'SOIC'
    };

    const match = norm.match(/STM32.*?[0-9]{1,4}([FGKTCRMVQZAIBNJUD])([0-9A-Z])([HUTYPMACIQ])?(.*)$/);
    let pinCode = '';
    let packageCode = '';

    if (match) {
        pinCode = match[1];
        packageCode = match[3] || '';
    }

    return {
        pinCount: pinCounts[pinCode] || 0,
        package: packages[packageCode] || 'Unknown'
    };
}

/**
 * 从 MCU 名称推断规格 (Flash/RAM)
 * 逻辑参考: https://github.com/stm32duino/Arduino_Core_STM32/blob/main/variants/STM32F1xx/F103R(8-B)T/variant.h
 */
function getSpecsFromMcuName(mcu: string): string {
    const norm = mcu.toUpperCase();
    // Regex: STM32 + Series(2) + Line(2) + Pin(1) + Flash(1)
    const match = norm.match(/STM32([A-Z0-9]{2})([0-9]{2})[A-Z]([0-9A-Z])/);
    if (!match) return 'Unknown specs (from variants)';

    const series = match[1]; // F1, F4, L0
    const line = match[2];   // 03, 07
    const flashCode = match[3];

    // 1. Flash Size Decoding
    const flashSizes: Record<string, number> = {
        '4': 16, '6': 32, '8': 64, 'B': 128, 'C': 256,
        'D': 384, 'E': 512, 'F': 768, 'G': 1024, 'H': 1536, 'I': 2048, 'Z': 192 // Special
    };

    const flashKb = flashSizes[flashCode];
    if (!flashKb) return 'Unknown specs (from variants)';

    // 2. RAM Size Heuristics (近似值，覆盖大多数情况)
    let ramKb = 0;

    // Simple table based on Flash/Series
    if (series === 'F1') {
        if (flashKb <= 32) ramKb = 6;     // Low density
        else if (flashKb <= 128) ramKb = 20; // Medium density
        else if (flashKb <= 512) ramKb = 64; // High density
        else ramKb = 96; // XL density
    }
    else if (series === 'F4') {
        if (line === '01') ramKb = 64;
        else if (line === '11') ramKb = 128; // F411
        else if (flashKb <= 512) ramKb = 128;
        else ramKb = 192; // F407/405 usually 192K
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
        ramKb = flashKb / 8; // Rough rule for G0
    }
    else {
        // Default heuristic: RAM is roughly 1/8 to 1/4 of Flash
        ramKb = Math.floor(flashKb / 8);
        if (ramKb < 4) ramKb = 4;
    }

    // Format: "64k Flash / 20k RAM"
    return `${flashKb}k Flash / ${ramKb}k RAM`;
}

async function main() {
    console.log('正在发现 stm32duino 目录中的裸芯片型号 (优化命名逻辑)...');

    if (!fs.existsSync(OUTPUT_STM32)) {
        console.error('错误: 找不到 stm32_board_data.json。');
        return;
    }

    const stm32Data = JSON.parse(fs.readFileSync(OUTPUT_STM32, 'utf8'));
    const existingMcus = new Set<string>();

    Object.values(stm32Data.STM32).forEach((series: any) => {
        series.forEach((b: any) => {
            if (b.mcu) existingMcus.add(b.mcu.toUpperCase().replace(/^STM32/, ''));
        });
    });

    const seriesFolders = fs.readdirSync(STM32_VARIANTS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.startsWith('STM32'));

    let discoveredCount = 0;

    for (const seriesFolder of seriesFolders) {
        const seriesPath = path.join(STM32_VARIANTS_DIR, seriesFolder.name);
        const variants = fs.readdirSync(seriesPath, { withFileTypes: true })
            .filter(d => d.isDirectory());

        const seriesName = seriesFolder.name.replace(/xx$/, ''); // STM32F4xx -> STM32F4

        if (!stm32Data.STM32[seriesName]) {
            stm32Data.STM32[seriesName] = [];
        }

        for (const variant of variants) {
            const folderName = variant.name;
            if (folderName === 'openocd.cfg' || folderName === '.git') continue;

            const segments = folderName.split('_');
            for (const segment of segments) {
                const results = expand(segment);
                for (let mcuSuffix of results) {
                    // 核心修复: 处理 F401RB -> STM32F401RB 而不是 STM32F4F401RB
                    let fullMcuName = (seriesName + mcuSuffix).toUpperCase();
                    const seriesShort = seriesName.replace(/^STM32/, '');
                    if (mcuSuffix.toUpperCase().startsWith(seriesShort)) {
                        fullMcuName = ("STM32" + mcuSuffix).toUpperCase();
                    }

                    const shortMcuName = fullMcuName.replace(/^STM32/, '');

                    if (!existingMcus.has(shortMcuName)) {
                        const meta = parseStm32Metadata(fullMcuName);
                        // ID 保持简洁
                        const boardId = `generic_${mcuSuffix.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

                        if (stm32Data.STM32[seriesName].some((b: any) => b.id === boardId)) continue;

                        stm32Data.STM32[seriesName].push({
                            id: boardId,
                            name: fullMcuName,
                            platform: 'ststm32',
                            mcu: fullMcuName,
                            fcpu: 0,
                            pinCount: meta.pinCount,
                            package: meta.package,
                            specs: getSpecsFromMcuName(fullMcuName),
                            capabilities: []
                        });

                        existingMcus.add(shortMcuName);
                        discoveredCount++;
                    }
                }
            }
        }
    }

    fs.writeFileSync(OUTPUT_STM32, JSON.stringify(stm32Data, null, 2));
    console.log(`成功从 variants 目录发现并新增了 ${discoveredCount} 个裸芯片型号。`);

    const uniqueMcus = new Set();
    Object.values(stm32Data.STM32).forEach((v: any) => v.forEach((b: any) => uniqueMcus.add(b.mcu)));
    console.log(`当前总计唯一 MCU 数量: ${uniqueMcus.size}`);
}

main();
