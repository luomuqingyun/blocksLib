import { BoardConfig } from './types/board';
import { ALL_BOARD_FAMILIES } from './config/all_boards';
import { BoardRegistry } from './registries/BoardRegistry';

// Re-exports for backward compatibility
export type { BoardConfig } from './types/board';
export { ALL_BOARD_FAMILIES } from './config/all_boards';

/**
 * @deprecated Use BoardRegistry.getAll() instead.
 */
export const BOARD_CONFIGS: BoardConfig[] = BoardRegistry.getAll();

/**
 * @deprecated Use BoardRegistry.getToolboxConfig() instead.
 */
export const getToolboxConfig = (boardConfig: BoardConfig) => {
    return BoardRegistry.getToolboxConfig(boardConfig.id);
};

export const DEFAULT_TOOLBOX_CONFIG = getToolboxConfig(BOARD_CONFIGS[0]);