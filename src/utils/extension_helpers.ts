/**
 * ============================================================
 * 扩展开发辅助函数 (Extension Development Helpers)
 * ============================================================
 * 
 * 提供类型安全的辅助函数，简化扩展插件和积木模块的开发。
 * 
 * 辅助函数:
 * - defineBoard(): 定义开发板配置，获得 TypeScript 类型提示
 * - defineBlockModule(): 定义积木模块，获得类型提示
 * - defineBlock(): 简化单个积木块的注册
 * 
 * @file src/utils/extension_helpers.ts
 * @module EmbedBlocks/Frontend/Utils
 */

import { Board } from '../types/board';
import { BlockModule } from '../registries/ModuleRegistry';
import { registerBlock } from '../generators/arduino-base';

/**
 * 助手函数: 定义开发板 (Define Board Configuration)
 * 
 * 使用此函数包裹你的 Board 对象，可以获得 TypeScript 类型提示和校验。
 * 
 * @example
 * export const MY_BOARD = defineBoard({
 *   id: 'my_board',
 *   ...
 * });
 */
export const defineBoard = (config: Board): Board => {
    return config;
};

/**
 * 助手函数: 定义积木模块 (Define Block Module)
 * 
 * 使用此函数包裹模块定义，获得类型提示。
 * 
 * @example
 * export const MyModule = defineBlockModule({
 *   id: 'my_module',
 *   init: () => { ... }
 * });
 */
export const defineBlockModule = (config: BlockModule): BlockModule => {
    return config;
};

/**
 * 助手函数: 定义单个积木 (Define Single Block)
 * 
 * 简化 registerBlock 的调用，并提供更友好的类型支持。
 * 
 * @param id 积木唯一ID
 * @param uiDefinition Blockly UI 定义函数 (this 指向 Block)
 * @param generator 代码生成函数 (block 参数)
 */
export const defineBlock = (
    id: string,
    uiDefinition: (this: any) => void,
    generator: (block: any) => string | [string, number]
) => {
    registerBlock(id, { init: uiDefinition }, generator);
};
