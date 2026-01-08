// @ts-nocheck
/**
 * 宏定义模块 (Macros Module)
 * 
 * 包含宏定义 (#define) 和 #include 相关积木。
 */
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../../generators/arduino-base';
import { COLOUR_MACRO, appendMacroDropdown } from './utils';

/**
 * 初始化宏定义积木
 */
export function initMacroBlocks() {
    // --- c_macro_define: 宏定义 ---
    registerBlock('c_macro_define', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MACRO_DEFINE)
                .appendField(new Blockly.FieldTextInput("CONSTANT"), "NAME")
                .appendField(new Blockly.FieldTextInput("VAL"), "VALUE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOUR_MACRO);
        }
    }, function (block: any) {
        const name = block.getFieldValue('NAME');
        arduinoGenerator.addMacro(name, `#define ${name} ${block.getFieldValue('VALUE')} \n`);
        return '';
    });

    // --- c_macro_get: 获取宏值 ---
    registerBlock('c_macro_get', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_MACRO_GET);
            this.setOutput(true, null);
            this.setColour(COLOUR_MACRO);
            appendMacroDropdown(this);
        }
    }, function (block: any) {
        return [cleanName(block.getFieldValue('VAR')), Order.ATOMIC];
    });

    // --- c_include: 自定义 #include ---
    registerBlock('c_include', {
        init: function () {
            this.appendDummyInput()
                .appendField("#include")
                .appendField(new Blockly.FieldTextInput("<Servo.h>"), "HEADER");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOUR_MACRO);
        }
    }, function (block: any) {
        const header = block.getFieldValue('HEADER');
        if (arduinoGenerator.addInclude) {
            arduinoGenerator.addInclude('include_manual_' + header, `#include ${header}`);
        }
        return '';
    });
}
