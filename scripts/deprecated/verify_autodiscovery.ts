/**
 * ============================================================
 * 自动发现验证脚本 (Autodiscovery Verification Script)
 * ============================================================
 * 
 * 验证新的 "基于白名单" 的自动发现逻辑的效果。
 * 通过比对 Open Data 中的芯片与 STM32duino Registry 中的支持列表，
 * 统计将被启用的芯片数量和新系列。
 * 
 * @file scripts/verify_autodiscovery.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { EMBASSY_STM32_DATA_PATH } from './data_sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REGISTRY_PATH = path.join(__dirname, 'stm32duino_support_registry.json');
const CHIPS_DIR = path.join(EMBASSY_STM32_DATA_PATH, 'data/chips');

// 加载注册表 (事实标准)
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const supportedBoardTags = new Set(Object.keys(registry));

// 辅助函数: 将芯片名称转换为板卡标签模式 (近似)
function getPotentialBoardTags(chipName: string): string[] {
    // STM32F407VGT6 -> GENERIC_F407VGTX, GENERIC_F407VGT, etc.
    const upper = chipName.toUpperCase();
    const match = upper.match(/^STM32([A-Z]\d)(\d{2})([A-Z])([A-Z0-9])/);
    if (!match) return [];

    // 尝试 1: 全匹配 (Generic_...)
    // EmbedBlocks 逻辑: GENERIC_ + F103C8 + TX (通常)
    // 我们可以依赖现有的 logic `boardTagToChipId` 来处理
    // 但这里我们想看看 `chipName` 是否匹配 `supportedBoardTags` 中的任何条目

    // 反向方法: 遍历注册表并验证此芯片是否属于任何变体
    // 这是昂贵的 O(N*M)。
    // 更好的方法: 检查我们是否能找到匹配的 generic 定义。

    return [];
}

// 主验证逻辑
function main() {
    console.log("=== 自动发现逻辑验证 ===");
    console.log(`注册表 (变体) 数量: ${supportedBoardTags.size}`);

    // 我们想看看如果移除黑名单
    // 并根据注册表验证，会有多少 Open Data 芯片被【启用】。

    const chipFiles = fs.readdirSync(CHIPS_DIR).filter(f => f.endsWith('.json'));
    console.log(`Open Data 可用芯片数量: ${chipFiles.length}`);

    let enabledCount = 0;
    let newSeriesFound = new Set<string>();

    // 从注册表构建 "已支持 MCU" 的查找集合
    // 注册表包含 `mcu` 字段 (例如 stm32f103c8tx)
    const supportedMcus = new Set<string>();
    Object.values(registry).forEach((entry: any) => {
        if (entry.mcu) supportedMcus.add(entry.mcu.toLowerCase());
    });

    console.log(`从变体中提取的支持 MCU 数量: ${supportedMcus.size}`);

    for (const file of chipFiles) {
        const content = fs.readFileSync(path.join(CHIPS_DIR, file), 'utf8');
        const chipData = JSON.parse(content);
        const name = chipData.name.toUpperCase(); // STM32F103C8
        const family = chipData.family; // STM32F1

        // 模拟【提议】的逻辑:
        // 1. 它是有效的 STM32 芯片吗? 是。
        // 2. 我们在注册表中有匹配的变体吗?

        // 匹配逻辑:
        // 注册表有 `stm32f103c8tx`。Open Data 有 `STM32F103C8`。
        // 我们需要模糊匹配。
        // 如果 `stm32f103c8` 是任何受支持 MCU 的前缀，我们可以支持它。

        const isSupported = Array.from(supportedMcus).some(mcu => mcu.startsWith(name.toLowerCase()));

        if (isSupported) {
            enabledCount++;

            // 检查这是否属于当前被排除的系列
            const EXCLUDED_SERIES = ['STM32C0', 'STM32N6', 'STM32U0', 'STM32U3', 'STM32WB0', 'STM32WBA'];
            const EXCLUDED_SUB_SERIES = ['STM32H7A', 'STM32H7B', 'STM32H7R', 'STM32H7S', 'STM32U5', 'STM32H5', 'STM32L5'];

            if (EXCLUDED_SERIES.includes(family)) {
                newSeriesFound.add(family);
            }
            if (EXCLUDED_SUB_SERIES.some(sub => name.startsWith(sub))) {
                newSeriesFound.add(name.substring(0, 8)); // rough subseries
            }
        }
    }

    console.log(`\n如果切换到 "基于变体的白名单":`);
    console.log(`启用的芯片总数: ${enabledCount}`);
    console.log(`将被启用的新系列 (如果变体中存在):`, Array.from(newSeriesFound));

    if (newSeriesFound.size === 0) {
        console.log("在您的本地变体目录中未找到被排除的系列。");
        console.log("这意味着您当前的 PlatformIO 包尚不支持被排除的芯片。");
        console.log("但是，如果您更新包，它们将通过此逻辑自动出现。");
    }
}

main();
