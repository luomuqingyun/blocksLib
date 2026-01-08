
import { registerBlock, arduinoGenerator, Order } from '../../../generators/arduino-base';
import { BlockModule } from '../../../registries/ModuleRegistry';
import * as Blockly from 'blockly';

/**
 * 示例 1: 简单的 LED 控制模块 (基础示例)
 * 
 * 这是一个遵循 "文件夹即模块" 结构的重构版本。
 */
const init = () => {
    registerBlock('example_led_control', {
        init: function () {
            this.appendDummyInput()
                .appendField("Control LED on Pin")
                .appendField(new Blockly.FieldTextInput("13"), "PIN")
                .appendField("to")
                .appendField(new Blockly.FieldDropdown([["HIGH", "HIGH"], ["LOW", "LOW"]]), "STATE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230); // Blue
            this.setTooltip("Set a digital pin to HIGH or LOW");
            this.setHelpUrl("");
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const state = block.getFieldValue('STATE');
        arduinoGenerator.addSetup(`pinMode_${pin}`, `pinMode(${pin}, OUTPUT);`);
        const code = `digitalWrite(${pin}, ${state});\n`;
        return code;
    });
};

export const ExampleLedModule: BlockModule = {
    id: 'examples.led',
    name: 'Example: LED Control',
    category: 'IO',
    init: init
};
