import * as Blockly from 'blockly';
import { scanVariablesCategorized } from '../scanner/VariableScanner';

const createLabelJson = (text: string) => ({ kind: 'label', text: text });

const createBlockJson = (type: string, fields?: Record<string, string>) => {
    const block: any = { kind: 'block', type: type };
    if (fields) block.fields = fields;
    return block;
};

/**
 * 构建变量工具箱 (Construct Variables Toolbox)
 * 动态扫描工作区中的变量、宏定义、结构体和枚举，
 * 并生成对应的 "Get/Set" 积木块添加到工具箱中。
 */
export const constructVariablesToolbox = (workspace: Blockly.Workspace): any[] => {
    const jsonList: any[] = [];
    const allVars = scanVariablesCategorized(workspace);

    // 添加基础标签 (Basic)
    jsonList.push(createLabelJson(Blockly.Msg.LABEL_BASIC));

    // 添加 "声明变量" 和 "声明宏" 按钮
    jsonList.push(createBlockJson('arduino_var_declare'));
    jsonList.push(createBlockJson('c_macro_define'));

    const hasVars = allVars.globals.size > 0 || allVars.macros.size > 0 || allVars.functionScopes.size > 0;

    if (hasVars) {
        jsonList.push(createBlockJson('arduino_var_set_dynamic'));
        jsonList.push(createBlockJson('arduino_var_get_dynamic'));
    }
    if (allVars.macros.size > 0) jsonList.push(createBlockJson('c_macro_get'));

    jsonList.push({ kind: 'sep', gap: 24 });
    jsonList.push(createLabelJson(Blockly.Msg.LABEL_ARRAYS));

    // Optimized: Add shadow for Size
    jsonList.push({
        kind: 'block',
        type: 'c_array_define',
        inputs: {
            SIZE: {
                shadow: {
                    type: 'math_number',
                    fields: { NUM: '10' }
                }
            }
        }
    });

    if (allVars.arrays.size > 0) {
        jsonList.push({
            kind: 'block',
            type: 'c_array_set_element',
            inputs: {
                INDEX0: { shadow: { type: 'math_number', fields: { NUM: '0' } } },
                VALUE: { shadow: { type: 'math_number', fields: { NUM: '0' } } }
            }
        });

        jsonList.push({
            kind: 'block',
            type: 'c_array_get_element',
            inputs: {
                INDEX0: { shadow: { type: 'math_number', fields: { NUM: '0' } } }
            }
        });

        jsonList.push(createBlockJson('c_array_get_whole'));
    }
    return jsonList;
};

/**
 * 构建类型定义工具箱 (Construct Types Toolbox)
 */
export const constructTypesToolbox = (workspace: Blockly.Workspace): any[] => {
    const jsonList: any[] = [];
    const allVars = scanVariablesCategorized(workspace);

    jsonList.push(createLabelJson(Blockly.Msg.LABEL_DEFINITIONS));
    jsonList.push(createBlockJson('c_struct_define'));
    jsonList.push(createBlockJson('c_enum_define'));

    let hasEnums = false;
    if (allVars.userTypes && allVars.userTypes.size > 0) {
        for (const t of allVars.userTypes) {
            if (t.startsWith('enum ')) { hasEnums = true; break; }
        }
    }

    if (allVars.structDefinitions.size > 0 || hasEnums) {
        jsonList.push({ kind: 'sep', gap: 24 });
        jsonList.push(createLabelJson(Blockly.Msg.LABEL_DECLARATIONS));
        if (allVars.structDefinitions.size > 0) jsonList.push(createBlockJson('c_struct_var_declare'));
        if (hasEnums) jsonList.push(createBlockJson('c_enum_var_declare'));
    }

    if (allVars.structs.size > 0 || allVars.enums.size > 0 || allVars.enumItems.size > 0) {
        jsonList.push({ kind: 'sep', gap: 24 });
        jsonList.push(createLabelJson(Blockly.Msg.LABEL_USAGE));
        if (allVars.structs.size > 0) {
            jsonList.push(createBlockJson('c_struct_set_member'));
            jsonList.push(createBlockJson('c_struct_get_member'));
            jsonList.push(createBlockJson('c_struct_get_whole'));
        }
        if (allVars.enums.size > 0) {
            jsonList.push(createBlockJson('c_enum_set'));
            jsonList.push(createBlockJson('c_enum_get'));
        }
        if (allVars.enumItems.size > 0) {
            jsonList.push(createBlockJson('c_enum_value'));
        }
    }
    return jsonList;
};

/**
 * 构建工具工具箱 (Construct Tools Toolbox)
 */
export const constructToolsToolbox = (workspace: Blockly.Workspace): any[] => {
    const jsonList: any[] = [];
    jsonList.push(createLabelJson(Blockly.Msg.LABEL_UTILITIES));
    jsonList.push(createBlockJson('c_include'));
    jsonList.push(createBlockJson('c_sizeof'));

    jsonList.push({ kind: 'sep', gap: 24 });
    jsonList.push(createLabelJson(Blockly.Msg.LABEL_POINTERS));
    jsonList.push(createBlockJson('c_address_of'));
    jsonList.push(createBlockJson('c_dereference'));
    jsonList.push(createBlockJson('c_type_cast'));
    return jsonList;
};
