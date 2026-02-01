import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { ARDUINO_CORE_STM32_PATH, resolveDataPath } from './data_sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 输入/输出文件路径
const INPUT_BASE = path.join(__dirname, 'stm32_board_data.json');
const INPUT_DETAILED = path.join(__dirname, 'detailed_board_data.json');
const INPUT_PIO = path.join(__dirname, 'pio_stm32_full.json');
const OUTPUT_MAP = path.join(__dirname, '../electron/config/stm32_compatibility.json');

// PlatformIO 相关路径
const PIO_HOME = path.join(os.homedir(), '.platformio');
const STM32_BOARDS_DIR = path.join(PIO_HOME, 'platforms/ststm32/boards');
const PIO_VARIANTS_DIR = path.join(PIO_HOME, 'packages/framework-arduinoststm32/variants');

// 使用 resolveDataPath 获取正确变体目录
const EFFECTIVE_VARIANTS_DIR = resolveDataPath(path.join(ARDUINO_CORE_STM32_PATH, 'variants'), PIO_VARIANTS_DIR);

interface Board {
    id: string;
    mcu: string;
    ram: number;
    rom: number;
    frameworks: string[];
}

/**
 * 解析 STM32 型号，提取系列、线路、引脚和 Flash 代码
 */
function parseModel(name: string) {
    if (!name) return null;
    const match = name.toUpperCase().match(/^STM32([A-Z0-9]{2})([0-9]{2})([A-Z])([0-9A-Z])/);
    if (!match) return null;
    return {
        series: match[1],
        line: match[2],
        pinCode: match[3],
        flashCode: match[4]
    };
}

// Flash 大小对应表 (KB)
const flashSizes: Record<string, number> = {
    '4': 16, '6': 32, '8': 64, 'B': 128, 'C': 256,
    'D': 384, 'E': 512, 'F': 768, 'G': 1024, 'H': 1536, 'I': 2048, 'Z': 192
};

// 引脚代码对应的实际引脚数 (STM32 标准)
const pinCountMap: Record<string, number> = {
    'F': 20, 'G': 28, 'K': 32, 'T': 36, 'S': 44, 'C': 48, 'R': 64, 'M': 80, 'V': 100, 'Q': 132, 'Z': 144, 'A': 169, 'I': 176, 'B': 208, 'N': 216
};

