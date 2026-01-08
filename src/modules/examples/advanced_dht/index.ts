
import { registerBlock, arduinoGenerator, Order } from '../../../generators/arduino-base';
import { BlockModule } from '../../../registries/ModuleRegistry';
import * as Blockly from 'blockly';

/**
 * 示例 2: 高级传感器模块 (DHT)
 * 
 * 这是一个遵循 "文件夹即模块" 结构的重构版本。
 */
const init = () => {
    // block: Init
    registerBlock('example_dht_init', {
        init: function () {
            this.appendDummyInput()
                .appendField("Initialize DHT Sensor")
                .appendField("Pin")
                .appendField(new Blockly.FieldTextInput("2"), "PIN")
                .appendField("Type")
                .appendField(new Blockly.FieldDropdown([["DHT11", "DHT11"], ["DHT22", "DHT22"]]), "TYPE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120); // Green
            this.setTooltip("Setup DHT sensor");
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
                .appendField("Read Temperature (C)");
            this.setOutput(true, "Number");
            this.setColour(120);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('dht_lib', '#include <DHT.h>');
        const code = 'dht.readTemperature()';
        return [code, Order.ATOMIC];
    });
};

export const ExampleSensorModule: BlockModule = {
    id: 'examples.dht',
    name: 'Example: DHT Sensor',
    category: 'SENSORS',
    init: init
};
