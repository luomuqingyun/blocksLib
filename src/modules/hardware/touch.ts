/**
 * ============================================================
 * 电容触摸模块 (Capacitive Touch Module)
 * ============================================================
 * 
 * 提供 ESP32 电容触摸积木:
 * - touch_read: 读取触摸引脚值
 * - touch_is_touched: 判断是否被触摸 (阈值比较)
 * 
 * ESP32 内置触摸引脚 (T0-T9)。
 * 
 * @file src/modules/hardware/touch.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 直接读取触摸引脚的电容原始值
    registerBlock('touch_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_TOUCH_READ); // 读取触摸
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("4"), "PIN"); // 触摸引脚 (例如 T0-T9 / GPIO 4)
            this.setOutput(true, "Number");
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_TOUCH_READ_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        // 使用 ESP32 的内核函数 touchRead()
        return [`touchRead(${pin})`, Order.ATOMIC];
    });

    // 判断指定引脚是否被触摸（基于设定的阈值）
    registerBlock('touch_is_touched', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_TOUCH_CHECK); // 触摸检测
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("4"), "PIN"); // 触摸引脚 (T0-T9)
            this.appendValueInput("THRESH")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_INPUT_THRESHOLD); // 阈值
            this.setOutput(true, "Boolean");
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_TOUCH_CHECK_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const thresh = arduinoGenerator.valueToCode(block, 'THRESH', Order.ATOMIC) || '40';
        // 触摸时 touchRead 返回的数值会减小，因此小于阈值即认为被触摸
        return [`(touchRead(${pin}) < ${thresh})`, Order.ATOMIC];
    });

};

/**
 * 触摸感应模块 (Touch)
 * 利用 ESP32 内置的电容式触摸检测功能，支持多达 10 个触摸引脚，无需外部组件即可实现触摸按键。
 */
export const TouchModule: BlockModule = {
    id: 'hardware.touch',
    name: 'Capacitive Touch',
    init
};
