/**
 * ============================================================
 * 全局常量 (Global Constants)
 * ============================================================
 * 
 * 提供向后兼容的板卡配置导出。
 * 
 * ⚠️ 注意: 这些导出已被弃用，请使用 BoardRegistry 替代:
 * - BOARD_CONFIGS -> BoardRegistry.getAll()
 * - getToolboxConfig() -> BoardRegistry.getToolboxConfig()
 * 
 * @file src/constants.ts
 * @module EmbedBlocks/Frontend/Constants
 * @deprecated 请使用 BoardRegistry 替代
 */

import { BoardConfig } from './types/board';
import { ALL_BOARD_FAMILIES } from './config/all_boards';
import { BoardRegistry } from './registries/BoardRegistry';

// 类型重导出 (保持向后兼容)
export type { BoardConfig } from './types/board';
export { ALL_BOARD_FAMILIES } from './config/all_boards';

/**
 * 所有板卡配置列表
 * @deprecated 请使用 BoardRegistry.getAll() 替代
 */
export const BOARD_CONFIGS: BoardConfig[] = BoardRegistry.getAll();

/**
 * 获取板卡的工具箱配置
 * @deprecated 请使用 BoardRegistry.getToolboxConfig() 替代
 */
export const getToolboxConfig = (boardConfig: BoardConfig) => {
    return BoardRegistry.getToolboxConfig(boardConfig.id);
};

/** 默认工具箱配置 (使用第一个板卡) */
export const DEFAULT_TOOLBOX_CONFIG = getToolboxConfig(BOARD_CONFIGS[0]);