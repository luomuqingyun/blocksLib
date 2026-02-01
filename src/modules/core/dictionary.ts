/**
 * ============================================================
 * 字典模块 (Dictionary / Map Module)
 * ============================================================
 * 
 * 提供键值对字典 (std::map) 积木:
 * - dict_create: 初始化字典
 * - dict_set: 设置键值
 * - dict_get: 获取值
 * - dict_exists: 检查键是否存在
 * 
 * @file src/modules/core/dictionary.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('dict_create', {
        init: function () {
            this.appendDummyInput()
                .appendField("Dictionary Init (Map)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260); // List-like color
            this.setTooltip(Blockly.Msg.ARD_DICT_INIT_TOOLTIP);
        }
    }, (block: any) => {
        // We use std::map<String, String> because it's easiest for mixed types
        arduinoGenerator.addInclude('map_lib', '#include <map>');
        arduinoGenerator.addVariable('dict_obj', `std::map<String, String> dict;`);
        return '';
    });

    registerBlock('dict_set', {
        init: function () {
            this.appendDummyInput()
                .appendField("Dict Set");
            this.appendValueInput("KEY").setCheck("String").appendField("Key");
            this.appendValueInput("VAL").setCheck("String").appendField("Value");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '"val"';
        return `dict[${key}] = ${val};\n`;
    });

    registerBlock('dict_get', {
        init: function () {
            this.appendDummyInput()
                .appendField("Dict Get");
            this.appendValueInput("KEY").setCheck("String").appendField("Key");
            this.setOutput(true, "String");
            this.setColour(260);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        // Need to be careful about non-existent keys. map[] creates them with default value "" which is fine for String.
        return [`dict[${key}]`, Order.ATOMIC];
    });

    registerBlock('dict_exists', {
        init: function () {
            this.appendDummyInput()
                .appendField("Dict Key Exists?");
            this.appendValueInput("KEY").setCheck("String").appendField("Key");
            this.setOutput(true, "Boolean");
            this.setColour(260);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        return [`(dict.count(${key}) > 0)`, Order.ATOMIC];
    });

};

export const DictionaryModule: BlockModule = {
    id: 'core.dictionary',
    name: 'Dictionary (Map)',
    category: 'Data',
    init
};
