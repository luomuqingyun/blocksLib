/**
 * ============================================================
 * 变量扫描器 (Variable Scanner)
 * ============================================================
 * 
 * 负责扫描工作区中的所有变量定义、函数声明及复合类型（结构体、枚举、宏）。
 * 
 * 功能：
 * - 扫描全局变量、宏定义 (#define)
 * - 扫描结构体 (struct) 和枚举 (enum) 定义
 * - 扫描函数声明及函数内部局部变量 (Scope Analysis)
 * - 为下拉菜单提供数据源 (getFunctionDropdownOptions 等)
 * 
 * 此文件整合了原有的 variable_scanner.ts 逻辑。
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
 * 扫描并按类别组织当前工作区的所有变量 (Scan Variables Categorized)
 * 
 * 扫描内容包括:
 * - globals: 全局基础类型变量名集合
 * - arrays: 数组变量名集合
 * - structs: 结构体实例名集合
 * - enums: 枚举变量名集合
 * - macros: #define 宏常量集合
 * - functions: 已定义的函数名集合
 * - enumItems: 所有已知的枚举成员名集合
 * - userTypes: 用户自定义类型 (struct XXX, enum YYY)
 * - structDefinitions: 结构体类型名与其成员列表的映射
 * - variableTypes: 变量名与其类型名的映射
 * - functionScopes: 函数 ID 与其内部可见变量 (params, locals) 的映射
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
    // 第二遍：详细扫描所有积木，提取变量、类型和作用域信息
    for (const block of blocks) {
        const type = block.type;
        const isEnabled = block.isEnabled();

        // 如果积木被禁用，通常跳过。
        // 但如果是因为校验失败（validation_error）而被禁用，我们仍然需要提取其定义，
        // 以避免在编辑器中显示不必要的“未定义”错误。
        if (!isEnabled) {
            // @ts-ignore
            if (!block._disabledByValidation) {
                // @ts-ignore
                if (typeof block.getDisabledReason === 'function' && !block.getDisabledReason('validation_error')) {
                    continue;
                }
            }
        }

        // --- 处理全局定义与函数作用域 ---

        // 情况 1: 函数定义 (支持参数扫描)
        if (type === 'arduino_functions_def_flexible') {
            const name = block.getFieldValue('NAME');
            if (name) vars.functions.add(name);

            // 扫描函数参数，并存入对应的函数作用域中
            const scope = vars.functionScopes.get(block.id);
            if (scope) {
                let paramBlock = block.getInputTargetBlock('PARAMS');
                while (paramBlock) {
                    const isParamEnabled = paramBlock.isEnabled();
                    let isEligible = isParamEnabled;
                    // 同样处理参数积木的校验禁用状态
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
        // 情况 2: 结构体定义
        else if (type === 'c_struct_define') {
            const name = block.getFieldValue('NAME');
            if (name) {
                vars.userTypes.add("struct " + name);
                const members: string[] = [];
                // 提取结构体成员变量名，用于成员自动补全
                if (Array.isArray((block as any).members_)) {
                    for (const m of (block as any).members_) { if (m && m.name) members.push(m.name); }
                }
                vars.structDefinitions.set(name, members);
            }
        }
        // 情况 3: 枚举定义
        else if (type === 'c_enum_define') {
            const name = block.getFieldValue('NAME');
            if (name) {
                vars.userTypes.add("enum " + name);
            }

            // 扫描枚举项并在全局范围内注册它们，因为 C++ 枚举项在同一作用域内是全局可见的
            const items = (block as any).items_ || (block as any).extraState?.items;
            if (Array.isArray(items)) {
                items.forEach((item: any) => {
                    if (item && item.name) vars.enumItems.add(item.name);
                });
            }
        }
        // 情况 4: 普通变量声明
        else if (type === 'arduino_var_declare') {
            const name = block.getFieldValue('VAR');
            const varType = block.getFieldValue('TYPE');
            if (name) {
                vars.variableTypes.set(name, varType);
                // 判断变量属于全局还是局部作用域
                const parentFunc = findParentFunctionBlock(block);
                if (parentFunc) {
                    const scope = vars.functionScopes.get(parentFunc.id);
                    if (scope) scope.locals.add(name); // 局部变量
                } else {
                    vars.globals.add(name); // 全局变量
                }
            }
        }
        // 情况 5: 宏定义
        else if (type === 'c_macro_define') {
            const name = block.getFieldValue('NAME');
            if (name) vars.macros.add(name);
        }
        // 情况 6: 数组定义
        else if (type === 'c_array_define') {
            const name = block.getFieldValue('VAR');
            if (name) vars.arrays.add(name);
        }
        // 情况 7: 结构体变量声明
        else if (type === 'c_struct_var_declare') {
            const name = block.getFieldValue('VAR');
            const structName = block.getFieldValue('STRUCT_NAME');
            if (name) {
                vars.variableTypes.set(name, structName);
                vars.structs.add(name);
            }
        }
        // 情况 8: 枚举变量声明
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
 * 递归查找当前积木所属的父级函数积木 (Function Block Finder)
 * 用于确定代码生成或变量访问时的上下文作用域。
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
 * 辅助函数：确保下拉菜单中包含当前已选的值 (Ensure Current Value)
 * 
 * 在动态生成下拉菜单时，如果当前存储在积木中的值因某些原因 (如删除定义) 
 * 不在最新生成的选项列表中，此函数会将其手动加入并标记为 [无效]，
 * 从而允许用户看到错误状态并重新选择。
 * 
 * @param options 已生成的选项列表 [[显示文本, 实际值], ...]
 * @param currentValue 积木当前存储的值
 * @param emptyLabel 当列表为空时的提示标签
 * @param emptyValue 当列表为空时的回退值
 */
