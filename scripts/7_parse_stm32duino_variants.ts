/**
 * scripts/7_parse_stm32duino_variants.ts
 * 
 * 解析 STM32duino (Arduino_Core_STM32) 的 variants 目录，
 * 从 boards_entry.txt 文件中提取所有支持的芯片型号及其配置信息。
 * 
 * 输出: stm32duino_support_registry.json - 包含所有 STM32duino 原生支持的芯片及其 variant 路径
 * 
 * 用法: npx tsx scripts/7_parse_stm32duino_variants.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { ARDUINO_CORE_STM32_PATH, resolveDataPath } from './data_sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 输出文件路径
const OUTPUT_REGISTRY = path.join(__dirname, 'stm32duino_support_registry.json');
const OUTPUT_ENHANCED_COMPAT = path.join(__dirname, '../electron/config/stm32_compatibility_enhanced.json');

// PlatformIO 回退路径
const PIO_VARIANTS_DIR = path.join(os.homedir(), '.platformio', 'packages', 'framework-arduinoststm32', 'variants');

// 获取实际的 variants 目录
const EFFECTIVE_VARIANTS_DIR = resolveDataPath(path.join(ARDUINO_CORE_STM32_PATH, 'variants'), PIO_VARIANTS_DIR);

/**
 * 每个芯片的支持信息
 */
interface ChipSupportInfo {
    /** Arduino 菜单中的名称，如 "Generic F205RBTx" */
    displayName: string;
    /** STM32duino 中的 board 标识，如 "GENERIC_F205RBTX" */
    boardTag: string;
    /** Variant 目录路径 (相对于 variants 根目录)，如 "STM32F2xx/F205RE(T-Y)_F205R(B-C-F)T_F205RG(E-T-Y)_F215R(E-G)T" */
    variantPath: string;
    /** 产品系列，如 "STM32F205xx" */
    productLine: string;
    /** 最大 Flash 大小 (bytes) */
    maxSize: number;
    /** 最大 RAM 大小 (bytes) */
    maxDataSize: number;
    /** MCU 型号 (小写)，如 "stm32f205rbt6" */
    mcu: string;
    /** 系列目录名，如 "STM32F2xx" */
    seriesDir: string;
}

/**
 * 增强的兼容性映射信息
 */
interface EnhancedCompatInfo {
    /** PIO board ID (如果存在精确匹配) 或 null (需要 local_patch) */
    pioBoardId: string | null;
    /** Variant 路径 */
    variantPath: string;
    /** 产品系列 */
    productLine: string;
    /** 最大 Flash 大小 */
    maxSize: number;
    /** 最大 RAM 大小 */
    maxDataSize: number;
    /** 是否需要 local_patch 模式 */
    requiresLocalPatch: boolean;
}

/**
 * 解析单个 boards_entry.txt 文件
 */
