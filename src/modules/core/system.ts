/**
 * ============================================================
 * 系统模块 (System Module)
 * ============================================================
 * 
 * 定义 C/C++ 变量类型系统和函数相关积木:
 * - VAR_TYPES: 基础类型、stdint 类型、指针类型下拉选项
 * - 函数定义 (arduino_functions_def_flexible)
 * - 函数调用 (arduino_functions_call_dynamic)
 * - 参数定义 (arduino_param_def)
 * - 返回语句 (arduino_functions_return)
 * 
 * @file src/modules/core/system.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../generators/arduino-base';
import { getFunctionDropdownOptions } from '../../utils/variable_scanner';
// 引用自定义字段，用于智能下拉菜单
import { FieldDropdownSmart } from '../../utils/custom_fields';


// 基础类型引用 (导出给 variables.ts 使用)
export const VAR_TYPES = [
    // Basic
    ["char", "char"],
    ["unsigned char", "unsigned char"],
    ["int", "int"],
    ["unsigned int", "unsigned int"],
    ["long", "long"],
    ["unsigned long", "unsigned long"],
    ["float", "float"],
    ["double", "double"],
    ["bool", "bool"],
    ["byte", "byte"],
    ["String", "String"],
    ["void", "void"],

    // Stdint
    ["int8_t", "int8_t"], ["uint8_t", "uint8_t"],
    ["int16_t", "int16_t"], ["uint16_t", "uint16_t"],
    ["int32_t", "int32_t"], ["uint32_t", "uint32_t"],
    ["int64_t", "int64_t"], ["uint64_t", "uint64_t"],
    // Pointers (some duplicates with new additions, keeping for now as per instruction's implied structure)
    ["char*", "char*"], ["unsigned char*", "unsigned char*"],
    ["int*", "int*"], ["unsigned int*", "unsigned int*"],
    ["long*", "long*"], ["unsigned long*", "unsigned long*"],
    ["float*", "float*"], ["double*", "double*"], ["bool*", "bool*"],
    ["int8_t*", "int8_t*"], ["uint8_t*", "uint8_t*"],
    ["int16_t*", "int16_t*"], ["uint16_t*", "uint16_t*"],
    ["int32_t*", "int32_t*"], ["uint32_t*", "uint32_t*"],
    ["int64_t*", "int64_t*"], ["uint64_t*", "uint64_t*"],
    ["void*", "void*"]
];

export const FUNC_TYPES = [["void", "void"], ...VAR_TYPES.filter(t => t[0] !== "void")];

const COLOUR_PARAM = 230;
const COLOUR_SETUP = 60;
const COLOUR_LOOP = 20;

// 辅助函数：为积木添加智能函数选择下拉
const appendFunctionDropdown = (block: any) => {
    // 使用 FieldDropdownSmart，当默认值无效时自动修正
    const dropdown = new FieldDropdownSmart(function () {
        const b = this.sourceBlock_ || block;
        if (!b || !b.workspace) return [['(No Funcs)', 'no_func']];
        return getFunctionDropdownOptions(b.workspace, this.getValue());
    });
    let input = block.getInput('DUMMY');
    if (!input) input = block.appendDummyInput('DUMMY');
    input.appendField(dropdown, 'NAME');
};

// ------------------------------------------------------------------
// 系统与函数积木 (System & Function Blocks)
// 包含: Setup, Loop, 函数定义, 函数调用
// ------------------------------------------------------------------
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // --- Setup Block ---


    // --- Parameter Definition ---
    registerBlock('arduino_param_def', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_PARAM)
                .appendField(new Blockly.FieldDropdown(VAR_TYPES as any), "TYPE")
                .appendField(new Blockly.FieldTextInput("arg"), "NAME");
            this.setPreviousStatement(true, "ARDUINO_PARAM");
            this.setNextStatement(true, "ARDUINO_PARAM");
            this.setColour(COLOUR_PARAM);
        },
        onchange: function (e: any) {
            if (!this.workspace || this.isInFlyout) return;

            let block = this;
            let isValid = false;
            while (block) {
                const parent = block.getParent();
                if (parent && parent.type === 'arduino_functions_def_flexible') {
                    const paramsInput = parent.getInput('PARAMS');
                    if (paramsInput && paramsInput.connection === block.previousConnection.targetConnection) {
                        isValid = true;
                    }
                    break;
                }
                block = parent;
            }

            const reason = Blockly.Msg.ARD_SYS_FUNC_PARAM_MSG || 'Must be in Function Params';
            this.setDisabledReason(!isValid, reason);
        }
    }, () => '');

    // --- 函数定义 (Function Definition) ---
    // 支持指定返回类型、函数名、参数列表
    registerBlock('arduino_functions_def_flexible', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_FUNC_DEF)
                .appendField(new Blockly.FieldDropdown(FUNC_TYPES as any), "TYPE")
                .appendField(new Blockly.FieldTextInput("myFunc"), "NAME");
            this.appendStatementInput("PARAMS").setCheck("ARDUINO_PARAM").appendField(Blockly.Msg.ARD_SYS_PARAMS);
            this.appendStatementInput("STACK").setCheck("ARDUINO_BLOCK").appendField(Blockly.Msg.ARD_SYS_BODY);
            this.setColour(290);
        }
    }, function (block: any) {
        const type = block.getFieldValue('TYPE');
        const name = cleanName(block.getFieldValue('NAME'));
        const args = [];
        let p = block.getInputTargetBlock('PARAMS');
        while (p) {
            if (p.isEnabled()) {
                args.push(`${p.getFieldValue('TYPE')} ${cleanName(p.getFieldValue('NAME'))}`);
            }
            p = p.nextConnection?.targetBlock();
        }
        const body = arduinoGenerator.statementToCode(block, 'STACK');
        if (arduinoGenerator.addFunction) {
            const decl = `${type} ${name}(${args.join(', ')})`;
            arduinoGenerator.addFunction('func_' + name, `${decl} {\n${body}}\n`);
            // Auto Prototype handled by function management? 
            // Older logic handled it manually. addFunction should suffice if it handles order.
            // But functionPrototypes_ were separate.
            // Let's check arduino-base.ts finish() logic.
            // Actually, arduino-base.ts likely joins functions separately?
            // If I look at the file...
            // I'll stick to replacing existing logic 1:1 using the new helper if strict.
            // But addFunction replaces `functions_`.

            // Prototype logic:
            if (arduinoGenerator.functionPrototypes_) {
                arduinoGenerator.functionPrototypes_['func_' + name] = `${decl};\n`;
            }
        } else if (arduinoGenerator.functions_) {
            const decl = `${type} ${name}(${args.join(', ')})`;
            arduinoGenerator.functions_['func_' + name] = `${decl} {\n${body}}\n`;
            // Auto Prototype
            if (arduinoGenerator.functionPrototypes_) {
                arduinoGenerator.functionPrototypes_['func_' + name] = `${decl};\n`;
            }
        }
        return null;
    });

    // --- Function Call (Statement) ---
    registerBlock('arduino_functions_call_dynamic', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_SYS_CALL);
            appendFunctionDropdown(this);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(290);
            if (Blockly.icons?.MutatorIcon) {
                this.setMutator(new Blockly.icons.MutatorIcon(['arduino_call_arg_item'], this));
            }
            this.arguments_ = [];
        },
        mutationToDom: function () { const c = Blockly.utils.xml.createElement('mutation'); c.setAttribute('args', this.arguments_.length); return c; },
        domToMutation: function (xml: any) { this.arguments_ = new Array(parseInt(xml.getAttribute('args') || 0)).fill('arg'); this.updateShape_(); },
        saveExtraState: function () {
            return {
                'args': this.arguments_.length
            };
        },
        loadExtraState: function (state: any) {
            const count = state['args'] || 0;
            this.arguments_ = new Array(count).fill('arg');
            this.updateShape_();
        },
        decompose: function (ws: any) { const c = ws.newBlock('arduino_call_arg_container'); c.initSvg(); let conn = c.getInput('STACK').connection; for (let i = 0; i < this.arguments_.length; i++) { const it = ws.newBlock('arduino_call_arg_item'); it.initSvg(); conn.connect(it.previousConnection); conn = it.nextConnection; } return c; },
        compose: function (c: any) { let it = c.getInputTargetBlock('STACK'); const args = []; while (it) { args.push('arg'); it = it.nextConnection?.targetBlock(); } this.arguments_ = args; this.updateShape_(); },
        updateShape_: function () { let i = 0; while (this.getInput('ARG' + i)) { this.removeInput('ARG' + i); i++; } for (let j = 0; j < this.arguments_.length; j++) { this.appendValueInput('ARG' + j).setAlign(Blockly.inputs.Align.RIGHT).appendField(Blockly.Msg.ARD_SYS_ARG + (j + 1)); } }
    }, function (block: any) {
        const name = cleanName(block.getFieldValue('NAME'));
        const args = [];
        let i = 0;
        while (block.getInput('ARG' + i)) {
            args.push(arduinoGenerator.valueToCode(block, 'ARG' + i, Order.NONE) || '0');
            i++;
        }
        return `${name}(${args.join(', ')});\n`;
    });

    // --- Function Call (Return Value) ---
    registerBlock('arduino_functions_call_ret', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_SYS_CALL);
            appendFunctionDropdown(this);
            this.setOutput(true, null);
            this.setColour(290);
            if (Blockly.icons?.MutatorIcon) {
                this.setMutator(new Blockly.icons.MutatorIcon(['arduino_call_arg_item'], this));
            }
            this.arguments_ = [];
        },
        mutationToDom: function () { const c = Blockly.utils.xml.createElement('mutation'); c.setAttribute('args', this.arguments_.length); return c; },
        domToMutation: function (xml: any) { this.arguments_ = new Array(parseInt(xml.getAttribute('args') || 0)).fill('arg'); this.updateShape_(); },
        saveExtraState: function () {
            return {
                'args': this.arguments_.length
            };
        },
        loadExtraState: function (state: any) {
            const count = state['args'] || 0;
            this.arguments_ = new Array(count).fill('arg');
            this.updateShape_();
        },
        decompose: function (ws: any) { const c = ws.newBlock('arduino_call_arg_container'); c.initSvg(); let conn = c.getInput('STACK').connection; for (let i = 0; i < this.arguments_.length; i++) { const it = ws.newBlock('arduino_call_arg_item'); it.initSvg(); conn.connect(it.previousConnection); conn = it.nextConnection; } return c; },
        compose: function (c: any) { let it = c.getInputTargetBlock('STACK'); const args = []; while (it) { args.push('arg'); it = it.nextConnection?.targetBlock(); } this.arguments_ = args; this.updateShape_(); },
        updateShape_: function () { let i = 0; while (this.getInput('ARG' + i)) { this.removeInput('ARG' + i); i++; } for (let j = 0; j < this.arguments_.length; j++) { this.appendValueInput('ARG' + j).setAlign(Blockly.inputs.Align.RIGHT).appendField(Blockly.Msg.ARD_SYS_ARG + (j + 1)); } }
    }, function (block: any) {
        const name = cleanName(block.getFieldValue('NAME'));
        const args = [];
        let i = 0;
        while (block.getInput('ARG' + i)) {
            args.push(arduinoGenerator.valueToCode(block, 'ARG' + i, Order.NONE) || '0');
            i++;
        }
        return [`${name}(${args.join(', ')})`, Order.ATOMIC];
    });


    // ----------------------------------------------------------------
    // 统一入口积木 (Unified Entry Point)
    // 包含 Setup 和 Loop 两个槽位，通常作为程序的根节点
    // ----------------------------------------------------------------
    registerBlock('arduino_entry_root', {
        init: function () {
            // Title Removed as requested
            // Setup Section
            this.appendDummyInput().appendField("⚙ " + Blockly.Msg.ARD_SYS_SETUP).setAlign(Blockly.inputs.Align.RIGHT);
            this.appendStatementInput("SETUP_STACK");
            // Loop Section
            this.appendDummyInput().appendField("↻ " + Blockly.Msg.ARD_SYS_LOOP).setAlign(Blockly.inputs.Align.RIGHT);
            this.appendStatementInput("LOOP_STACK");

            // Aesthetics
            this.setColour('#00979C'); // Arduino Teal

            // Allow deletion and context menu
            this.setDeletable(true);
            this.contextMenu = true;
            this.setMovable(true);
            this.setEditable(true);
            this.duplicatable = false;
        },
        maxInstances: 1
    }, function (block: any) {
        // Does NOT return code directly, but populates strict slots for the file generator
        // However, arduino-base.ts uses explicit `arduino_functions_setup` handling.
        // We need to adapt arduino-base.ts OR make this block output the code segments?
        // Actually, current generator (arduino-base.ts) calls `workspaceToCode`.
        // `workspaceToCode` iterates top blocks.
        // If this is top block, it returns code string.

        // Setup Logic
        const setupBranch = arduinoGenerator.statementToCode(block, 'SETUP_STACK');
        if (arduinoGenerator.userSetupCode_ !== undefined) {
            arduinoGenerator.userSetupCode_ = setupBranch;
        } else {
            // If generator doesn't support property injection, we must return formatted string?
            // But arduino-base.ts is designed to wrap 'code' into Loop?
            // Let's look at arduino-base.ts again.
        }

        // Wait! arduino-base.ts assumes `loopBody = code.trim()`. 
        // If we return the FULL program here (Setup+Loop), arduino-base.ts will wrap IT in `void loop() { ... }`!
        // This is a problem. 
        // We need `arduino-base.ts` to detect if we handled it ourselves.
        // OR we use a flag.

        // Alternative: emulate the old blocks?
        // No.

        // Let's make this block return EMPTY string but populate properties on `arduinoGenerator`.
        arduinoGenerator.userSetupCode_ = setupBranch;
        arduinoGenerator.userLoopCode_ = arduinoGenerator.statementToCode(block, 'LOOP_STACK');

        return '';
    });
    registerBlock('arduino_call_arg_container', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_SYS_INPUTS);
            this.appendStatementInput("STACK");
            this.setColour(290);
            this.contextMenu = false;
        }
    }, () => { return '' });

    registerBlock('arduino_call_arg_item', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_SYS_INPUT);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(290);
            this.contextMenu = false;
        }
    }, () => { return '' });
    registerBlock('arduino_functions_return', { init: function () { this.appendValueInput("VALUE").appendField(Blockly.Msg.ARD_SYS_RETURN); this.setPreviousStatement(true); this.setColour(290); } }, (b) => { return `return ${arduinoGenerator.valueToCode(b, 'VALUE', Order.NONE) || ''};\n` });
};

export const SystemModule: BlockModule = {
    id: 'core.system',
    name: 'System Blocks',
    init
};