export const ensureCurrentValue = (
    options: [string, string][],
    currentValue?: string,
    emptyLabel: string = 'No Items',
    emptyValue: string = 'none'
): [string, string][] => {
    if (options.length === 0) {
        return [[`(${emptyLabel})`, emptyValue]];
    }

    if (currentValue && currentValue !== emptyValue && currentValue !== '') {
        const exists = options.some(opt => opt[1] === currentValue);
        if (!exists) {
            options.unshift([`[无效] ${currentValue}`, currentValue]);
        }
    }

    return options;
};

/**
 * 下拉菜单数据提供逻辑
 * 这些函数负责将底层的扫描数据（VariableScanner）桥接到 Blockly 的下拉列表字段中。
 */

// 获取所有已定义的函数列表
export const getFunctionDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { functions } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(functions).sort().forEach(name => options.push([`${name}()`, name]));
    return ensureCurrentValue(options, currentValue, '暂无函数', 'no_func');
};

/**
 * 核心改进：根据当前积木 (Block) 的物理位置，智能获取对其可见的变量。
 * 实现变量作用域（Scope）的核心逻辑：
 * 1. 始终包含全局变量和宏。
 * 2. 如果积木处于某个函数内，则包含该函数的参数和局部变量。
 */
export const getContextAwareVariables = (workspace: Blockly.Workspace, currentBlock: Blockly.Block | null) => {
    const allVars = scanVariablesCategorized(workspace);

    // 1. 基础可见：全局变量和宏
    const visibleGlobals = new Set(allVars.globals);
    const visibleMacros = new Set(allVars.macros);
    let visibleParams = new Set<string>();
    let visibleLocals = new Set<string>();

    // 2. 上下文判断：如果积木被嵌套在某个函数内
    if (currentBlock) {
        const parentFunc = findParentFunctionBlock(currentBlock);
        if (parentFunc) {
            const scope = allVars.functionScopes.get(parentFunc.id);
            if (scope) {
                visibleParams = scope.params;
                visibleLocals = scope.locals;
            }
        }
    }

    return {
        visibleGlobals,
        visibleMacros,
        visibleParams,
        visibleLocals,
        // 返回需要被排除的特殊类型变量集合（这些类型有专门的读写积木）
        structs: allVars.structs,
        enums: allVars.enums,
        arrays: allVars.arrays
    };
};

// 为“读取变量”积木生成下拉菜单选项
export const getVariableGetDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string, currentBlock?: Blockly.Block): [string, string][] => {
    const { visibleGlobals, visibleMacros, visibleParams, visibleLocals, structs, enums, arrays } = getContextAwareVariables(workspace, currentBlock || null);

    const options: [string, string][] = [];
    const seen = new Set<string>();

    // 排除特殊类型的实例，因为它们使用专门的成员访问积木
    const isSpecialType = (name: string) => structs.has(name) || enums.has(name) || arrays.has(name);

    const add = (prefix: string, name: string) => {
        if (!seen.has(name) && !isSpecialType(name)) {
            options.push([`${prefix} ${name}`, name]);
            seen.add(name);
        }
    };

    // 按优先级添加：参数 > 局部变量 > 全局变量 > 宏常量
    Array.from(visibleParams).sort().forEach(n => add("[参数]", n));
    Array.from(visibleLocals).sort().forEach(n => add("[局部]", n));
    Array.from(visibleGlobals).sort().forEach(n => add("[全局]", n));
    Array.from(visibleMacros).sort().forEach(n => add("[常量]", n));

    return ensureCurrentValue(options, currentValue, '暂无变量', 'no_var');
};

