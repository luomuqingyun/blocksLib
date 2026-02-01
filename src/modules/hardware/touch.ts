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

    registerBlock('touch_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_TOUCH_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("4"), "PIN");
            this.setOutput(true, "Number");
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_TOUCH_READ_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        return [`touchRead(${pin})`, Order.ATOMIC];
    });

    registerBlock('touch_is_touched', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_TOUCH_CHECK);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("4"), "PIN");
            this.appendValueInput("THRESH")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_INPUT_THRESHOLD);
            this.setOutput(true, "Boolean");
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_TOUCH_CHECK_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const thresh = arduinoGenerator.valueToCode(block, 'THRESH', Order.ATOMIC) || '40';
        return [`(touchRead(${pin}) < ${thresh})`, Order.ATOMIC];
    });

};

export const TouchModule: BlockModule = {
    id: 'hardware.touch',
    name: 'Capacitive Touch',
    category: 'Sensors',
    init
};
