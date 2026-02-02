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


/**
 * 模块初始化函数
 * 注册字典（键值对）相关的积木块。
 * 实现方案：利用 C++ 标准库的 std::map 容器。
 */
const init = () => {

    // =========================================================================
    // 1. 初始化字典 (Dictionary Init)
    // 在全局范围内声明并实例化一个字典对象。
    // =========================================================================
    registerBlock('dict_create', {
        init: function () {
            this.appendDummyInput()
                .appendField("初始化字典 (Map)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260); // 集合类积木使用深色调
            this.setTooltip(Blockly.Msg.ARD_DICT_INIT_TOOLTIP);
        }
    }, (block: any) => {
        // 【关键点】引入 <map> 标准库。注意：在 AVR 等极小内存单片机上慎用，
        // map 容器具有较大的内存开销。
        arduinoGenerator.addInclude('map_lib', '#include <map>');
        // 目前实现缺省使用 <String, String> 类型，以通用性优先。
        arduinoGenerator.addVariable('dict_obj', `std::map<String, String> dict;`);
        return '';
    });

    // =========================================================================
    // 2. 设置键值 (Dict Set)
    // 向字典中存入数据。如果键已存在，则覆盖旧值。
    // =========================================================================
    registerBlock('dict_set', {
        init: function () {
            this.appendDummyInput()
                .appendField("字典：设置内容");
            this.appendValueInput("KEY").setCheck("String").appendField("键 (Key)");
            this.appendValueInput("VAL").setCheck("String").appendField("值 (Value)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '"val"';
        return `dict[${key}] = ${val};\n`;
    });

    // =========================================================================
    // 3. 获取值 (Dict Get)
    // 根据键提取对应的数据。如果键不存在，std::map 会返回空字符串（默认构造值）。
    // =========================================================================
    registerBlock('dict_get', {
        init: function () {
            this.appendDummyInput()
                .appendField("字典：读取内容");
            this.appendValueInput("KEY").setCheck("String").appendField("键 (Key)");
            this.setOutput(true, "String");
            this.setColour(260);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        return [`dict[${key}]`, Order.ATOMIC];
    });

    // =========================================================================
    // 4. 检查键是否存在 (Dict Key Exists?)
    // =========================================================================
    registerBlock('dict_exists', {
        init: function () {
            this.appendDummyInput()
                .appendField("字典：键是否存在？");
            this.appendValueInput("KEY").setCheck("String").appendField("键 (Key)");
            this.setOutput(true, "Boolean");
            this.setColour(260);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        // 使用 map.count() 方法：核心原理是 map 中 key 是唯一的，count 只能返回 0 或 1。
        return [`(dict.count(${key}) > 0)`, Order.ATOMIC];
    });

};

/**
 * 字典模块定义
 * 提供了类似 Python 字典或 JS 对象的键值对存储能力。
 */
export const DictionaryModule: BlockModule = {
    id: 'core.dictionary',
    name: 'Dictionary (Map)',
    init
};
