/**
 * ============================================================
 * 变量扫描器核心 (Variable Scanner Core)
 * ============================================================
 * 
 * 扫描 Blockly 工作区中的所有变量定义，构建带作用域层级的变量索引。
 * 
 * 扫描的 Block 类型:
 * - arduino_var_declare: 全局/局部变量
 * - c_macro_define: 宏常量
 * - c_array_define: 数组定义
 * - c_struct_define/c_struct_var_declare: 结构体
 * - c_enum_define/c_enum_var_declare: 枚举
 * - arduino_functions_def_flexible: 函数定义（含参数）
 * 
 * 作用域管理:
 * - globals: 全局变量（在函数外部定义）
 * - functionScopes: 函数作用域（参数和局部变量）
 * - 使用 findParentFunctionBlock 判断当前 Block 的父函数
 * 
 * @file src/utils/scanner/VariableScanner.ts
 * @module EmbedBlocks/Frontend/Utils/Scanner
 */

import * as Blockly from 'blockly';
export interface ScopeInfo {
    params: Set<string>;
    locals: Set<string>;
}

// 全局扫描结果缓存结构
export interface VarCategory {
    globals: Set<string>;
    macros: Set<string>;
    userTypes: Set<string>;
    structs: Set<string>;
    enums: Set<string>;
    enumItems: Set<string>;
    functions: Set<string>;
    arrays: Set<string>;

    // Key: 函数积木的ID, Value: 该函数内部的变量
    functionScopes: Map<string, ScopeInfo>;

    structDefinitions: Map<string, string[]>;
    variableTypes: Map<string, string>;
}

/**
 * 辅助：向上查找当前积木所属的函数定义积木
 */
/**
 * 辅助：向上查找当前积木所属的函数定义积木
 */
export const findParentFunctionBlock = (block: Blockly.Block): Blockly.Block | null => {
    let parent = block.getSurroundParent();
    while (parent) {
        const type = parent.type;
        // 支持标准函数定义、Setup 和 Loop
        if (type === 'arduino_functions_def_flexible' ||
            type === 'arduino_functions_setup' ||
            type === 'arduino_functions_loop') {
            return parent;
        }
        parent = parent.getSurroundParent();
    }
    return null;
};

/**
 * 全量扫描 Workspace，构建带作用域层级的变量索引
 */
export const scanVariablesCategorized = (workspace: Blockly.Workspace): VarCategory => {
    const vars: VarCategory = {
        globals: new Set(), macros: new Set(), userTypes: new Set(),
        structs: new Set(), enums: new Set(), enumItems: new Set(),
        functions: new Set(), arrays: new Set(),
        functionScopes: new Map(),
        structDefinitions: new Map(), variableTypes: new Map()
    };

    if (!workspace) return vars;

    const blocks = workspace.getAllBlocks(false);
    console.log(`[VariableScanner] Scanning workspace ${workspace.id} - ${blocks.length} blocks found.`);

    // 第一遍：初始化所有函数的作用域容器
    for (const block of blocks) {
        if (['arduino_functions_def_flexible', 'arduino_functions_setup', 'arduino_functions_loop'].includes(block.type)) {
            vars.functionScopes.set(block.id, { params: new Set(), locals: new Set() });
        }
    }

    // 第二遍：详细扫描
    for (const block of blocks) {
        const type = block.type;
        const isEnabled = block.isEnabled();

        // Definitions should still be initialized even if disabled by validation
        if (!isEnabled) {
            // @ts-ignore
            if (!block._disabledByValidation) {
                // @ts-ignore
                if (typeof block.getDisabledReason === 'function' && !block.getDisabledReason('validation_error')) {
                    continue;
                }
            }
        }

        // --- Global Definitions ---
        if (type === 'arduino_functions_def_flexible') {
            const name = block.getFieldValue('NAME');
            if (name) vars.functions.add(name);

            // Scan params
            const scope = vars.functionScopes.get(block.id);
            if (scope) {
                let paramBlock = block.getInputTargetBlock('PARAMS');
                while (paramBlock) {
                    const isParamEnabled = paramBlock.isEnabled();
                    let isEligible = isParamEnabled;
                    if (!isParamEnabled) {
                        // @ts-ignore
                        if (paramBlock._disabledByValidation || (typeof paramBlock.getDisabledReason === 'function' && paramBlock.getDisabledReason('validation_error'))) {
                            isEligible = true;
                        }
                    }

                    if (paramBlock.type === 'arduino_param_def' && isEligible) {
                        const pName = paramBlock.getFieldValue('NAME');
                        if (pName) scope.params.add(pName);
                    }
                    paramBlock = paramBlock.nextConnection?.targetBlock();
                }
            }
        }
        else if (type === 'c_struct_define') {
            const name = block.getFieldValue('NAME');
            if (name) {
                vars.userTypes.add("struct " + name);
                const members: string[] = [];
                if (Array.isArray((block as any).members_)) {
                    for (const m of (block as any).members_) { if (m && m.name) members.push(m.name); }
                }
                vars.structDefinitions.set(name, members);
            }
        }
        else if (type === 'c_enum_define') {
            const name = block.getFieldValue('NAME');
            if (name) {
                vars.userTypes.add("enum " + name);
            }

            const items = (block as any).items_ || (block as any).extraState?.items;
            if (Array.isArray(items)) {
                items.forEach((item: any) => {
                    if (item && item.name) vars.enumItems.add(item.name);
                });
            }
        }
        else if (type === 'arduino_var_declare') {
            const name = block.getFieldValue('VAR');
            const varType = block.getFieldValue('TYPE');
            if (name) {
                vars.variableTypes.set(name, varType);
                const parentFunc = findParentFunctionBlock(block);
                if (parentFunc) {
                    const scope = vars.functionScopes.get(parentFunc.id);
                    if (scope) scope.locals.add(name);
                } else {
                    vars.globals.add(name);
                }
            }
        }
        else if (type === 'c_macro_define') {
            const name = block.getFieldValue('NAME');
            if (name) vars.macros.add(name);
        }
        else if (type === 'c_array_define') {
            const name = block.getFieldValue('VAR');
            if (name) vars.arrays.add(name);
        }
        else if (type === 'c_struct_var_declare') {
            const name = block.getFieldValue('VAR');
            const structName = block.getFieldValue('STRUCT_NAME');
            if (name) {
                vars.variableTypes.set(name, structName);
                vars.structs.add(name);
            }
        }
        else if (type === 'c_enum_var_declare') {
            const name = block.getFieldValue('VAR');
            const enumName = block.getFieldValue('ENUM_NAME');
            if (name) {
                vars.variableTypes.set(name, enumName);
                vars.enums.add(name);
            }
        }
    }

    return vars;
};

/**
 * 辅助：确保当前值在下拉选项中
 */
export const ensureCurrentValue = (options: [string, string][], currentValue: string | undefined, defaultText: string, defaultVal: string): [string, string][] => {
    if (currentValue && currentValue !== defaultVal && currentValue !== '') {
        const exists = options.some(opt => opt[1] === currentValue);
        if (!exists) options.unshift([currentValue, currentValue]);
    }
    if (options.length === 0) return [[`(${defaultText})`, defaultVal]];
    return options;
};
