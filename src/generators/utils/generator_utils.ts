/**
 * ============================================================
 * 生成器工具函数 (Generator Utilities)
 * ============================================================
 * 
 * 提供积木块注册和代码生成的辅助函数:
 * - cleanName(): 清理名称为有效 C 标识符
 * - registerBlock(): 注册积木块定义和生成器
 * - registerGeneratorOnly(): 仅注册生成器（适用于预定义积木）
 * - reservePin(): 标记引脚已被使用
 * 
 * @file src/generators/utils/generator_utils.ts
 * @module EmbedBlocks/Frontend/Generators/Utils
 */

import * as Blockly from 'blockly';
import { arduinoGenerator } from '../arduino-base';

/** 清理名称为有效 C 标识符 (移除非法字符) */
export const cleanName = (name: string) => name ? name.replace(/[^a-zA-Z0-9_]/g, '_') : 'unnamed';

// Comprehensive Block Validator
// Validation is now centralized in utils/block_validation.ts
export { validateBlock } from '../../utils/block_validation';


export const registerBlock = (type: string, def: any, generator: (block: any) => any) => {
    const originalInit = def.init;
    def.init = function () {
        if (originalInit) originalInit.call(this);
        // Note: Validation is now handled by a global listener in BlocklyWrapper
    };

    Blockly.Blocks[type] = def;
    if (arduinoGenerator.forBlock) arduinoGenerator.forBlock[type] = generator;
    else arduinoGenerator[type] = generator;
};

// Removed injectStandardValidation as we now use a global listener

export const registerGeneratorOnly = (type: string, generator: (block: any) => any) => {
    if (arduinoGenerator.forBlock) arduinoGenerator.forBlock[type] = generator;
    else arduinoGenerator[type] = generator;
};

export const reservePin = (block: any, pin: string, mode: string) => {
    if (block.workspace && arduinoGenerator.pins_) {
        arduinoGenerator.pins_[pin] = mode;
    }
};
