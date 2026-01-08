import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // Keypad (Keypad.h)
    // =========================================================================

    registerBlock('input_keypad_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_KEYPAD_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_ROWS)
                .appendField(new Blockly.FieldTextInput("9,8,7,6"), "R_PINS");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_COLS)
                .appendField(new Blockly.FieldTextInput("5,4,3,2"), "C_PINS");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_KEYPAD_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const rPins = block.getFieldValue('R_PINS');
        const cPins = block.getFieldValue('C_PINS');

        // Reserve pins (parsing logic simplified for brevity)
        // In a full implementation we might want to split and reserve each.

        arduinoGenerator.addInclude('keypad_lib', '#include <Keypad.h>');
        arduinoGenerator.addInclude('keypad_lib', '#include <Keypad.h>');
        arduinoGenerator.addVariable('keypad_config', `
const byte ROWS = 4; 
const byte COLS = 4; 
char hexaKeys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {${rPins}}; 
byte colPins[COLS] = {${cPins}}; 

Keypad customKeypad = Keypad(makeKeymap(hexaKeys), rowPins, colPins, ROWS, COLS);`);

        return '';
    });

    registerBlock('input_keypad_get_key', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_KEYPAD_GET);
            this.setOutput(true, "String");
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_KEYPAD_GET_TOOLTIP);
        }
    }, (block: any) => {
        return ['customKeypad.getKey()', Order.ATOMIC];
    });


    // =========================================================================
    // Joystick (Analog)
    // =========================================================================

    registerBlock('input_joystick_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_JOYSTICK);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_AXIS)
                .appendField(new Blockly.FieldDropdown([["X", "X"], ["Y", "Y"]]), "AXIS");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("A0"), "PIN");
            this.setOutput(true, "Number");
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_JOYSTICK_READ_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'INPUT');

        return [`analogRead(${pin})`, Order.ATOMIC];
    });


    // =========================================================================
    // Rotary Encoder (Encoder.h)
    // =========================================================================
    registerBlock('input_rotary_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_ROTARY_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_CLK_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "CLK");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_DT_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "DT");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_ENCODER_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const clk = block.getFieldValue('CLK');
        const dt = block.getFieldValue('DT');

        reservePin(block, clk, 'INPUT');
        reservePin(block, dt, 'INPUT');

        arduinoGenerator.addInclude('encoder_lib', '#include <Encoder.h>');
        arduinoGenerator.addVariable(`encoder_${clk}_${dt}`, `Encoder myEnc_${clk}_${dt}(${clk}, ${dt});`);
        return '';
    });

    registerBlock('input_rotary_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_ROTARY_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_CLK_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "CLK");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_DT_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "DT");
            this.setOutput(true, "Number");
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_ENCODER_READ_TOOLTIP);
        }
    }, (block: any) => {
        const clk = block.getFieldValue('CLK');
        const dt = block.getFieldValue('DT');
        return [`myEnc_${clk}_${dt}.read()`, Order.ATOMIC];
    });

    registerBlock('input_rotary_reset', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_ROTARY_RESET);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_CLK_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "CLK");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_DT_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "DT");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_ENCODER_RESET_TOOLTIP);
        }
    }, (block: any) => {
        const clk = block.getFieldValue('CLK');
        const dt = block.getFieldValue('DT');
        return `myEnc_${clk}_${dt}.write(0);\n`;
    });

};

export const InputsModule: BlockModule = {
    id: 'hardware.inputs',
    name: 'User Inputs (Keypad/Stick)',
    category: 'Inputs',
    init
};
