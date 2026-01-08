// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('shift_out_74hc595', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHIFT_OUT);
            this.appendValueInput("DATA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IO_DATA_BYTE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DATA_PIN)
                .appendField(new Blockly.FieldTextInput("11"), "DATA_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_CLOCK_PIN)
                .appendField(new Blockly.FieldTextInput("12"), "CLOCK_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHIFT_LATCH)
                .appendField(new Blockly.FieldTextInput("8"), "LATCH_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ORDER)
                .appendField(new Blockly.FieldDropdown([["MSBFIRST", "MSBFIRST"], ["LSBFIRST", "LSBFIRST"]]), "ORDER");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_SHIFT_WRITE_TOOLTIP);
        }
    }, (block: any) => {
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '0';
        const dPin = block.getFieldValue('DATA_PIN');
        const cPin = block.getFieldValue('CLOCK_PIN');
        const lPin = block.getFieldValue('LATCH_PIN');
        const order = block.getFieldValue('ORDER');

        reservePin(block, dPin, 'OUTPUT');
        reservePin(block, cPin, 'OUTPUT');
        reservePin(block, lPin, 'OUTPUT');

        arduinoGenerator.addSetup(`shift_pins_${dPin}_${cPin}_${lPin}`, `
  pinMode(${lPin}, OUTPUT);
  pinMode(${cPin}, OUTPUT);
  pinMode(${dPin}, OUTPUT);
`);

        return `
  digitalWrite(${lPin}, LOW);
  shiftOut(${dPin}, ${cPin}, ${order}, ${data});
  digitalWrite(${lPin}, HIGH);
\n`;
    });

    registerBlock('shift_in_74hc165', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHIFT_IN);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DATA_PIN)
                .appendField(new Blockly.FieldTextInput("12"), "DATA_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_CLOCK_PIN)
                .appendField(new Blockly.FieldTextInput("11"), "CLOCK_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHIFT_LOAD)
                .appendField(new Blockly.FieldTextInput("8"), "LATCH_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHIFT_CE)
                .appendField(new Blockly.FieldTextInput("9"), "CE_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ORDER)
                .appendField(new Blockly.FieldDropdown([["MSBFIRST", "MSBFIRST"], ["LSBFIRST", "LSBFIRST"]]), "ORDER");
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_SHIFT_READ_TOOLTIP);
        }
    }, (block: any) => {
        const dPin = block.getFieldValue('DATA_PIN');
        const cPin = block.getFieldValue('CLOCK_PIN');
        const lPin = block.getFieldValue('LATCH_PIN');
        const cePin = block.getFieldValue('CE_PIN');
        const order = block.getFieldValue('ORDER');

        reservePin(block, dPin, 'INPUT');
        reservePin(block, cPin, 'OUTPUT');
        reservePin(block, lPin, 'OUTPUT');
        reservePin(block, cePin, 'OUTPUT');

        arduinoGenerator.addSetup(`shift_in_pins_${dPin}_${cPin}_${lPin}`, `
  pinMode(${lPin}, OUTPUT);
  pinMode(${cePin}, OUTPUT);
  pinMode(${cPin}, OUTPUT);
  pinMode(${dPin}, INPUT);
  digitalWrite(${cPin}, HIGH);
  digitalWrite(${cePin}, HIGH);
`);

        // 74HC165 Sequence:
        // 1. Latch LOW to load data parallel
        // 2. Latch HIGH to shift mode
        // 3. Clock Enable LOW to enable shifting
        // 4. shiftIn()
        // 5. Clock Enable HIGH to disable

        // We wrap in a nice function to avoid clutter
        const funcName = `readShiftIn_${dPin}_${cPin}`;
        arduinoGenerator.functions_[funcName] = `
byte ${funcName}() {
  digitalWrite(${lPin}, LOW);
  delayMicroseconds(5);
  digitalWrite(${lPin}, HIGH);
  digitalWrite(${cePin}, LOW);
  byte val = shiftIn(${dPin}, ${cPin}, ${order});
  digitalWrite(${cePin}, HIGH);
  return val;
}`;

        return [`${funcName}()`, Order.ATOMIC];
    });

};

export const ShiftRegisterModule: BlockModule = {
    id: 'hardware.shift_register',
    name: 'Shift Registers',
    category: 'Inputs',
    init
};
