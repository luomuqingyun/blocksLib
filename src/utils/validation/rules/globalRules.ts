import { ValidationRule } from '../types';

/**
 * 全局作用域及单例强制规则 (Rules for global scope and singleton enforcement)
 */

// 允许在全局区域（不被任何积木包裹的根部区域）存在的积木类型
const GLOBAL_SAFE_BLOCKS = [
    'arduino_functions_setup', 'arduino_functions_loop', 'arduino_functions_def_flexible',
    'c_struct_define', 'c_enum_define', 'c_macro_define', 'arduino_var_declare',
    'c_array_define', 'c_struct_var_declare', 'c_enum_var_declare', 'c_include', 'arduino_entry_root'
];

/**
 * 全局作用域检查: 确保执行性语句不被放置在全局范围内。
 */
export const checkGlobalScope: ValidationRule = (block) => {
    // 仅针对有上下连接 (Statement) 且非表达式 (Output) 的积木
    if (block.previousConnection && !block.outputConnection) {
        let isGlobal = true;
        let node: any = block;

        // 向上溯源：检查该积木链是否被包裹在某个积木的“陈述输入” (Statement Input) 中
        while (node.getParent()) {
            const parent = node.getParent();
            const connection = node.previousConnection.targetConnection;

            // 检查连接点是否位于父积木的某一个输入插槽内（而非父积木的“下一个”连接）
            let isContained = false;
            for (const input of parent.inputList) {
                if (input.connection === connection) {
                    isContained = true;
                    break;
                }
            }

            if (isContained) {
                // 如果积木位于某个输入的内部，则它不是全局的（例如在 setup 或函数体内）
                isGlobal = false;
                break;
            }
            node = parent;
        }

        // 如果积木处于最外层全局区域，且不在“全局安全”白名单中
        if (isGlobal && !GLOBAL_SAFE_BLOCKS.includes(block.type)) {
            return "执行性语句（代码）不能放置在全局作用域中。请将其放置在 Setup、Loop 或自定义函数内部。";
        }
    }
    return null;
};

/**
 * 入口根积木 (Entry Root) 单例检查
 * 确保工作区中只存在一个主入口积木。
 */
export const checkSingletonEntry: ValidationRule = (block) => {
    if (block.type === 'arduino_entry_root' && block.workspace) {
        const rootBlocks = block.workspace.getBlocksByType('arduino_entry_root', false);
        // 如果发现多个入口积木，逻辑上保留 ID 最小的一个，其余报错
        if (rootBlocks.length > 1) {
            const sortedBlocks = [...rootBlocks].sort((a, b) => a.id.localeCompare(b.id));
            if (block.id !== sortedBlocks[0].id) {
                return "入口积木（Entry Root）在项目中只能存在一个。该积木已被标记为重复，请手动删除。";
            }
        }
    }
    return null;
};