function main() {
    if (!fs.existsSync(INPUT_BASE) || !fs.existsSync(INPUT_DETAILED) || !fs.existsSync(INPUT_PIO)) {
        console.error('[错误] 缺少输入文件 (stm32_board_data.json, detailed_board_data.json 或 pio_stm32_full.json)');
        return;
    }

    const stm32Base = JSON.parse(fs.readFileSync(INPUT_BASE, 'utf8'));
    const detailedData = JSON.parse(fs.readFileSync(INPUT_DETAILED, 'utf8'));
    const pioBoards: Board[] = JSON.parse(fs.readFileSync(INPUT_PIO, 'utf8'));

    const arduinoBoards = pioBoards.filter(b => b.frameworks && b.frameworks.includes('arduino'));
    console.log(`[信息] 在 PIO 中找到 ${arduinoBoards.length} 个支持 Arduino 的板卡。`);

    // 预扫描所有 PIO 板卡的详细物理信息 (Variant 和 ProductLine)
    const pioPhysInfo: Record<string, { variant: string, productLine: string, pinCount: number }> = {};
    arduinoBoards.forEach(b => {
        const manifestPath = path.join(STM32_BOARDS_DIR, `${b.id}.json`);
        if (fs.existsSync(manifestPath)) {
            try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                const pioVariant = manifest.build?.variant || '';

                let productLine = '';
                if (pioVariant) {
                    let variantPath = path.join(EFFECTIVE_VARIANTS_DIR, pioVariant);
                    if (!fs.existsSync(variantPath)) {
                        const leaf = path.basename(pioVariant);
                        const seriesDirs = fs.existsSync(EFFECTIVE_VARIANTS_DIR) ? fs.readdirSync(EFFECTIVE_VARIANTS_DIR) : [];
                        for (const sDir of seriesDirs) {
                            const sub = path.join(EFFECTIVE_VARIANTS_DIR, sDir, leaf);
                            if (fs.existsSync(sub)) {
                                variantPath = sub;
                                break;
                            }
                        }
                    }

                    const entryPath = path.join(variantPath, 'boards_entry.txt');
                    if (fs.existsSync(entryPath)) {
                        const content = fs.readFileSync(entryPath, 'utf8');
                        const plMatch = content.match(/\.build\.product_line=([A-Z0-9]+)/);
                        if (plMatch) productLine = plMatch[1];
                    }
                }

                const info = parseModel(b.mcu);
                const pinCount = info ? (pinCountMap[info.pinCode] || 0) : 0;

                pioPhysInfo[b.id] = {
                    variant: pioVariant || '',
                    productLine,
                    pinCount
                };
            } catch (e) { }
        }
    });

    const compatibilityMap: Record<string, string> = {};
    let totalCount = 0;
    let mappedCount = 0;

    // 遍历所有待支持的 STM32 芯片
    Object.keys(stm32Base.STM32).forEach(seriesName => {
        stm32Base.STM32[seriesName].forEach((chip: any) => {
            totalCount++;
            const details = detailedData[chip.id];
            if (!details) return;

            const mcu = (chip.mcu || '').toUpperCase();
            const myInfo = parseModel(mcu);
            if (!myInfo) return;

            const myVariant = details.variant || '';
            const myPL = details.product_line || '';
            const myPinCount = chip.pinCount || (pinCountMap[myInfo.pinCode] || 0);
            const myFlash = flashSizes[myInfo.flashCode] || 0;

            const candidates = arduinoBoards.filter(b => {
                const bInfo = parseModel(b.mcu);
                if (!bInfo) return false;
                // 硬性约束：系列必须一致, Flash 必须足够
                return bInfo.series === myInfo.series && (b.rom / 1024) >= myFlash;
            });

            if (candidates.length === 0) return;

            // 多维度权衡评分
            const scored = candidates.map(b => {
                const phys = pioPhysInfo[b.id];
                const bInfo = parseModel(b.mcu);
                if (!bInfo) return { id: b.id, score: 99999 };

                let score = 50000;

                const bVariantLeaf = (phys?.variant || '').split('/').pop() || '';
                const myVariantLeaf = myVariant.split('/').pop() || '';

                // 1. 变体文件夹匹配 (最高优先级)
                if (myVariantLeaf && bVariantLeaf && (bVariantLeaf === myVariantLeaf || bVariantLeaf.includes(myVariantLeaf) || myVariantLeaf.includes(bVariantLeaf))) {
                    score -= 40000;
                }

                // 2. 引脚数匹配 (极其重要)
                if (bInfo.pinCode === myInfo.pinCode) {
                    score -= 5000;
                } else if (phys && phys.pinCount > 0 && myPinCount > 0) {
                    const diff = Math.abs(phys.pinCount - myPinCount);
                    score += diff * 100; // 物理引脚数差异惩罚
                }

                // 3. 产品线匹配
                if (phys && myPL && phys.productLine === myPL) {
                    score -= 2000;
                }

                // 4. 型号代码相似度
                if (bInfo.line === myInfo.line) {
                    score -= 1000;
                }

                // 5. Flash 容量溢出惩罚
                score += (b.rom / 1024 - myFlash) / 10;

                return { id: b.id, score };
            });

            scored.sort((a, b) => a.score - b.score);

            if (scored.length > 0 && scored[0].score < 50000) {
                compatibilityMap[chip.id] = scored[0].id;
                mappedCount++;
            }
        });
    });

    const outputDir = path.dirname(OUTPUT_MAP);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // 写入兼容性映射表
    fs.writeFileSync(OUTPUT_MAP, JSON.stringify(compatibilityMap, null, 2));
    console.log(`[完成] 兼容性映射生成成功: ${mappedCount}/${totalCount} 个 MCU 已映射。`);
}

main();
