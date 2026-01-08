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
 * Dropdown Data Provisioning Logic
 * These functions bridge the raw scan data to Blockly's dropdown fields.
 */

export const getFunctionDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { functions } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(functions).sort().forEach(name => options.push([`${name}()`, name]));
    return ensureCurrentValue(options, currentValue, 'No Funcs', 'no_func');
};

/**
 * 核心改进：根据当前 Block 的位置，智能获取可见变量
 */
const getContextAwareVariables = (workspace: Blockly.Workspace, currentBlock: Blockly.Block | null) => {
    const allVars = scanVariablesCategorized(workspace);

    // 1. 基础可见：全局变量和宏
    const visibleGlobals = new Set(allVars.globals);
    const visibleMacros = new Set(allVars.macros);
    let visibleParams = new Set<string>();
    let visibleLocals = new Set<string>();

    // 2. 上下文判断：如果在函数内，添加该函数的参数和局部变量
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
        // 返回需要被排除的特殊类型变量集合
        structs: allVars.structs,
        enums: allVars.enums,
        arrays: allVars.arrays
    };
};

export const getVariableGetDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string, currentBlock?: Blockly.Block): [string, string][] => {
    const { visibleGlobals, visibleMacros, visibleParams, visibleLocals, structs, enums, arrays } = getContextAwareVariables(workspace, currentBlock || null);

    const options: [string, string][] = [];
    const seen = new Set<string>();

    const isSpecialType = (name: string) => structs.has(name) || enums.has(name) || arrays.has(name);

    const add = (prefix: string, name: string) => {
        if (!seen.has(name) && !isSpecialType(name)) {
            options.push([`${prefix} ${name}`, name]);
            seen.add(name);
        }
    };

    Array.from(visibleParams).sort().forEach(n => add("[Param]", n));
    Array.from(visibleLocals).sort().forEach(n => add("[Local]", n));
    Array.from(visibleGlobals).sort().forEach(n => add("[Global]", n));
    // Macros (Constants) can be used as variables
    Array.from(visibleMacros).sort().forEach(n => add("[Const]", n));

    return ensureCurrentValue(options, currentValue, 'No Vars', 'no_var');
};

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

    Array.from(visibleParams).sort().forEach(n => add("[Param]", n));
    Array.from(visibleLocals).sort().forEach(n => add("[Local]", n));
    Array.from(visibleGlobals).sort().forEach(n => add("[Global]", n));

    return ensureCurrentValue(options, currentValue, 'No Vars', 'no_var');
};

export const getArrayDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { arrays } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(arrays).sort().forEach(name => options.push([`[Arr] ${name}`, name]));
    return ensureCurrentValue(options, currentValue, 'No Arrays', 'no_arr');
};

export const getStructDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { structs } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(structs).sort().forEach(name => options.push([`[Struct] ${name}`, name]));
    return ensureCurrentValue(options, currentValue, 'No Structs', 'no_struct');
};

export const getEnumDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { enums } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(enums).sort().forEach(name => options.push([`[Enum] ${name}`, name]));
    return ensureCurrentValue(options, currentValue, 'No Enums', 'no_enum');
};

export const getEnumItemDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { enumItems } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(enumItems).sort().forEach(name => options.push([`${name}`, name]));
    return ensureCurrentValue(options, currentValue, 'No Items', 'no_item');
};

export const getMacroDropdownOptions = (workspace: Blockly.Workspace, currentValue?: string): [string, string][] => {
    const { macros } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];
    Array.from(macros).sort().forEach(name => options.push([`[Const] ${name}`, name]));
    return ensureCurrentValue(options, currentValue, 'No Consts', 'no_const');
};

export const getStructMemberDropdownOptions = (workspace: Blockly.Workspace, varName: string, currentMember?: string): [string, string][] => {
    const { structDefinitions, variableTypes } = scanVariablesCategorized(workspace);
    const options: [string, string][] = [];

    const typeName = variableTypes.get(varName);
    if (typeName && structDefinitions.has(typeName)) {
        const members = structDefinitions.get(typeName) || [];
        const seen = new Set<string>();
        members.forEach(mem => {
            if (!seen.has(mem)) {
                options.push([mem, mem]);
                seen.add(mem);
            }
        });
    } else {
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

    return ensureCurrentValue(options, currentMember, 'No Members', 'member');
};

export const getUserTypesDropdownOptions = (workspace: Blockly.Workspace, baseTypesOrCurrent: string[][] | string): [string, string][] => {
    const { userTypes } = scanVariablesCategorized(workspace);
    let options: [string, string][] = [];

    if (Array.isArray(baseTypesOrCurrent)) {
        options = [...(baseTypesOrCurrent as [string, string][])];
    }
    userTypes.forEach(type => options.push([type, type]));
    return options;
};

export const getVarScope = (workspace: Blockly.Workspace, varName: string): string => {
    const { globals, arrays, macros, structs, enums, functionScopes } = scanVariablesCategorized(workspace);

    if (globals.has(varName)) return 'GLOBAL';
    if (arrays.has(varName)) return 'GLOBAL';
    if (macros.has(varName)) return 'MACRO';
    if (structs.has(varName)) return 'GLOBAL';
    if (enums.has(varName)) return 'GLOBAL';

    let isLocal = false;
    let isParam = false;

    functionScopes.forEach(scope => {
        if (scope.locals.has(varName)) isLocal = true;
        if (scope.params.has(varName)) isParam = true;
    });

    if (isParam) return 'PARAM';
    if (isLocal) return 'LOCAL';

    return 'UNKNOWN';
};
