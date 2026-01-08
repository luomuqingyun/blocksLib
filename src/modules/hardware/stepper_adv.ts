// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('stepper_accel_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_INIT);
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("stepper1"), "NAME");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_TYPE)
                .appendField(new Blockly.FieldDropdown([
                    ["DRIVER (2 Pins)", "1"],
                    ["FULL4WIRE (4 Pins)", "4"],
                    ["FULL3WIRE (3 Pins)", "3"],
                    ["HALF4WIRE (8 Pins)", "8"]
                ]), "TYPE");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_PIN1)
                .appendField(new Blockly.FieldTextInput("8"), "PIN1");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_PIN2)
                .appendField(new Blockly.FieldTextInput("9"), "PIN2");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_PIN3)
                .appendField(new Blockly.FieldTextInput("10"), "PIN3");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_PIN4)
                .appendField(new Blockly.FieldTextInput("11"), "PIN4");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_ACCELSTEPPER_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        const type = block.getFieldValue('TYPE');
        const p1 = block.getFieldValue('PIN1');
        const p2 = block.getFieldValue('PIN2');
        const p3 = block.getFieldValue('PIN3');
        const p4 = block.getFieldValue('PIN4');

        arduinoGenerator.addInclude('accel_stepper_lib', '#include <AccelStepper.h>');

        let args = `${type}, ${p1}, ${p2}`;
        if (type === '4' || type === '8') {
            args += `, ${p3}, ${p4}`;
        }

        arduinoGenerator.addVariable(`stepper_accel_${name}`, `AccelStepper ${name}(${args});`);

        return '';
    });

    registerBlock('stepper_accel_setup', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_SETUP);
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("stepper1"), "NAME");
            this.appendValueInput("SPEED")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_MAX_SPEED);
            this.appendValueInput("ACCEL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_ACCEL);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_ACCELSTEPPER_SETUP_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        const speed = arduinoGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '1000';
        const accel = arduinoGenerator.valueToCode(block, 'ACCEL', Order.ATOMIC) || '500';
        return `
    ${name}.setMaxSpeed(${speed});
    ${name}.setAcceleration(${accel});\n`;
    });

    registerBlock('stepper_accel_run', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_RUN);
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("stepper1"), "NAME");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_ACCELSTEPPER_RUN_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        return `${name}.run();\n`;
    });

    registerBlock('stepper_accel_move', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_MOVE);
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("stepper1"), "NAME");
            this.appendValueInput("POS")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_POS);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_ACCELSTEPPER_MOVE_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        const pos = arduinoGenerator.valueToCode(block, 'POS', Order.ATOMIC) || '0';
        return `${name}.moveTo(${pos});\n`;
    });

};

export const AccelStepperModule: BlockModule = {
    id: 'hardware.stepper_adv',
    name: 'Advanced Steppers',
    category: 'Motors',
    init
};
