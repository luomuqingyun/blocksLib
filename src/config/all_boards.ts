/**
 * ============================================================
 * 板卡家族聚合配置 (Board Family Aggregation)
 * ============================================================
 * 
 * 聚合所有支持的开发板家族 (Arduino/STM32/ESP32/Custom)。
 * 
 * 特性:
 * - 自动发现 config/custom/ 目录下的自定义板卡
 * - 支持单板定义和系列定义两种格式
 * - 芯片实验室 (Chip Lab) 用于内部开发和测试
 * 
 * @file src/config/all_boards.ts
 * @module EmbedBlocks/Config/Boards
 */

import { BoardFamily, BoardSeries, Board } from '../types/board';
import { STM32_FAMILY } from './stm32_boards';
import { ARDUINO_FAMILY } from './arduino_boards';
import { ESP32_FAMILY } from './esp32_boards';

/**
 * 自动发现芯片实验室 (Auto-discovery for Custom Boards)
 * 扫描 src/config/custom/ 下的所有 .ts 文件和子目录的 index.ts
 */
const customModules = import.meta.glob(['./custom/*.ts', './custom/*/index.ts'], { eager: true });
const customBoards: Board[] = [];
const customSeries: BoardSeries[] = [];

for (const path in customModules) {
    const mod = customModules[path] as any;
    for (const key in mod) {
        const item = mod[key];
        if (item && item.id) {
            if (item.boards && Array.isArray(item.boards)) {
                customSeries.push(item);
            } else if (item.mcu && item.pins) {
                customBoards.push(item);
            }
        }
    }
}

const CUSTOM_FAMILY: BoardFamily = {
    id: 'custom',
    name: { zh: '芯片实验室', en: 'Chip Lab (Internal)' },
    series: []
};

if (customBoards.length > 0) {
    CUSTOM_FAMILY.series.push({
        id: 'dev_single',
        name: { zh: '单板仓库', en: 'Single Boards' },
        boards: customBoards
    });
}
CUSTOM_FAMILY.series.push(...customSeries);

// ------------------------------------------------------------------
// 导出所有硬件家族 (Export all Board Families)
// ------------------------------------------------------------------
export const ALL_BOARD_FAMILIES: BoardFamily[] = [
    ARDUINO_FAMILY,
    STM32_FAMILY,
    ESP32_FAMILY
];

// 只有当有实验室内容时才添加
if (CUSTOM_FAMILY.series.length > 0) {
    ALL_BOARD_FAMILIES.push(CUSTOM_FAMILY);
}
