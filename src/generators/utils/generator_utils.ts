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
import { TypedBlock, BlockGenerator } from '../../types/blockly-type-shim';

/** 
 * 清理名称为有效 C 标识符 (移除非法字符) 
 * 用于确保用户输入的变量名或设备名可以在 C++ 代码中合法使用
 */
export const cleanName = (name: string) => name ? name.replace(/[^a-zA-Z0-9_]/g, '_') : 'unnamed';

// Comprehensive Block Validator
// Validation is now centralized in utils/block_validation.ts
export { validateBlock } from '../../utils/block_validation';


/**
 * 注册积木块
 * 同时定义积木的外观/行为 (Blockly.Blocks) 和其对应的 Arduino 生成器
 * @param type 积木块的唯一标识名
 * @param def 积木定义对象 (模型)
 * @param generator 生成器函数 (将积木逻辑转为代码)
 */
export const registerBlock = (type: string, def: any, generator: BlockGenerator) => {
    const originalInit = def.init;
    // 重写 init 以确保可以注入通用的初始化逻辑
    def.init = function (this: TypedBlock) {
        if (originalInit) originalInit.call(this);
        // 注意：校验逻辑现在由 BlocklyWrapper 中的全局监听器统一处理
    };

    // 在 Blockly 全局库中注册该积木定义
    Blockly.Blocks[type] = def;

    // 绑定至 Arduino 编译器
    // @ts-ignore
    arduinoGenerator.forBlock[type] = generator;
};

// Removed injectStandardValidation as we now use a global listener

/**
 * 仅注册生成器 (适用于已在其他地方定义好、仅需定义转换逻辑的积木)
 */
export const registerGeneratorOnly = (type: string, generator: BlockGenerator) => {
    // @ts-ignore
    arduinoGenerator.forBlock[type] = generator;
};

/**
 * 标记硬件引脚占用
 * 用于防止在同一个程序中对同一个引脚进行相互冲突的操作 (如同时配置为输入和输出)
 */
export const reservePin = (block: any, pin: string, mode: string) => {
    if (block.workspace && arduinoGenerator.pins_) {
        // 在生成器的 pins_ 集合中记录状态
        arduinoGenerator.pins_[pin] = mode;
    }
};
