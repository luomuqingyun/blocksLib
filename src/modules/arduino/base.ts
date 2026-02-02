import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';
import { FieldMultilineInput } from '@blockly/field-multilineinput';

/**
 * 模块初始化函数
 * 注册 Arduino 基础相关的积木定义及其代码生成器。
 */
const init = () => {

    // 移植自 Blockly-at-rduino 项目的基础积木
    // 包含常见的 Arduino 核心函数封装

    // =========================================================================
    // 延时 (Delay)
    // 强制使程序暂停指定的毫秒数
    // =========================================================================
    registerBlock('base_delay', {
        init: function () {
            this.setColour(120);
            this.appendValueInput("DELAY_TIME")
                .setCheck('Number')
                .appendField("Delay"); // 延时
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setTooltip(Blockly.Msg.ARD_BASE_DELAY_TOOLTIP);
        }
    }, (block: any) => {
        const delay_time = arduinoGenerator.valueToCode(block, 'DELAY_TIME', Order.ATOMIC) || '1000';
        return `delay(${delay_time});\n`;
    });

    // =========================================================================
    // 数值映射 (Map)
    // 将一个范围内的数值按比例重构到另一个范围
    // 默认源范围为 Arduino 模拟输入的 0-1023
    // =========================================================================
    registerBlock('base_map', {
        init: function () {
            this.setColour(230);
            this.appendValueInput("NUM")
                .appendField("Map") // 映射
                .setCheck('Number');
            this.appendValueInput("DMAX")
                .appendField("to [0..") // 到范围 [0..
                .setCheck('Number');
            this.appendDummyInput("")
                .appendField("]");
            this.setInputsInline(true);
            this.setOutput(true);
            this.setTooltip(Blockly.Msg.ARD_BASE_MAP_TOOLTIP);
        }
    }, (block: any) => {
        const value_num = arduinoGenerator.valueToCode(block, 'NUM', Order.NONE) || '0';
        const value_dmax = arduinoGenerator.valueToCode(block, 'DMAX', Order.ATOMIC) || '0';
        // 标准 Arduino map 函数：map(value, fromLow, fromHigh, toLow, toHigh)
        return [`map(${value_num}, 0, 1023, 0, ${value_dmax})`, Order.NONE];
    });

    // =========================================================================
    // 数值约束 (Constrain)
    // 将数值限制在 [min, max] 范围内
    // =========================================================================
    registerBlock('various_constrain', {
        init: function () {
            this.setColour(230);
            this.appendDummyInput()
                .appendField("Constrain"); // 约束
            this.appendValueInput("x")
                .setCheck("Number")
                .appendField("x");
            this.appendValueInput("a")
                .setCheck("Number")
                .appendField("min"); // 最小值
            this.appendValueInput("b")
                .setCheck("Number")
                .appendField("max"); // 最大值
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setTooltip(Blockly.Msg.ARD_BASE_CONSTRAIN_TOOLTIP);
        }
    }, (block: any) => {
        const value_x = arduinoGenerator.valueToCode(block, 'x', Order.ATOMIC) || '0';
        const value_a = arduinoGenerator.valueToCode(block, 'a', Order.ATOMIC) || '0';
        const value_b = arduinoGenerator.valueToCode(block, 'b', Order.ATOMIC) || '0';
        return [`constrain(${value_x}, ${value_a}, ${value_b})`, Order.NONE];
    });

    // =========================================================================
    // 原始 C++ 代码 (Raw C++ Code)
    // 允许高级用户直接在图形化界面中编写多行 C++ 代码
    // =========================================================================
    registerBlock('arduino_cpp_raw', {
        init: function () {
            this.setColour(160); // 代码块颜色
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CPP_RAW)
                .appendField(new FieldMultilineInput(""), "CODE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setTooltip(Blockly.Msg.ARD_CPP_RAW_TOOLTIP);
        }
    }, (block: any) => {
        const code = block.getFieldValue('CODE');
        return `${code}\n`;
    });
};

/**
 * Arduino 基础模块定义
 * 包含核心的控制与数学类积木
 */
export const ArduinoBaseModule: BlockModule = {
    id: 'arduino.base',
    name: 'Arduino Base',
    init
};
