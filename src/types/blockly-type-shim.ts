/**
 * ============================================================
 * Blockly TypeScript 类型垫片 (Type Shim)
 * ============================================================
 * 
 * 补全 Blockly 在 TypeScript 中的类型定义，提供更强的类型检查。
 * 
 * @file src/types/blockly-type-shim.ts
 */

import * as Blockly from 'blockly';

/**
 * 扩展标准 Block 接口，添加常用的自定义属性和方法
 * 避免在代码中到处使用 (block: any)
 */
export interface TypedBlock extends Blockly.Block {
    // 允许使用任意字符串作为 Key 获取 Field
    getFieldValue(name: string): string;

    // 输入相关
    appendDummyInput(opt_name?: string): Blockly.Input;
    appendValueInput(name: string): Blockly.Input;
    appendStatementInput(name: string): Blockly.Input;

    // 连接检查
    setCheck(check: string | string[] | null): Blockly.Input;

    // UI 设置
    setColour(colour: number | string): void;
    setTooltip(newTip: any): void;
    setHelpUrl(url: string | ((block: Blockly.Block) => string)): void;

    // 状态
    isInFlyout: boolean;
    workspace: Blockly.Workspace;

    // 自定义方法 (Mixins)
    // 根据具体实现可能存在的扩展方法

    updateShape_?: () => void;

    // Core mutator properties
    elseifCount_?: number;
    elseCount_?: number;
}

/**
 * 代码生成器函数类型
 */
export type BlockGenerator = (block: TypedBlock) => string | [string | number, number];

/**
 * 积木初始化函数类型
 */
export type BlockInit = (this: TypedBlock) => void;
