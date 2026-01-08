import { ValidationRule } from '../types';

/**
 * Rules for global scope and singleton enforcement
 */

const GLOBAL_SAFE_BLOCKS = [
    'arduino_functions_setup', 'arduino_functions_loop', 'arduino_functions_def_flexible',
    'c_struct_define', 'c_enum_define', 'c_macro_define', 'arduino_var_declare',
    'c_array_define', 'c_struct_var_declare', 'c_enum_var_declare', 'c_include', 'arduino_entry_root'
];

/**
 * Ensures statements are not placed in the global scope.
 */
export const checkGlobalScope: ValidationRule = (block) => {
    if (block.previousConnection && !block.outputConnection) {
        let isGlobal = true;
        let node: any = block;

        while (node.getParent()) {
            const parent = node.getParent();
            const connection = node.previousConnection.targetConnection;

            // Check if connected to a Statement Input instead of a "next" connection
            let isContained = false;
            for (const input of parent.inputList) {
                if (input.connection === connection) {
                    isContained = true;
                    break;
                }
            }

            if (isContained) {
                isGlobal = false;
                break;
            }
            node = parent;
        }

        if (isGlobal && !GLOBAL_SAFE_BLOCKS.includes(block.type)) {
            return "Statements (execution code) cannot be placed in the global scope. Place them inside Setup, Loop, or a Function.";
        }
    }
    return null;
};

/**
 * Singleton Check for Entry Root
 */
export const checkSingletonEntry: ValidationRule = (block) => {
    if (block.type === 'arduino_entry_root' && block.workspace) {
        const rootBlocks = block.workspace.getBlocksByType('arduino_entry_root', false);
        if (rootBlocks.length > 1) {
            const sortedBlocks = [...rootBlocks].sort((a, b) => a.id.localeCompare(b.id));
            if (block.id !== sortedBlocks[0].id) {
                return "入口积木（Entry Root）在项目中只能存在一个。该积木已被标记为重复，请手动删除。";
            }
        }
    }
    return null;
};
