import * as Blockly from 'blockly';

/**
 * 校验上下文 (Validation Context)
 * 携带校验过程中的元数据，如触发本次校验的积木 ID。
 */
export interface ValidationContext {
    /** 触发本次校验事件的积木 ID (如果有) */
    triggerBlockId?: string;
}

/**
 * 校验规则接口定义 (Validation Rule Interface)
 * 接受一个 Blockly 积木对象作为参数，以及可选的校验上下文。
 * 如果校验失败，返回一段警告/错误字符串；如果校验通过，则返回 null。
 */
export type ValidationRule = (block: Blockly.Block, context?: ValidationContext) => string | null;
