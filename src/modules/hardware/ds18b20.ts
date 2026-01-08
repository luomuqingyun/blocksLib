import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // DS18B20 (OneWire + DallasTemperature)
    // =========================================================================

    registerBlock('ds18b20_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_DS18B20_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'INPUT');

        arduinoGenerator.addInclude('onewire_lib', '#include <OneWire.h>');
        arduinoGenerator.addInclude('ds18b20_lib', '#include <DallasTemperature.h>');
        arduinoGenerator.addVariable(`onewire_${pin}`, `OneWire oneWire_${pin}(${pin});`);
        arduinoGenerator.addVariable(`ds18b20_${pin}`, `DallasTemperature sensor_${pin}(&oneWire_${pin});`);

        arduinoGenerator.addSetup(`ds18b20_init_${pin}`, `sensors_${pin}.begin();`);

        return '';
    });

    registerBlock('ds18b20_request', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_REQUEST);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_DS18B20_CONV_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        return `sensors_${pin}.requestTemperatures();\n`;
    });

    registerBlock('ds18b20_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_INDEX)
                .appendField(new Blockly.FieldNumber(0), "IDX");
            this.setOutput(true, "Number");
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_DS18B20_READ_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const idx = block.getFieldValue('IDX');

        return [`sensors_${pin}.getTempCByIndex(${idx})`, Order.ATOMIC];
    });

    registerBlock('ds18b20_set_resolution', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_RES);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_BITS)
                .appendField(new Blockly.FieldDropdown([["9", "9"], ["10", "10"], ["11", "11"], ["12", "12"]]), "RES");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_DS18B20_RES_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const res = block.getFieldValue('RES');
        return `sensors_${pin}.setResolution(${res});\n`;
    });

    registerBlock('ds18b20_get_device_count', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_COUNT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.setOutput(true, "Number");
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_DS18B20_NR_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        return [`sensors_${pin}.getDeviceCount()`, Order.ATOMIC];
    });
};

export const DS18B20Module: BlockModule = {
    id: 'hardware.ds18b20',
    name: 'DS18B20 Temp',
    category: 'DS18B20',
    init
};
