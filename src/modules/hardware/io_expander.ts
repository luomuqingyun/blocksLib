/**
 * ============================================================
 * IO 扩展器模块 (PCF8574 I2C GPIO Expander)
 * ============================================================
 * 
 * 提供 PCF8574 I2C GPIO 扩展积木:
 * - pcf8574_init: 初始化 (地址/SDA/SCL)
 * - pcf8574_pin_mode: 设置引脚模式
 * - pcf8574_write/read: 读写引脚
 * 
 * 使用 PCF8574.h 库。可扩展 8 个 GPIO。
 * 
 * @file src/modules/hardware/io_expander.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化 PCF8574 IO 扩展器 (I2C 接口)
    registerBlock('pcf8574_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCF8574_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NAME)
                .appendField(new Blockly.FieldTextInput("expander1"), "NAME");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCF8574_ADDR)
                .appendField(new Blockly.FieldTextInput("0x27"), "ADDR");
            this.appendDummyInput()
                .appendField("SDA")
                .appendField(new Blockly.FieldTextInput("21"), "SDA");
            this.appendDummyInput()
                .appendField("SCL")
                .appendField(new Blockly.FieldTextInput("22"), "SCL");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_PCF8574_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        const addr = block.getFieldValue('ADDR');
        const sda = block.getFieldValue('SDA');
        const scl = block.getFieldValue('SCL');

        // 包含 PCF8574 驱动库
        arduinoGenerator.addInclude('pcf8574_lib', '#include <PCF8574.h>');
        // 定义全局 PCF8574 扩展器对象
        arduinoGenerator.addVariable('pcf8574_obj', `PCF8574 ${name}(${addr});`);

        // 在 setup 中强制初始化 I2C 总线引脚并启动扩展器
        arduinoGenerator.addSetup(`wire_begin_${sda}_${scl}`, `Wire.begin(${sda}, ${scl});`);
        arduinoGenerator.addSetup(`pcf8574_begin_${name}`, `${name}.begin();`);

        return '';
    });

    // 设置 PCF8574 扩展引脚的模式（输入或输出）
    registerBlock('pcf8574_pin_mode', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCF8574_MODE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCF8574_NAME)
                .appendField(new Blockly.FieldTextInput("expander1"), "NAME");
            this.appendValueInput("PIN")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PCF8574_PIN);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_MODE)
                .appendField(new Blockly.FieldDropdown([["OUTPUT", "OUTPUT"], ["INPUT", "INPUT"]]), "MODE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        const pin = arduinoGenerator.valueToCode(block, 'PIN', Order.ATOMIC) || '0';
        const mode = block.getFieldValue('MODE');
        // 调用 PCF8574 对象的 pinMode 方法
        return `${name}.pinMode(${pin}, ${mode});\n`;
    });

    // 向 PCF8574 扩展引脚写入数字信号（高/低电平）
    registerBlock('pcf8574_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCF8574_WRITE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCF8574_NAME)
                .appendField(new Blockly.FieldTextInput("expander1"), "NAME");
            this.appendValueInput("PIN")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PCF8574_PIN);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PREF_VALUE)
                .appendField(new Blockly.FieldDropdown([["HIGH", "HIGH"], ["LOW", "LOW"]]), "VAL");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        const pin = arduinoGenerator.valueToCode(block, 'PIN', Order.ATOMIC) || '0';
        const val = block.getFieldValue('VAL');
        return `${name}.digitalWrite(${pin}, ${val});\n`;
    });

    // 从 PCF8574 扩展引脚读取数字信号状态
    registerBlock('pcf8574_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCF8574_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCF8574_NAME)
                .appendField(new Blockly.FieldTextInput("expander1"), "NAME");
            this.appendValueInput("PIN")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PCF8574_PIN);
            this.setOutput(true, "Number");
            this.setColour(230);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        const pin = arduinoGenerator.valueToCode(block, 'PIN', Order.ATOMIC) || '0';
        return [`${name}.digitalRead(${pin})`, Order.ATOMIC];
    });

};

/**
 * IO 扩展模块 (PCF8574)
 * 通过 I2C 总线扩展 8 个数字 I/O 引脚，适用于引脚资源紧张的场景。
 */
export const IOExpanderModule: BlockModule = {
    id: 'hardware.io_expander',
    name: 'IO Expander (PCF8574)',
    init
};
