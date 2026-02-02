
import { registerBlock, arduinoGenerator, Order } from '../../../generators/arduino-base';
import * as Blockly from 'blockly';

export const initAdvancedDHTBlocks = () => {
    // block: Init
    registerBlock('example_dht_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_EXAMPLE_DHT_INIT.replace(' %1', '').replace(' %2', ''))
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN")
                .appendField(Blockly.Msg.ARD_SENSOR_TYPE)
                .appendField(new Blockly.FieldDropdown([["DHT11", "DHT11"], ["DHT22", "DHT22"]]), "TYPE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120); // Green
            this.setTooltip(Blockly.Msg.ARD_EXAMPLE_DHT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const type = block.getFieldValue('TYPE');
        arduinoGenerator.addInclude('dht_lib', '#include <DHT.h>');
        arduinoGenerator.addVariable('dht_obj', `DHT dht(${pin}, ${type});`);
        arduinoGenerator.addSetup('dht_begin', 'dht.begin();');
        return '';
    });

    // block: Read Temp
    registerBlock('example_dht_read_temp', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_EXAMPLE_DHT_READ_TEMP);
            this.setOutput(true, "Number");
            this.setColour(120);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('dht_lib', '#include <DHT.h>');
        const code = 'dht.readTemperature()';
        return [code, Order.ATOMIC];
    });
};
