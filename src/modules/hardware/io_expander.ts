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

        // We assume Wire is initialized or we init it. 
        // PCF8574 library usually takes address in constructor.

        arduinoGenerator.addInclude('pcf8574_lib', '#include <PCF8574.h>');
        arduinoGenerator.addVariable('pcf8574_obj', `PCF8574 pcf8574(${addr});`);

        // PCF8574 lib often needs begin(). 
        // If we want custom pins for I2C on ESP32, we normally call Wire.begin(sda, scl) before.
        arduinoGenerator.addSetup(`wire_begin_${sda}_${scl}`, `Wire.begin(${sda}, ${scl});`);
        arduinoGenerator.addSetup(`pcf8574_begin_${name}`, `${name}.begin();`);

        return '';
    });

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
        return `${name}.pinMode(${pin}, ${mode});\n`;
    });

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

export const IOExpanderModule: BlockModule = {
    id: 'hardware.io_expander',
    name: 'IO Expander (PCF8574)',
    category: 'Inputs', // Or a new category "Expanders"? Inputs fits for now locally.
    init
};
