import * as Blockly from 'blockly';
import { ValidationRule } from '../types';

/**
 * 核心校验规则 (Core Validation Rules)
 */

/**
 * 1. 缺失输入检查 (Missing Input Check)
 * 检查块的任何“值输入” (Value Input) 是否未连接。
 */
export const checkMissingInputs: ValidationRule = (block) => {
    // 跳过对枚举定义输入的检查（枚举项的数值是可选的，支持自动递增）
    if (block.type === 'c_enum_define') return null;

    for (const input of block.inputList) {
        // 如果输入类型为“数值输入”且未检测到目标连接，则提示缺失
        if ((input.type as any) === Blockly.INPUT_VALUE && !input.connection?.targetConnection) {
            return "此处需要连接一个数值。";
        }
    }
    return null;
};

/**
 * 2. 悬空输出检查 (Orphan Output Check)
 * 检查具有输出连接的积木是否被实际使用。
 */
export const checkOrphanOutput: ValidationRule = (block) => {
    // 如果积木有输出连接但未连接到任何目标，则任务该计算结果被浪费了
    if (block.outputConnection && !block.outputConnection.targetConnection) {
        return "积木的计算结果未被使用。";
    }
    return null;
};
