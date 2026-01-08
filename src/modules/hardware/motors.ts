import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // DC Motor (Generic L298N style or 2-pin control)
    // =========================================================================
    registerBlock('motor_dc_run', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_DC);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_PIN_A)
                .appendField(new Blockly.FieldTextInput("5"), "PINA");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_PIN_B)
                .appendField(new Blockly.FieldTextInput("6"), "PINB");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_ACTION)
                .appendField(new Blockly.FieldDropdown([[Blockly.Msg.ARD_MOTOR_FORWARD || "Forward", "FWD"], [Blockly.Msg.ARD_MOTOR_BACKWARD || "Backward", "BWD"], [Blockly.Msg.ARD_MOTOR_STOP || "Stop", "STOP"]]), "DIR");
            this.appendValueInput("SPEED")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MOTOR_SPEED);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_MOTOR_DC_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pinA = block.getFieldValue('PINA');
        const pinB = block.getFieldValue('PINB');
        const dir = block.getFieldValue('DIR');
        const speed = arduinoGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '255';

        reservePin(block, pinA, 'OUTPUT');
        reservePin(block, pinB, 'OUTPUT');

        arduinoGenerator.addSetup(`motor_setup_${pinA}_${pinB}`, `pinMode(${pinA}, OUTPUT);\npinMode(${pinB}, OUTPUT);`);

        let code = '';
        if (dir === 'FWD') {
            code = `analogWrite(${pinA}, ${speed});\ndigitalWrite(${pinB}, LOW);\n`;
        } else if (dir === 'BWD') {
            code = `digitalWrite(${pinA}, LOW);\nanalogWrite(${pinB}, ${speed});\n`;
        } else {
            code = `digitalWrite(${pinA}, LOW);\ndigitalWrite(${pinB}, LOW);\n`;
        }

        return code;
    });

    // =========================================================================
    // Stepper Motor (Stepper.h)
    // =========================================================================
    registerBlock('motor_stepper_config', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_STEPPER_CONFIG);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_STEPS_REV)
                .appendField(new Blockly.FieldNumber(2048), "STEPS");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_PIN1)
                .appendField(new Blockly.FieldTextInput("8"), "PIN1");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_PIN2)
                .appendField(new Blockly.FieldTextInput("9"), "PIN2");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_PIN3)
                .appendField(new Blockly.FieldTextInput("10"), "PIN3");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_PIN4)
                .appendField(new Blockly.FieldTextInput("11"), "PIN4");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_MOTOR_STEPPER_CONFIG_TOOLTIP);
        }
    }, (block: any) => {
        const steps = block.getFieldValue('STEPS');
        const p1 = block.getFieldValue('PIN1');
        const p2 = block.getFieldValue('PIN2');
        const p3 = block.getFieldValue('PIN3');
        const p4 = block.getFieldValue('PIN4');

        arduinoGenerator.addInclude('stepper_lib', '#include <Stepper.h>');
        arduinoGenerator.addVariable('stepper_def', `Stepper myStepper(${steps}, ${p1}, ${p3}, ${p2}, ${p4});`); // Note: Stepper lib often requires 1-3-2-4 order for 4-pin steppers

        return '';
    });

    registerBlock('motor_stepper_step', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_STEPPER_MOVE);
            this.appendValueInput("STEPS")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MOTOR_STEPS);
            this.appendValueInput("SPEED")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MOTOR_SPEED_RPM);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_MOTOR_STEPPER_MOVE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const steps = arduinoGenerator.valueToCode(block, 'STEPS', Order.ATOMIC) || '0';
        const speed = arduinoGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '10';

        return `myStepper.setSpeed(${speed});\nmyStepper.step(${steps});\n`;
    });

};

export const MotorsModule: BlockModule = {
    id: 'hardware.motors',
    name: 'Motors',
    category: 'Motors',
    init
};