// 为“设置变量”积木生成下拉菜单选项（常量不可被设置）
export const getVariableSetDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string, currentBlock?: Blockly.Block): [string, string][] => {
    const { visibleGlobals, visibleParams, visibleLocals, structs, enums, arrays } = getContextAwareVariables(workspace, currentBlock || null);

    const options: [string, string][] = [];
    const seen = new Set<string>();

    const isSpecialType = (name: string) => structs.has(name) || enums.has(name) || arrays.has(name);

    const add = (prefix: string, name: string) => {
        if (!seen.has(name) && !isSpecialType(name)) {
            options.push([`${prefix} ${name}`, name]);
            seen.add(name);
        }
    };

    Array.from(visibleParams).sort().forEach(n => add("[参数]", n));
    Array.from(visibleLocals).sort().forEach(n => add("[局部]", n));
    Array.from(visibleGlobals).sort().forEach(n => add("[全局]", n));

    return ensureCurrentValue(options, currentValue, '暂无变量', 'no_var');
};

// 获取数组列表
export const getArrayDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { arrays } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(arrays).sort().forEach(name => options.push([`[数组] ${name}`, name]));
    return ensureCurrentValue(options, currentValue, '暂无数组', 'no_arr');
};

// 获取结构体实例列表
export const getStructDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { structs } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(structs).sort().forEach(name => options.push([`[结构体] ${name}`, name]));
    return ensureCurrentValue(options, currentValue, '暂无结构体', 'no_struct');
};

// 获取枚举实例列表
export const getEnumDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { enums } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(enums).sort().forEach(name => options.push([`[枚举] ${name}`, name]));
    return ensureCurrentValue(options, currentValue, '暂无枚举', 'no_enum');
};

// 获取所有的枚举成员（Item）列表
export const getEnumItemDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { enumItems } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(enumItems).sort().forEach(name => options.push([`${name}`, name]));
    return ensureCurrentValue(options, currentValue, '暂无枚举项', 'no_item');
};

// 获取宏定义列表
export const getMacroDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { macros } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(macros).sort().forEach(name => options.push([`[常量] ${name}`, name]));
    return ensureCurrentValue(options, currentValue, '暂无宏', 'no_const');
};

/**
 * 获取特定结构体变量的成员列表。
 * 如果已知其类型，则只显示该类型的成员；否则显示全局所有结构体成员作为回退方案。
 */
export const getStructMemberDropdownOptions = (workspace: Blockly.Workspace, varName: string, currentMember?: string): [string, string][] => {
    const { structDefinitions, variableTypes } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];

    // 根据变量名获取其注册的结构体类型名
    const typeName = variableTypes.get(varName);
    if (typeName && structDefinitions.has(typeName)) {
        // 情况 A: 找到具体的成员定义
        const members = structDefinitions.get(typeName) || [];
        const seen = new Set<string>();
        members.forEach(mem => {
            if (!seen.has(mem)) {
                options.push([mem, mem]);
                seen.add(mem);
            }
        });
    } else {
        // 情况 B: 未找到类型（可能尚未扫描到声明），显示全局所有已知的结构体成员
        const allMembers = new Set<string>();
        structDefinitions.forEach((members) => members.forEach(m => allMembers.add(m)));
        const seen = new Set<string>();
        allMembers.forEach(mem => {
            if (!seen.has(mem)) {
                options.push([mem, mem]);
                seen.add(mem);
            }
        });
    }

    return ensureCurrentValue(options, currentMember, '暂无成员', 'member');
};

// 获取用户自定义类型（struct XXX, enum YYY）的列表
export const getUserTypesDropdownOptions = (workspace: Blockly.Workspace, baseTypesOrCurrent: string[][] | string): [string, string][] => {
    const { userTypes } = scanVariablesCategorized(workspace);
    let options: [string, string][] = [];

    if (Array.isArray(baseTypesOrCurrent)) {
        options = [...(baseTypesOrCurrent as [string, string][])];
    }
    userTypes.forEach(type => options.push([type, type]));
    return options;
};

// 工具函数：根据变量名判断其所属的作用域级别
export const getVarScope = (workspace: Blockly.Workspace, varName: string): string => {
    const { globals, arrays, macros, structs, enums, functionScopes } = scanVariablesCategorized(workspace);

    if (globals.has(varName)) return 'GLOBAL';
    if (arrays.has(varName)) return 'GLOBAL';
    if (macros.has(varName)) return 'MACRO';
    if (structs.has(varName)) return 'GLOBAL';
    if (enums.has(varName)) return 'GLOBAL';

    let isLocal = false;
    let isParam = false;

    // 检查是否在任何一个函数作用域中被标记为参数或局部变量
    functionScopes.forEach(scope => {
        if (scope.locals.has(varName)) isLocal = true;
        if (scope.params.has(varName)) isParam = true;
    });

    if (isParam) return 'PARAM';
    if (isLocal) return 'LOCAL';

    return 'UNKNOWN';
};