function parseBoardsEntry(filePath: string, seriesDir: string, variantDirName: string): ChipSupportInfo[] {
    const results: ChipSupportInfo[] = [];

    if (!fs.existsSync(filePath)) {
        return results;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // 当前正在解析的芯片信息
    let currentChip: Partial<ChipSupportInfo> | null = null;

    for (const line of lines) {
        const trimmedLine = line.trim();

        // 跳过注释和空行
        if (trimmedLine.startsWith('#') || trimmedLine === '') {
            // 检查是否是芯片注释标题，如 "# Generic F205RBTx"
            const chipCommentMatch = trimmedLine.match(/^#\s+Generic\s+(\S+)/);
            if (chipCommentMatch) {
                // 保存之前的芯片（如果有）
                if (currentChip && currentChip.boardTag) {
                    results.push(currentChip as ChipSupportInfo);
                }
                // 开始新芯片
                currentChip = {
                    displayName: `Generic ${chipCommentMatch[1]}`,
                    seriesDir: seriesDir,
                    variantPath: `${seriesDir}/${variantDirName}`
                };
            }
            continue;
        }

        // 解析配置行
        // 格式: GenXX.menu.pnum.BOARD_TAG.property=value
        const configMatch = trimmedLine.match(/^Gen\w+\.menu\.pnum\.(\w+)(?:\.(\w+(?:\.\w+)*))?=(.+)$/);
        if (configMatch) {
            const [, boardTag, property, value] = configMatch;

            // 如果是新的 board tag，创建新条目
            if (!property) {
                // 这是显示名称行: GenF2.menu.pnum.GENERIC_F205RBTX=Generic F205RBTx
                if (currentChip && currentChip.boardTag && currentChip.boardTag !== boardTag) {
                    // 保存之前的芯片
                    results.push(currentChip as ChipSupportInfo);
                }
                currentChip = {
                    displayName: value,
                    boardTag: boardTag,
                    seriesDir: seriesDir,
                    variantPath: `${seriesDir}/${variantDirName}`
                };
            } else if (currentChip && currentChip.boardTag === boardTag) {
                // 解析属性
                switch (property) {
                    case 'upload.maximum_size':
                        currentChip.maxSize = parseInt(value, 10);
                        break;
                    case 'upload.maximum_data_size':
                        currentChip.maxDataSize = parseInt(value, 10);
                        break;
                    case 'build.product_line':
                        currentChip.productLine = value;
                        break;
                    case 'build.variant':
                        currentChip.variantPath = value;
                        break;
                    case 'build.board':
                        // 可以用来验证 boardTag
                        break;
                }
            }
        }
    }

    // 保存最后一个芯片
    if (currentChip && currentChip.boardTag) {
        results.push(currentChip as ChipSupportInfo);
    }

    // 为每个芯片生成 MCU 名称
    for (const chip of results) {
        // STM32 MCU 格式: Series(1-2) + SubSeries(2) + Pin(1) + Flash(1) + Package(1-2) + Temp(1)
        // 例: F103C8TX -> F1 + 03 + C + 8 + T + X
        // 例: G431KBTX -> G4 + 31 + K + B + T + X
        // 从 boardTag 推断 MCU: GENERIC_F103C8TX -> stm32f103c8tx
        chip.mcu = chip.boardTag.replace('GENERIC_', 'stm32').toLowerCase();
    }

    return results;
}

/**
 * 扫描所有 STM32duino variants 目录
 */
function scanAllVariants(): Map<string, ChipSupportInfo> {
    const registry = new Map<string, ChipSupportInfo>();

    if (!fs.existsSync(EFFECTIVE_VARIANTS_DIR)) {
        console.error(`[错误] Variants 目录不存在: ${EFFECTIVE_VARIANTS_DIR}`);
        return registry;
    }

    console.log(`[信息] 扫描 variants 目录: ${EFFECTIVE_VARIANTS_DIR}`);

    // 遍历系列目录 (STM32F0xx, STM32F1xx, ...)
    const seriesDirs = fs.readdirSync(EFFECTIVE_VARIANTS_DIR).filter(name => {
        const fullPath = path.join(EFFECTIVE_VARIANTS_DIR, name);
        return fs.statSync(fullPath).isDirectory() && name.startsWith('STM32');
    });

    for (const seriesDir of seriesDirs) {
        const seriesPath = path.join(EFFECTIVE_VARIANTS_DIR, seriesDir);

        // 遍历 variant 子目录
        const variantDirs = fs.readdirSync(seriesPath).filter(name => {
            const fullPath = path.join(seriesPath, name);
            return fs.statSync(fullPath).isDirectory();
        });

        for (const variantDir of variantDirs) {
            const boardsEntryPath = path.join(seriesPath, variantDir, 'boards_entry.txt');

            if (fs.existsSync(boardsEntryPath)) {
                const chips = parseBoardsEntry(boardsEntryPath, seriesDir, variantDir);

                for (const chip of chips) {
                    // 使用 boardTag 作为 key
                    registry.set(chip.boardTag, chip);
                }
            }
        }
    }

    return registry;
}

/**
 * 将 boardTag 转换为 EmbedBlocks 的 chip ID 格式
 * GENERIC_F103C8TX -> generic_stm32f103c8
 * GENERIC_G431KBTX -> generic_stm32g431kb
 */
function boardTagToChipId(boardTag: string): string {
    // GENERIC_F103C8TX -> F103C8TX
    const chipPart = boardTag.replace('GENERIC_', '');

    // 移除封装后缀 (T, U, H, I, Y 等) 和温度等级后缀 (X, N 等)
    // F103C8TX -> F103C8
    // G431KBTX -> G431KB
    // H743VITX -> H743VI (注意有些芯片有 I 封装)

    // STM32 MCU 基础格式: Series(1-2) + SubSeries(2) + Pin(1) + Flash(1)
    // 例: F103C8, G431KB, H743VI, F205RB
    // 后面的都是封装和温度代码

    // 通用正则: 匹配基础 MCU 部分
    // Series: F/G/H/L/U/W/C + 数字
    // SubSeries: 2位数字
    // Pin: C/K/R/V/Z/A/I/B/N/M/T/F/G/Q/S 等
    // Flash: 4/6/8/B/C/D/E/F/G/H/I/Z 等
    const baseMatch = chipPart.match(/^([A-Z]\d)(\d{2})([A-Z])([A-Z0-9])/);
    if (baseMatch) {
        const [, series, subSeries, pin, flash] = baseMatch;
        return `generic_stm32${series.toLowerCase()}${subSeries}${pin.toLowerCase()}${flash.toLowerCase()}`;
    }

    // 处理特殊情况 (如 WB55xx 等有更长的系列标识)
    const specialMatch = chipPart.match(/^([A-Z]{2}\d{2})([A-Z])([A-Z0-9])/);
    if (specialMatch) {
        const [, series, pin, flash] = specialMatch;
        return `generic_stm32${series.toLowerCase()}${pin.toLowerCase()}${flash.toLowerCase()}`;
    }

    // 回退处理: 移除常见的封装后缀
    const simplified = chipPart.replace(/[TUHIYN]+X?$/i, '').toLowerCase();
    return `generic_stm32${simplified}`;
}

/**
 * 加载现有的 PIO boards 列表
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
 * 将 chipId 转换为可能的 PIO board ID
 * 例: generic_stm32f103c8 -> genericSTM32F103C8 (PIO 的命名格式)
 */
function chipIdToPioBoardId(chipId: string): string {
    // generic_stm32f103c8 -> genericSTM32F103C8
    return chipId.replace(/_stm32/i, 'STM32').replace(/_/g, '');
}

/**
 * 加载 EmbedBlocks 中已收录的芯片列表
 * 这些芯片是经过过滤的，排除了 PIO 完全不支持的系列
 */
function loadEmbedBlocksChips(): Set<string> {
    const chips = new Set<string>();
    const boardsDir = path.join(__dirname, '../src/data/boards/stm32');

    if (!fs.existsSync(boardsDir)) {
        console.warn(`[警告] 找不到 EmbedBlocks 板卡目录: ${boardsDir}`);
        return chips;
    }

    // 遍历系列目录
    const seriesDirs = fs.readdirSync(boardsDir).filter(name => {
        const fullPath = path.join(boardsDir, name);
        return fs.statSync(fullPath).isDirectory() && name.startsWith('STM32');
    });

    for (const seriesDir of seriesDirs) {
        const seriesPath = path.join(boardsDir, seriesDir);
        const chipFiles = fs.readdirSync(seriesPath).filter(f => f.endsWith('.json'));

        for (const file of chipFiles) {
            // 从文件名推断 chip ID: STM32F103C8.json -> generic_stm32f103c8
            const chipName = file.replace('.json', '');
            const chipId = `generic_${chipName.toLowerCase()}`;
            chips.add(chipId);
        }
    }

    return chips;
}

/**
 * 主函数
 */
function main() {
    console.log('=== STM32duino Variants 解析器 ===\n');

    // 1. 扫描所有 variants (用于查找匹配)
    const registry = scanAllVariants();
    console.log(`[信息] STM32duino 共发现 ${registry.size} 个芯片定义`);

    // 2. 构建反向查找表: chipId -> boardTag
    const chipIdToBoardTag = new Map<string, string>();
    for (const [boardTag] of registry) {
        const chipId = boardTagToChipId(boardTag);
        // 如果有多个 boardTag 映射到同一个 chipId，保留第一个
        if (!chipIdToBoardTag.has(chipId)) {
            chipIdToBoardTag.set(chipId, boardTag);
        }
    }

    // 3. 输出完整 registry (可选，用于调试)
    const registryObj: Record<string, ChipSupportInfo> = {};
    for (const [key, value] of registry) {
        registryObj[key] = value;
    }

    fs.writeFileSync(OUTPUT_REGISTRY, JSON.stringify(registryObj, null, 2));
    console.log(`[完成] 写入完整 registry: ${OUTPUT_REGISTRY}`);

    // 4. 加载 EmbedBlocks 支持的芯片列表 (已过滤)
    const embedBlocksChips = loadEmbedBlocksChips();
    console.log(`[信息] EmbedBlocks 支持 ${embedBlocksChips.size} 个芯片\n`);

    // 5. 加载 PIO 板卡数据
    const pioBoards = loadPioBoards();
    console.log(`[信息] PIO boards 目录包含 ${pioBoards.size} 个板卡定义`);

    // 6. 生成增强的兼容性映射 (仅针对 EmbedBlocks 支持的芯片)
    const enhancedCompat: Record<string, EnhancedCompatInfo> = {};
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const chipId of embedBlocksChips) {
        const boardTag = chipIdToBoardTag.get(chipId);

        if (boardTag) {
            // 在 STM32duino 中找到了匹配
            const chipInfo = registry.get(boardTag)!;
            // 直接匹配 PIO board ID (仅精确匹配，不使用近似匹配)
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
            // 在 STM32duino 中没有找到匹配 (可能是新系列或特殊芯片)
            // 使用 local_patch 模式
            enhancedCompat[chipId] = {
                pioBoardId: null,
                variantPath: '', // 无法从 STM32duino 获取
                productLine: '',
                maxSize: 0,
                maxDataSize: 0,
                requiresLocalPatch: true // 需要 local_patch
            };
            unmatchedCount++;
        }
    }

    fs.writeFileSync(OUTPUT_ENHANCED_COMPAT, JSON.stringify(enhancedCompat, null, 2));
    console.log(`[完成] 写入增强兼容性映射: ${OUTPUT_ENHANCED_COMPAT}`);

    // 7. 统计信息
    const totalChips = Object.keys(enhancedCompat).length;
    const chipsWithPioBoard = Object.values(enhancedCompat).filter(c => c.pioBoardId).length;
    const chipsWithVariantPath = Object.values(enhancedCompat).filter(c => c.variantPath).length;
    const chipsNeedingPatch = Object.values(enhancedCompat).filter(c => c.requiresLocalPatch).length;

    console.log('\n=== 统计 ===');
    console.log(`EmbedBlocks 支持的芯片总数: ${totalChips}`);
    console.log(`在 STM32duino 中找到匹配: ${matchedCount}`);
    console.log(`在 STM32duino 中未找到匹配: ${unmatchedCount}`);
    console.log(`有精确 Variant 路径: ${chipsWithVariantPath}`);
    console.log(`有 PIO Board 映射: ${chipsWithPioBoard}`);
    console.log(`需要 local_patch: ${chipsNeedingPatch}`);

    // 8. 显示一些示例
    console.log('\n=== 示例条目 ===');
    const examples = ['generic_stm32f103c8', 'generic_stm32f205rb', 'generic_stm32f407vg', 'generic_stm32g431kb'];
    for (const ex of examples) {
        if (enhancedCompat[ex]) {
            console.log(`${ex}:`);
            console.log(`  variantPath: ${enhancedCompat[ex].variantPath || '(未找到)'}`);
            console.log(`  pioBoardId: ${enhancedCompat[ex].pioBoardId || '(需要 local_patch)'}`);
            console.log(`  productLine: ${enhancedCompat[ex].productLine || '(未知)'}`);
        } else {
            console.log(`${ex}: 未在 EmbedBlocks 中收录`);
        }
    }

    // 9. 显示未匹配的芯片列表 (如果有)
    if (unmatchedCount > 0) {
        console.log(`\n=== 未在 STM32duino 中找到匹配的芯片 (前 10 个) ===`);
        let shown = 0;
        for (const chipId of embedBlocksChips) {
            if (!chipIdToBoardTag.has(chipId)) {
                console.log(`  ${chipId}`);
                shown++;
                if (shown >= 10) break;
            }
        }
        if (unmatchedCount > 10) {
            console.log(`  ... 及其他 ${unmatchedCount - 10} 个`);
        }
    }
}

main();
