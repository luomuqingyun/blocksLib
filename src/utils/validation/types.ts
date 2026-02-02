import * as Blockly from 'blockly';

/**
 * 校验规则接口定义 (Validation Rule Interface)
 * 接受一个 Blockly 积木对象作为参数。
 * 如果校验失败，返回一段警告/错误字符串；如果校验通过，则返回 null。
 */
export type ValidationRule = (block: Blockly.Block) => string | null;
