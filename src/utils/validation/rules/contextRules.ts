import { ValidationRule } from '../types';

/**
 * Rules for specific block types (Context/Logic)
 */

export const checkArduinoParamDef: ValidationRule = (block) => {
    if (block.type === 'arduino_param_def') {
        const parent = block.getSurroundParent();
        if (!parent || parent.type !== 'arduino_functions_def_flexible') {
            return "Must be placed inside a Function Definition parameters area.";
        }
    }
    return null;
};

export const checkCStructDefine: ValidationRule = (block) => {
    if (block.type === 'c_struct_define') {
        let memCount = 0;
        for (const input of block.inputList) {
            if (input.name.startsWith('MEM')) memCount++;
        }
        if (memCount === 0) return "Struct cannot be empty.";
    }
    return null;
};

export const checkCEnumDefine: ValidationRule = (block) => {
    if (block.type !== 'c_enum_define') return null;

    let hasItems = false;
    let currentVal = -1;
    let validationError = null;

    // Check extra state or input list for items
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
        return "Enum cannot be empty.";
    }

    // Check monotonicity tracking implicit values
    for (const input of block.inputList) {
        if (!input.name.startsWith('VAL')) continue;

        let val = currentVal + 1;

        if (input.connection && input.connection.targetConnection) {
            const target = input.connection.targetConnection.getSourceBlock();
            if (target.type === 'math_number') {
                const num = parseFloat(target.getFieldValue('NUM'));
                if (!isNaN(num)) {
                    if (num < val) {
                        validationError = `Invalid sequence: ${num} < ${val} (expected)`;
                    }
                    val = num;
                }
            }
        }
        currentVal = val;
    }

    return validationError;
};
