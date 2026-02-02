/**
 * ============================================================
 * 变量扫描与下拉菜单生成 (Variable Scanner & Dropdown Generator)
 * ============================================================
 * 
 * 扫描 Blockly 工作区中的变量定义，为下拉菜单提供数据源。
 * 支持上下文感知的变量可见性（函数作用域内可见参数和局部变量）。
 * 
 * 扫描的变量类型:
 * - globals: 全局变量
 * - arrays: 数组
 * - structs: 结构体实例
 * - enums: 枚举类型
 * - macros: 宏常量
 * - functions: 函数定义
 * - functionScopes: 函数作用域（参数和局部变量）
 * 
 * 下拉菜单生成函数:
 * - getFunctionDropdownOptions(): 函数列表
 * - getVariableGetDropdownOptions(): 可读变量列表（上下文感知）
 * - getVariableSetDropdownOptions(): 可写变量列表（上下文感知）
 * - getArrayDropdownOptions(): 数组列表
 * - getStructDropdownOptions(): 结构体列表
 * - getEnumDropdownOptions(): 枚举列表
 * - getEnumItemDropdownOptions(): 枚举成员列表
 * - getMacroDropdownOptions(): 宏常量列表
 * - getStructMemberDropdownOptions(): 结构体成员列表
 * 
 * @file src/utils/variable_scanner.ts
 * @module EmbedBlocks/Frontend/Utils
 */

import * as Blockly from 'blockly';
import {
    scanVariablesCategorized,
    findParentFunctionBlock,
    ensureCurrentValue
} from './scanner/VariableScanner';

// Re-export core scanning functionality for backward compatibility
export { scanVariablesCategorized, findParentFunctionBlock, ensureCurrentValue };
export type { VarCategory, ScopeInfo } from './scanner/VariableScanner';

// Re-export toolbox construction for backward compatibility
export {
    constructVariablesToolbox,
    constructTypesToolbox,
    constructToolsToolbox
} from './toolbox/ToolboxConstructor';

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
const getContextAwareVariables = (workspace: Blockly.Workspace, currentBlock: Blockly.Block | null) => {
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
