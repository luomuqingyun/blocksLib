/**
 * ============================================================
 * 增强文本模块 (Enhanced Text Module)
 * ============================================================
 * 
 * 提供字符串处理积木:
 * - text_char: 字符字面量
 * - c_to_string: 转换为字符串
 * - c_text_join: 拼接字符串
 * - text_length/substring/to_case/to_number: 字符串操作
 * 
 * @file src/modules/core/text_enhanced.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 1. Char Literal
    registerBlock('text_char', {
        init: function () {
            this.appendDummyInput()
                .appendField("'")
                .appendField(new Blockly.FieldTextInput("A"), "VAL")
                .appendField("'");
            this.setOutput(true, "Number"); // Char is effectively a number in C
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_TEXT_CHAR_TOOLTIP);
        }
    }, function (block: any) {
        const value = block.getFieldValue('VAL');
        const charVal = value.length > 0 ? `'${value[0]}'` : "' '";
        return [charVal, Order.ATOMIC];
    });

    // 3. To String
    registerBlock('c_to_string', {
        init: function () {
            this.appendValueInput("VAL")
                .setCheck(null)
                .appendField(Blockly.Msg.ARD_TEXT_TO_STRING);
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_TEXT_TO_STRING_TOOLTIP);
        }
    }, function (block: any) {
        const value = arduinoGenerator.valueToCode(block, 'VAL', Order.NONE) || '""';
        return [`String(${value})`, Order.ATOMIC];
    });

    // 4. Text Join (Concatenate)
    registerBlock('c_text_join', {
        init: function () {
            this.appendValueInput("A").setCheck(null);
            this.appendValueInput("B").setCheck(null).appendField("+");
            this.setOutput(true, "String");
            this.setColour(160);
            this.setInputsInline(true);
            this.setTooltip(Blockly.Msg.ARD_TEXT_JOIN_TOOLTIP);
        }
    }, function (block: any) {
        const a = arduinoGenerator.valueToCode(block, 'A', Order.ADDITIVE) || '""';
        const b = arduinoGenerator.valueToCode(block, 'B', Order.ADDITIVE) || '""';
        return [`${a} + ${b}`, Order.ADDITIVE];
    });

    registerBlock('text_length', {
        init: function () {
            this.appendValueInput("VAL").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_LENGTH);
            this.setOutput(true, "Number");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_TEXT_LENGTH_TOOLTIP);
        }
    }, function (block: any) {
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.NONE) || '""';
        // String objects have .length(), C-strings have strlen()
        // We assume Arduino String objects for blockly simplicity usually
        return [`String(${val}).length()`, Order.ATOMIC];
    });

    registerBlock('text_substring', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TEXT_SUBSTRING);
            this.appendValueInput("STR").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.appendValueInput("FROM").setCheck("Number").appendField(Blockly.Msg.ARD_TEXT_FROM);
            this.appendValueInput("TO").setCheck("Number").appendField(Blockly.Msg.ARD_TEXT_TO);
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_TEXT_SUBSTRING_TOOLTIP);
            this.setInputsInline(true);
        }
    }, function (block: any) {
        const str = arduinoGenerator.valueToCode(block, 'STR', Order.NONE) || '""';
        const from = arduinoGenerator.valueToCode(block, 'FROM', Order.NONE) || '0';
        const to = arduinoGenerator.valueToCode(block, 'TO', Order.NONE) || '0';
        return [`String(${str}).substring(${from}, ${to})`, Order.ATOMIC];
    });

    registerBlock('text_to_case', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TEXT_TO_CASE);
            this.appendDummyInput().appendField(new Blockly.FieldDropdown([["UPPER", "toUpperCase"], ["lower", "toLowerCase"]]), "CASE");
            this.appendValueInput("STR").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_TEXT_TO_CASE_TOOLTIP);
        }
    }, function (block: any) {
        const kase = block.getFieldValue('CASE');
        const str = arduinoGenerator.valueToCode(block, 'STR', Order.NONE) || '""';
        // Note: Arduino String .toUpperCase() modifies in place usually or returns void check
        // Ideally we need to wrap this to return a value. 
        // Standard String: void toUpperCase()
        // We need a helper:
        const funcName = `str_${kase}`;
        arduinoGenerator.functions_[funcName] = `
String ${funcName}(String s) {
  s.${kase}();
  return s;
}`;
        return [`${funcName}(String(${str}))`, Order.ATOMIC];
    });

    registerBlock('text_to_number', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TEXT_TO_NUMBER);
            this.appendValueInput("STR").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.appendDummyInput().appendField(new Blockly.FieldDropdown([["Int", "toInt"], ["Float", "toFloat"]]), "TYPE");
            this.setOutput(true, "Number");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_TEXT_TO_NUMBER_TOOLTIP);
        }
    }, function (block: any) {
        const type = block.getFieldValue('TYPE');
        const str = arduinoGenerator.valueToCode(block, 'STR', Order.NONE) || '""';
        return [`String(${str}).${type}()`, Order.ATOMIC];
    });
};

export const TextEnhancedModule: BlockModule = {
    id: 'core.text_enhanced',
    name: 'Enhanced Text Blocks',
    init
};
