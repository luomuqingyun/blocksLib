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


/**
 * 模块初始化函数
 * 注册增强型的文本与字符串处理积木块。
 * 设计思路：主要基于 Arduino 的 String 类对象进行封装，简化 C 语言中复杂的字符数组操作。
 */
const init = () => {

    // =========================================================================
    // 1. 字符常量 (Char Literal)
    // 在 C 语言中，单引号包裹的是单个字符 (char)，本质上是其 ASCII 码数值。
    // =========================================================================
    registerBlock('text_char', {
        init: function () {
            this.appendDummyInput()
                .appendField("'")
                .appendField(new Blockly.FieldTextInput("A"), "VAL")
                .appendField("'");
            this.setOutput(true, "Number"); // 输出类型设为数字，因为 char 可直接参与数学运算
            this.setColour(160); // 文本类积木统一使用青色调
            this.setTooltip(Blockly.Msg.ARD_TEXT_CHAR_TOOLTIP);
        }
    }, function (block: any) {
        const value = block.getFieldValue('VAL');
        // 取输入的第一个字符，确保符合 char 语法
        const charVal = value.length > 0 ? `'${value[0]}'` : "' '";
        return [charVal, Order.ATOMIC];
    });

    // =========================================================================
    // 2. 转换为字符串 (To String)
    // 显式将任何类型（数字、布尔等）转换为 Arduino String 对象。
    // =========================================================================
    registerBlock('c_to_string', {
        init: function () {
            this.appendValueInput("VAL")
                .setCheck(null)
                .appendField(Blockly.Msg.ARD_TEXT_TO_STRING); // 转换为字符串
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_TEXT_TO_STRING_TOOLTIP);
        }
    }, function (block: any) {
        const value = arduinoGenerator.valueToCode(block, 'VAL', Order.NONE) || '""';
        return [`String(${value})`, Order.ATOMIC];
    });

    // =========================================================================
    // 3. 文本拼接 (Text Join)
    // =========================================================================
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
        // 依靠 String 对象的 + 运算符重载实现拼接
        return [`${a} + ${b}`, Order.ADDITIVE];
    });

    // =========================================================================
    // 4. 获取长度 (Text Length)
    // =========================================================================
    registerBlock('text_length', {
        init: function () {
            this.appendValueInput("VAL").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_LENGTH);
            this.setOutput(true, "Number");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_TEXT_LENGTH_TOOLTIP);
        }
    }, function (block: any) {
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.NONE) || '""';
        // 强制封装为 String 对象以调用其 .length() 方法，防止直接对 char* 调用报错。
        return [`String(${val}).length()`, Order.ATOMIC];
    });

    // =========================================================================
    // 5. 截取子串 (Substring)
    // =========================================================================
    registerBlock('text_substring', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TEXT_SUBSTRING); // 截取文本
            this.appendValueInput("STR").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.appendValueInput("FROM").setCheck("Number").appendField(Blockly.Msg.ARD_TEXT_FROM); // 从...
            this.appendValueInput("TO").setCheck("Number").appendField(Blockly.Msg.ARD_TEXT_TO); // 到...
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

    // =========================================================================
    // 6. 大小写转换 (To Case)
    // =========================================================================
    registerBlock('text_to_case', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TEXT_TO_CASE); // 文本转换
            this.appendDummyInput().appendField(new Blockly.FieldDropdown([["大写 (UPPER)", "toUpperCase"], ["小写 (lower)", "toLowerCase"]]), "CASE");
            this.appendValueInput("STR").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_TEXT_TO_CASE_TOOLTIP);
        }
    }, function (block: any) {
        const kase = block.getFieldValue('CASE');
        const str = arduinoGenerator.valueToCode(block, 'STR', Order.NONE) || '""';

        // 【关键点】Arduino 的 toUpperCase/toLowerCase 是 void 方法，会修改原 String 内存。
        // 为了方便用户在表达式中使用，我们通过一个辅助函数封装，返回修改后的副本。
        const funcName = `str_${kase}`;
        arduinoGenerator.functions_[funcName] = `
/** 字符串大小写转换辅助函数 (返回新 String) */
String ${funcName}(String s) {
  s.${kase}();
  return s;
}`;
        return [`${funcName}(String(${str}))`, Order.ATOMIC];
    });

    // =========================================================================
    // 7. 文本转数字 (To Number)
    // =========================================================================
    registerBlock('text_to_number', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TEXT_TO_NUMBER); // 文本转数字
            this.appendValueInput("STR").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.appendDummyInput().appendField(new Blockly.FieldDropdown([["整数 (Int)", "toInt"], ["浮点数 (Float)", "toFloat"]]), "TYPE");
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

/**
 * 增强文本模块定义
 * 解决了标准 Blockly 文本积木在处理 C++ 字符串时的类型转换与内存管理痛点。
 */
export const TextEnhancedModule: BlockModule = {
    id: 'core.text_enhanced',
    name: 'Enhanced Text Blocks',
    init
};
