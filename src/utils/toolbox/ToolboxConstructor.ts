/**
 * ============================================================
 * 工具箱动态构建器 (Toolbox Constructor)
 * ============================================================
 * 
 * 根据工作区中已定义的变量，动态生成工具箱内容。
 * 用于 Blockly 的 registerToolboxCategoryCallback。
 * 
 * 构建函数:
 * - constructVariablesToolbox(): 变量分类（变量声明、宏、数组的 Get/Set）
 * - constructTypesToolbox(): 类型分类（结构体、枚举的定义和使用）
 * - constructToolsToolbox(): 工具分类（指针操作、sizeof、类型转换）
 * 
 * 特点:
 * - 只有在工作区中定义了相应类型后，相关的 Get/Set 积木才会出现
 * - 支持带有 Shadow Block 的输入预设
 * 
 * @file src/utils/toolbox/ToolboxConstructor.ts
 * @module EmbedBlocks/Frontend/Utils/Toolbox
 */

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
    // 添加 "声明变量" 和 "声明宏" 按钮
    jsonList.push(createBlockJson('arduino_var_declare'));
    jsonList.push(createBlockJson('c_macro_define'));

    const hasVars = allVars.globals.size > 0 || allVars.macros.size > 0 || allVars.functionScopes.size > 0;

    // 只有当工作区中存在定义的变量时，才显示变量的“设置”和“读取”积木
    if (hasVars) {
        jsonList.push(createBlockJson('arduino_var_set_dynamic'));
        jsonList.push(createBlockJson('arduino_var_get_dynamic'));
    }
    // 只有当存在宏定义时，才显示宏读取积木
    if (allVars.macros.size > 0) jsonList.push(createBlockJson('c_macro_get'));

    jsonList.push({ kind: 'sep', gap: 24 });
    jsonList.push(createLabelJson(Blockly.Msg.LABEL_ARRAYS));

    // 数组定义积木，预设大小为 10 的 Shadow Block
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

    // 只有当工作区存在数组定义时，才显示数组元素的读写和整体获取积木
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
 * 构建数据类型 (结构体/枚举) 工具箱
 */
export const constructTypesToolbox = (workspace: Blockly.Workspace): any[] => {
    const jsonList: any[] = [];
    const allVars = scanVariablesCategorized(workspace);

    // 1. 类型定义部分
    jsonList.push(createLabelJson(Blockly.Msg.LABEL_DEFINITIONS));
    jsonList.push(createBlockJson('c_struct_define'));
    jsonList.push(createBlockJson('c_enum_define'));

    // 检查是否存在已定义的枚举类型
    let hasEnums = false;
    if (allVars.userTypes && allVars.userTypes.size > 0) {
        for (const t of allVars.userTypes) {
            if (t.startsWith('enum ')) { hasEnums = true; break; }
        }
    }

    // 2. 变量声明部分（只有定义了类型后，才显示对应声明积木）
    if (allVars.structDefinitions.size > 0 || hasEnums) {
        jsonList.push({ kind: 'sep', gap: 24 });
        jsonList.push(createLabelJson(Blockly.Msg.LABEL_DECLARATIONS));
        if (allVars.structDefinitions.size > 0) jsonList.push(createBlockJson('c_struct_var_declare')); // 结构体声明
        if (hasEnums) jsonList.push(createBlockJson('c_enum_var_declare')); // 枚举声明
    }

    // 3. 成员访问与使用部分
    if (allVars.structs.size > 0 || allVars.enums.size > 0 || allVars.enumItems.size > 0) {
        jsonList.push({ kind: 'sep', gap: 24 });
        jsonList.push(createLabelJson(Blockly.Msg.LABEL_USAGE));
        if (allVars.structs.size > 0) {
            jsonList.push(createBlockJson('c_struct_set_member')); // 设置结构体成员
            jsonList.push(createBlockJson('c_struct_get_member')); // 读取结构体成员
            jsonList.push(createBlockJson('c_struct_get_whole'));  // 获取结构体整体
        }
        if (allVars.enums.size > 0) {
            jsonList.push(createBlockJson('c_enum_set')); // 设置枚举变量
            jsonList.push(createBlockJson('c_enum_get')); // 读取枚举变量
        }
        if (allVars.enumItems.size > 0) {
            jsonList.push(createBlockJson('c_enum_value')); // 具体的枚举常量值
        }
    }
    return jsonList;
};

/**
 * 构建指针与底层工具分类
 */
export const constructToolsToolbox = (workspace: Blockly.Workspace): any[] => {
    const jsonList: any[] = [];
    // 常用 C 语言工具：包含头文件、sizeof 运行长度
    jsonList.push(createLabelJson(Blockly.Msg.LABEL_UTILITIES));
    jsonList.push(createBlockJson('c_include'));
    jsonList.push(createBlockJson('c_sizeof'));

    jsonList.push({ kind: 'sep', gap: 24 });
    // C 指针进阶操作
    jsonList.push(createLabelJson(Blockly.Msg.LABEL_POINTERS));
    jsonList.push(createBlockJson('c_address_of'));  // 取地址 &
    jsonList.push(createBlockJson('c_dereference')); // 取内容 *
    jsonList.push(createBlockJson('c_type_cast'));   // 强制类型转换
    return jsonList;
};
