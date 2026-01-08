// ------------------------------------------------------------------
// 变量模块共享工具 (Variables Module Shared Utilities)
// ------------------------------------------------------------------
// 提供下拉菜单工厂、颜色更新 Mixin 等共享功能，
// 供 variables 子模块使用。
// ------------------------------------------------------------------

// @ts-nocheck
import * as Blockly from 'blockly';
import {
    getVariableGetDropdownOptions, getVariableSetDropdownOptions, getArrayDropdownOptions,
    getStructDropdownOptions, getStructMemberDropdownOptions,
    getMacroDropdownOptions, getEnumDropdownOptions, getEnumItemDropdownOptions, getVarScope,
    scanVariablesCategorized
} from '../../../utils/variable_scanner';
import { FieldDropdownPermissive, FieldDropdownSmart } from '../../../utils/custom_fields';
import { BLOCK_COLORS, getVarScopeColor } from '../../../config/block-colors';

// --- 颜色常量 (导出以保持向后兼容) ---
export const COLOUR_GLOBAL = BLOCK_COLORS.GLOBAL;
export const COLOUR_LOCAL = BLOCK_COLORS.LOCAL;
export const COLOUR_PARAM = BLOCK_COLORS.PARAM;
export const COLOUR_UNKNOWN = BLOCK_COLORS.UNKNOWN;
export const COLOUR_STRUCT = BLOCK_COLORS.STRUCT;
export const COLOUR_MACRO = BLOCK_COLORS.MACRO;

// --- 限定符选项 ---
export const VAR_QUALIFIERS = [
    [Blockly.Msg.ARD_VAR_QUAL_NONE || "(none)", "NONE"],
    ["const", "CONST"],
    ["static", "STATIC"],
    ["volatile", "VOLATILE"]
];

// --- 下拉菜单工厂 ---
export const createDropdown = (block: any, generator: any) => {
    return new FieldDropdownSmart(function () {
        const b = this.sourceBlock_ || block;
        if (!b || !b.workspace) return [[Blockly.Msg.ARD_SMART_LOADING || 'Loading...', 'loading']];
        // Critical Fix: If in Mutator (bubble), use valid workspace to find variables
        // @ts-ignore
        const ws = b.workspace.targetWorkspace || b.workspace;
        return generator(ws, this.getValue(), b);
    });
};

export const appendVarGetDropdown = (block: any) => {
    let inp = block.getInput('DUMMY') || block.appendDummyInput('DUMMY');
    inp.appendField(createDropdown(block, getVariableGetDropdownOptions), 'VAR');
};

export const appendVarSetDropdown = (block: any) => {
    let inp = block.getInput('DUMMY') || block.appendDummyInput('DUMMY');
    inp.appendField(createDropdown(block, getVariableSetDropdownOptions), 'VAR');
};

export const appendArrayDropdown = (block: any) => {
    let inp = block.getInput('DUMMY') || block.appendDummyInput('DUMMY');
    inp.appendField(createDropdown(block, getArrayDropdownOptions), 'VAR');
};

// --- 核心优化：智能联动的结构体下拉 ---
export const appendStructDropdown = (block: any) => {
    const dd = createDropdown(block, getStructDropdownOptions);

    // 同步验证器
    dd.setValidator(function (newVarName: string) {
        const b = this.sourceBlock_;
        if (!b || !b.workspace) return newVarName;

        // 1. 注入临时上下文 (Context Injection)
        b._tempVarContext = newVarName;

        // 2. 强制刷新成员下拉菜单缓存 (Cache Invalidation)
        const memberField = b.getField('MEMBER');
        if (memberField && typeof memberField.refreshOptions === 'function') {
            memberField.refreshOptions();
        }

        const vars = scanVariablesCategorized(b.workspace);
        const structType = vars.variableTypes.get(newVarName);

        if (structType && vars.structDefinitions.has(structType) && memberField) {
            const validMembers = vars.structDefinitions.get(structType) || [];
            const currentMember = b.getFieldValue('MEMBER');

            // 3. 设置新值
            if (validMembers.length > 0) {
                b.setWarningText(null);
                if (!validMembers.includes(currentMember)) {
                    b.setFieldValue(validMembers[0], 'MEMBER');
                }
            } else {
                b.setWarningText(Blockly.Msg.ARD_VAR_STRUCT_NO_MEMBERS);
                b.setFieldValue('no_member', 'MEMBER');
            }
        }

        b._tempVarContext = undefined;
        return newVarName;
    });

    let inp = block.getInput('DUMMY') || block.appendDummyInput('DUMMY');
    inp.appendField(dd, 'VAR');
};

export const appendEnumDropdown = (block: any) => {
    let inp = block.getInput('DUMMY') || block.appendDummyInput('DUMMY');
    inp.appendField(createDropdown(block, getEnumDropdownOptions), 'VAR');
};

export const appendEnumItemDropdown = (block: any) => {
    let inp = block.getInput('DUMMY') || block.appendDummyInput('DUMMY');
    inp.appendField(createDropdown(block, getEnumItemDropdownOptions), 'VAR');
};

export const appendMacroDropdown = (block: any) => {
    let inp = block.getInput('DUMMY') || block.appendDummyInput('DUMMY');
    inp.appendField(createDropdown(block, getMacroDropdownOptions), 'VAR');
};

export const appendMemberDropdown = (block: any) => {
    // Member 使用 Permissive 类型
    const dd = new FieldDropdownPermissive(function () {
        const b = this.sourceBlock_ || block;
        if (!b || !b.workspace) return [[Blockly.Msg.ARD_SMART_SELECT_STRUCT || 'Select Struct', 'none']];

        // 优先使用临时上下文
        let v = b._tempVarContext;
        if (!v) {
            try { v = b.getFieldValue('VAR'); } catch (e) { }
        }

        if (!v || v === 'no_var') return [[Blockly.Msg.ARD_SMART_SELECT_STRUCT_FIRST || 'Select Struct First', 'none']];
        // @ts-ignore
        return getStructMemberDropdownOptions(b.workspace, v, this.getValue());
    });
    let inp = block.getInput('MEMBER_INPUT') || block.appendDummyInput('MEMBER_INPUT');
    inp.appendField(".", "DOT").appendField(dd, 'MEMBER');
};

// --- 颜色更新 Mixin ---
export const ColorUpdateMixin = {
    onchange: function (e: any) {
        if (!this.workspace || this.isInFlyout) return;
        // Optimization/Focus Fix: 
        // DO NOT trigger on BLOCK_CHANGE while typing, as setColour causes re-render and focus loss.
        // BLOCK_MOVE is sufficient for scope category updates.
        if (e.type === Blockly.Events.BLOCK_MOVE || e.type === Blockly.Events.FINISHED_LOADING) {
            const varName = this.getFieldValue('VAR');
            if (varName) {
                const scope = getVarScope(this.workspace, varName);
                const newColour = getVarScopeColor(scope);

                if (this.getColour() !== newColour && newColour !== COLOUR_UNKNOWN) {
                    this.setColour(newColour);
                }
            }
        }
    }
};

