import { ValidationRule } from '../types';

/**
 * 特定积木类型的上下文/逻辑校验规则 (Rules for specific block types)
 */

// 校验函数参数定义是否位于正确的位置
export const checkArduinoParamDef: ValidationRule = (block) => {
    if (block.type === 'arduino_param_def') {
        const parent = block.getSurroundParent();
        // 参数积木必须放置在“函数定义”积木内部的参数插槽中
        if (!parent || parent.type !== 'arduino_functions_def_flexible') {
            return "参数定义积木必须放置在函数定义的参数区域内。";
        }
    }
    return null;
};

// 校验结构体定义是否有效
export const checkCStructDefine: ValidationRule = (block) => {
    if (block.type === 'c_struct_define') {
        let memCount = 0;
        // 统计名为 MEM* 的输入插槽，确保结构体不为空
        for (const input of block.inputList) {
            if (input.name.startsWith('MEM')) memCount++;
        }
        if (memCount === 0) return "结构体不能为空。";
    }
    return null;
};

// 校验枚举定义及其取值序列
export const checkCEnumDefine: ValidationRule = (block) => {
    if (block.type !== 'c_enum_define') return null;

    let hasItems = false;
    let currentVal = -1;
    let validationError = null;

    // 检查 extraState 或输入列表，确保枚举包含成员项
    const extraState = (block as any).extraState;
    const items = extraState ? (extraState.items || []) : [];
    if (extraState && (items.length > 0 || extraState.itemCount > 0)) {
        hasItems = true;
    } else {
        for (const input of block.inputList) {
            if (input.name.startsWith('ITEM') || input.name.startsWith('VAL')) {
                hasItems = true;
                break;
            }
        }
    }

    if (!hasItems) {
        return "枚举不能为空。";
    }

    // 检查枚举值的单调递增性（如果手动指定了数值）
    for (const input of block.inputList) {
        if (!input.name.startsWith('VAL')) continue;

        // 如果未指定数值，则默认为前一个值 + 1
        let val = currentVal + 1;

        if (input.connection && input.connection.targetConnection) {
            const target = input.connection.targetConnection.getSourceBlock();
            // 如果连接的是数字积木，提取其数值进行校验
            if (target.type === 'math_number') {
                const num = parseFloat(target.getFieldValue('NUM'));
                if (!isNaN(num)) {
                    // C 语言原则：手动指定的枚举值通常应保持递增（虽然语法允许，但此处限制为单调以保持规范）
                    if (num < val) {
                        validationError = `序列无效：当前值 ${num} 小于预期值 ${val}。`;
                    }
                    val = num;
                }
            }
        }
        currentVal = val;
    }

    return validationError;
};
