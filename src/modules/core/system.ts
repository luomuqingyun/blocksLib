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
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * C/C++ 变量类型定义
 * 用于变量声明、函数返回类型以及参数类型的下拉选择。
 * 包含基础类型 (int, float)、stdint 标准类型 (uint8_t) 以及对应的指针类型。
 */
export const VAR_TYPES = [
    // 基础类型 (Arduino/C 常用)
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

    // Stdint 类型 (跨平台开发推荐)
    ["int8_t", "int8_t"], ["uint8_t", "uint8_t"],
    ["int16_t", "int16_t"], ["uint16_t", "uint16_t"],
    ["int32_t", "int32_t"], ["uint32_t", "uint32_t"],
    ["int64_t", "int64_t"], ["uint64_t", "uint64_t"],

    // 指针类型 (用于高级操作和库调用)
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

/** 函数返回类型列表 (过滤掉 void 后加入 variables 列表) */
export const FUNC_TYPES = [["void", "void"], ...VAR_TYPES.filter(t => t[0] !== "void")];

const COLOUR_PARAM = 230;
const COLOUR_SETUP = 60;
const COLOUR_LOOP = 20;

/**
 * 辅助函数：为积木添加智能函数选择下拉。
 * 能够自动扫描当前工作区所有已定义的函数积木，并生成下拉列表。
 * 当选中的函数被删除时，下拉菜单能自动回退到默认选项。
 */
const appendFunctionDropdown = (block: any) => {
    // 使用 FieldDropdownSmart，支持动态刷新和无效值自动修正
    const dropdown = new FieldDropdownSmart(function () {
        const b = this.sourceBlock_ || block;
        if (!b || !b.workspace) return [['(No Funcs)', 'no_func']];
        // getFunctionDropdownOptions 从 variable_scanner 中获取所有函数块的名字
        return getFunctionDropdownOptions(b.workspace, this.getValue());
    });
    let input = block.getInput('DUMMY');
    if (!input) input = block.appendDummyInput('DUMMY');
    input.appendField(dropdown, 'NAME');
};

/**
 * 系统模块初始化
 * 注册 Arduino 程序的生命周期积木以及底层 C++ 函数封装积木。
 */
const init = () => {

    // =========================================================================
    // 参数定义积木 (Parameter Definition)
    // 嵌套在函数定义积木的参数槽位中。
    // =========================================================================
    registerBlock('arduino_param_def', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_PARAM) // 参数
                .appendField(new Blockly.FieldDropdown(VAR_TYPES as any), "TYPE")
                .appendField(new Blockly.FieldTextInput("arg"), "NAME");
            this.setPreviousStatement(true, "ARDUINO_PARAM");
            this.setNextStatement(true, "ARDUINO_PARAM");
            this.setColour(COLOUR_PARAM);
        },
        onchange: function (e: any) {
            if (!this.workspace || this.isInFlyout) return;

            // 逻辑校验：参数积木必须放置在函数定义的参数槽内，否则显示错误状态
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

    // =========================================================================
    // 函数定义 (Function Definition)
    // 生成对应的 C++ 函数声明、函数首部、函数体以及自动生成函数原型 (Prototype)。
    // =========================================================================
    registerBlock('arduino_functions_def_flexible', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_FUNC_DEF) // 定义函数
                .appendField(new Blockly.FieldDropdown(FUNC_TYPES as any), "TYPE")
                .appendField(new Blockly.FieldTextInput("myFunc"), "NAME");
            this.appendStatementInput("PARAMS").setCheck("ARDUINO_PARAM").appendField(Blockly.Msg.ARD_SYS_PARAMS); // 参数列表
            this.appendStatementInput("STACK").setCheck("ARDUINO_BLOCK").appendField(Blockly.Msg.ARD_SYS_BODY); // 执行内容
            this.setColour(290);
        }
    }, function (block: any) {
        const type = block.getFieldValue('TYPE');
        const name = cleanName(block.getFieldValue('NAME'));
        const args = [];

        // 遍历参数列表积木链
        let p = block.getInputTargetBlock('PARAMS');
        while (p) {
            if (p.isEnabled()) {
                args.push(`${p.getFieldValue('TYPE')} ${cleanName(p.getFieldValue('NAME'))}`);
            }
            p = p.nextConnection?.targetBlock();
        }

        const body = arduinoGenerator.statementToCode(block, 'STACK');
        const decl = `${type} ${name}(${args.join(', ')})`;

        // 将函数体注入全局代码池
        if (arduinoGenerator.functions_) {
            arduinoGenerator.functions_['func_' + name] = `${decl} {\n${body}}\n`;
            // 同时在 setup() 前生成函数原型，防止因调用顺序导致的编译错误
            if (arduinoGenerator.functionPrototypes_) {
                arduinoGenerator.functionPrototypes_['func_' + name] = `${decl};\n`;
            }
        }
        return null;
    });

    // =========================================================================
    // 函数调用 (Function Call - Statement/Ret)
    // 利用 Blockly 的 Mutation 机制动态增减参数输入框。
    // =========================================================================
    const generateCallBlock = (hasOutput: boolean) => {
        return {
            init: function () {
                this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_SYS_CALL); // 调用函数
                appendFunctionDropdown(this);
                if (hasOutput) this.setOutput(true, null);
                else {
                    this.setPreviousStatement(true);
                    this.setNextStatement(true);
                }
                this.setColour(290);
                // 启用 Mutator 允许用户配置参数个数
                if (Blockly.icons?.MutatorIcon) {
                    this.setMutator(new Blockly.icons.MutatorIcon(['arduino_call_arg_item'], this));
                }
                this.arguments_ = [];
            },
            // 用于序列化和反序列化参数个数
            mutationToDom: function () { const c = Blockly.utils.xml.createElement('mutation'); c.setAttribute('args', this.arguments_.length); return c; },
            domToMutation: function (xml: any) { this.arguments_ = new Array(parseInt(xml.getAttribute('args') || 0)).fill('arg'); this.updateShape_(); },
            saveExtraState: function () { return { 'args': this.arguments_.length }; },
            loadExtraState: function (state: any) { this.arguments_ = new Array(state['args'] || 0).fill('arg'); this.updateShape_(); },

            // Mutator 内部 UI 逻辑
            decompose: function (ws: any) {
                const c = ws.newBlock('arduino_call_arg_container');
                c.initSvg();
                let conn = c.getInput('STACK').connection;
                for (let i = 0; i < this.arguments_.length; i++) {
                    const it = ws.newBlock('arduino_call_arg_item');
                    it.initSvg();
                    conn.connect(it.previousConnection);
                    conn = it.nextConnection;
                }
                return c;
            },
            compose: function (c: any) {
                let it = c.getInputTargetBlock('STACK');
                const args = [];
                while (it) { args.push('arg'); it = it.nextConnection?.targetBlock(); }
                this.arguments_ = args;
                this.updateShape_();
            },
            // 根据参数个数实时刷新积木外观
            updateShape_: function () {
                let i = 0; while (this.getInput('ARG' + i)) { this.removeInput('ARG' + i); i++; }
                for (let j = 0; j < this.arguments_.length; j++) {
                    this.appendValueInput('ARG' + j)
                        .setAlign(Blockly.inputs.Align.RIGHT)
                        .appendField(Blockly.Msg.ARD_SYS_ARG + (j + 1));
                }
            }
        };
    };

    const generateCallCode = (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        const args = [];
        let i = 0;
        while (block.getInput('ARG' + i)) {
            args.push(arduinoGenerator.valueToCode(block, 'ARG' + i, Order.NONE) || '0');
            i++;
        }
        const code = `${name}(${args.join(', ')})`;
        return block.outputConnection ? [code, Order.ATOMIC] : code + ';\n';
    };

    registerBlock('arduino_functions_call_dynamic', generateCallBlock(false), generateCallCode);
    registerBlock('arduino_functions_call_ret', generateCallBlock(true), generateCallCode);


    // =========================================================================
    // 程序全周期根节点 (Unified Entry Point)
    // 模拟 Arduino IDE 的 setup() 和 loop() 结构，整合为单个积木，提高可读性。
    // =========================================================================
    registerBlock('arduino_entry_root', {
        init: function () {
            // 初始化部分
            this.appendDummyInput().appendField("⚙ " + Blockly.Msg.ARD_SYS_SETUP).setAlign(Blockly.inputs.Align.RIGHT);
            this.appendStatementInput("SETUP_STACK");
            // 循环部分
            this.appendDummyInput().appendField("↻ " + Blockly.Msg.ARD_SYS_LOOP).setAlign(Blockly.inputs.Align.RIGHT);
            this.appendStatementInput("LOOP_STACK");

            this.setColour('#00979C'); // Arduino 官方青色

            this.setDeletable(true);
            this.duplicatable = false; // 整个程序的根节点不允许克隆
            this.setMovable(true);
        },
        maxInstances: 1 // 全局仅允许存在一个根节点
    }, function (block: any) {
        // 核心：此积木不直接返回代码字符串，而是直接操作 arduinoGenerator 的全局属性。
        // 代码生成器随后会提取这些属性拼装成完整的 .ino 文件。
        const setupBranch = arduinoGenerator.statementToCode(block, 'SETUP_STACK');
        const loopBranch = arduinoGenerator.statementToCode(block, 'LOOP_STACK');

        arduinoGenerator.userSetupCode_ = setupBranch;
        arduinoGenerator.userLoopCode_ = loopBranch;

        return ''; // 返回空字符串，避免在 workspace 总代码中出现冗余
    });

    // Mutator 辅助积木
    registerBlock('arduino_call_arg_container', { init: function () { this.appendDummyInput().appendField(Blockly.Msg.ARD_SYS_INPUTS); this.appendStatementInput("STACK"); this.setColour(290); this.contextMenu = false; } }, () => '');
    registerBlock('arduino_call_arg_item', { init: function () { this.appendDummyInput().appendField(Blockly.Msg.ARD_SYS_INPUT); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(290); this.contextMenu = false; } }, () => '');

    // 函数返回积木
    registerBlock('arduino_functions_return', {
        init: function () {
            this.appendValueInput("VALUE").appendField(Blockly.Msg.ARD_SYS_RETURN);
            this.setPreviousStatement(true);
            this.setColour(290);
        }
    }, (b) => `return ${arduinoGenerator.valueToCode(b, 'VALUE', Order.NONE) || ''};\n`);
};

/**
 * 系统模块定义
 * 管理 C++ 类型系统、函数结构以及 Arduino 程序的核心入口。
 */
export const SystemModule: BlockModule = {
    id: 'core.system',
    name: 'System Blocks',
    init
};
