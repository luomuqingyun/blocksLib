import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';
import { FieldMultilineInput } from '@blockly/field-multilineinput';

const init = () => {

    // Ported from Blockly-at-rduino/blocks/arduino_base/arduino_base.js
    // and generators/arduino/arduino_base.js

    // --- Delay ---
    registerBlock('base_delay', {
        init: function () {
            this.setColour(120);
            this.appendValueInput("DELAY_TIME")
                .setCheck('Number')
                .appendField("Delay");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setTooltip(Blockly.Msg.ARD_BASE_DELAY_TOOLTIP);
        }
    }, (block: any) => {
        const delay_time = arduinoGenerator.valueToCode(block, 'DELAY_TIME', Order.ATOMIC) || '1000';
        return `delay(${delay_time});\n`;
    });

    // --- Map ---
    registerBlock('base_map', {
        init: function () {
            this.setColour(230);
            this.appendValueInput("NUM")
                .appendField("Map")
                .setCheck('Number');
            this.appendValueInput("DMAX")
                .appendField("to [0..")
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
        return [`map(${value_num}, 0, 1023, 0, ${value_dmax})`, Order.NONE];
    });

    // --- Constrain ---
    registerBlock('various_constrain', {
        init: function () {
            this.setColour(230);
            this.appendDummyInput()
                .appendField("Constrain");
            this.appendValueInput("x")
                .setCheck("Number")
                .appendField("x");
            this.appendValueInput("a")
                .setCheck("Number")
                .appendField("min");
            this.appendValueInput("b")
                .setCheck("Number")
                .appendField("max");
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

    // --- Raw C++ Code ---
    registerBlock('arduino_cpp_raw', {
        init: function () {
            this.setColour(160); // Code color
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

export const ArduinoBaseModule: BlockModule = {
    id: 'arduino.base',
    name: 'Arduino Base',
    init
};
