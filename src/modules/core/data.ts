/**
 * ============================================================
 * 数据处理模块 (Data Processing Module)
 * ============================================================
 * 
 * 提供 JSON 数据处理相关积木:
 * - json_parse: 解析 JSON 字符串
 * - json_get_key: 获取 JSON 键值
 * - json_create_doc: 创建/清空 JSON 文档
 * - json_set_key: 设置 JSON 键值
 * - json_serialize: 序列化为字符串
 * 
 * 使用 ArduinoJson 库实现高效 JSON 处理。
 * 
 * @file src/modules/core/data.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册 JSON 数据处理相关的积木定义及其代码生成器。
 */
const init = () => {

    // =========================================================================
    // JSON 解析 (JSON Parse)
    // 将 JSON 字符串反序列化到全局的 jsonDoc 对象中。
    // =========================================================================
    registerBlock('json_parse', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DATA_JSON_PARSE); // 解析 JSON 字符串
            this.appendValueInput("JSON")
                .setCheck("String")
                .appendField("String");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60); // 橙黄色，代表数据流处理
            this.setTooltip(Blockly.Msg.ARD_DATA_JSON_PARSE_TOOLTIP);
        }
    }, (block: any) => {
        const json = arduinoGenerator.valueToCode(block, 'JSON', Order.ATOMIC) || '"{}"';

        // 引入 ArduinoJson 库
        arduinoGenerator.addInclude('json_lib', '#include <ArduinoJson.h>');

        // 在全局作用域定义 JSON 文档容器。使用 DynamicJsonDocument 以便在堆上动态分配内存。
        // 预设 1024 字节适用于大多数简单的嵌入式应用。
        arduinoGenerator.addVariable('json_doc', `DynamicJsonDocument jsonDoc(1024);`);

        return `deserializeJson(jsonDoc, ${json});\n`;
    });

    // =========================================================================
    // 获取 JSON 键值 (Get JSON Key)
    // 从当前解析后的 jsonDoc 中提取特定键的值。
    // =========================================================================
    registerBlock('json_get_key', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DATA_JSON_GET); // 获取 JSON 键
            this.appendValueInput("KEY")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_PREF_KEY); // 键名
            this.setOutput(true, null); // 变体类型：根据 JSON 实际内容可能返回数字或字符串
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_DATA_JSON_GET_TOOLTIP);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        // 自动利用 ArduinoJson 的重载操作符进行索引
        return [`jsonDoc[${key}]`, Order.ATOMIC];
    });


    // =========================================================================
    // JSON 创建/清空 (JSON Clear/Create)
    // 重置全局 jsonDoc，为构建新的 JSON 对象做准备。
    // =========================================================================
    registerBlock('json_create_doc', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DATA_JSON_CREATE); // 创建/清空 JSON
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_DATA_JSON_CLR_TOOLTIP);
        }
    }, (block: any) => {
        return `jsonDoc.clear();\n`;
    });

    // =========================================================================
    // 设置 JSON 键值 (Set JSON Key)
    // 向 jsonDoc 中插入或修改一对键值。
    // =========================================================================
    registerBlock('json_set_key', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DATA_JSON_SET); // 设置 JSON 键值对
            this.appendValueInput("KEY")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_PREF_KEY);
            this.appendValueInput("VAL")
                .appendField(Blockly.Msg.ARD_PREF_VALUE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_DATA_JSON_ADD_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '""';
        return `jsonDoc[${key}] = ${val};\n`;
    });

    // =========================================================================
    // 序列化 JSON (Serialize JSON)
    // 将整个内存中的 jsonDoc 转换回 String 格式，以便打印或通过网络发送。
    // =========================================================================
    registerBlock('json_serialize', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DATA_JSON_SERIALIZE); // 导出为 JSON 字符串
            this.setOutput(true, "String");
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_DATA_JSON_STR_TOOLTIP);
        }
    }, (block: any) => {
        // 使用辅助函数来处理 String 对象的拼接逻辑，保持主循环代码整洁
        const funcName = 'json_serialize_helper';
        arduinoGenerator.functions_[funcName] = `
String ${funcName}() {
  String output;
  serializeJson(jsonDoc, output);
  return output;
}`;
        return [`${funcName}()`, Order.ATOMIC];
    });

};

/**
 * 数据处理模块定义
 * 基于 ArduinoJson 库提供结构化数据的处理能力。
 */
export const DataModule: BlockModule = {
    id: 'core.data',
    name: 'Data Processing',
    init
};
