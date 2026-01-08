import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';
import { FieldAngle } from '@blockly/field-angle';

const init = () => {

    // =========================================================================
    // Servo Motor (Servo.h)
    // =========================================================================

    registerBlock('arduino_servo_attach', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERVO_ATTACH);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("9"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_SERVO_ATTACH_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'OUTPUT');

        arduinoGenerator.addInclude('servo_lib', '#include <Servo.h>');
        arduinoGenerator.addVariable(`servo_${pin}`, `Servo servo_${pin};`);
        arduinoGenerator.addSetup(`servo_attach_${pin}`, `servo_${pin}.attach(${pin});`);

        return '';
    });

    registerBlock('arduino_servo_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERVO_WRITE)
                .appendField(new Blockly.FieldTextInput("9"), "PIN")
                .appendField(Blockly.Msg.ARD_SERVO_ANGLE);
            this.appendValueInput("ANGLE").setCheck("Number");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_SERVO_WRITE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const angle = arduinoGenerator.valueToCode(block, 'ANGLE', Order.ATOMIC) || '90';

        reservePin(block, pin, 'OUTPUT');

        arduinoGenerator.addInclude('servo_lib', '#include <Servo.h>');
        arduinoGenerator.addVariable(`servo_${pin}`, `Servo servo_${pin};`);
        arduinoGenerator.addSetup(`servo_attach_${pin}`, `servo_${pin}.attach(${pin});`);

        return `servo_${pin}.write(${angle});\n`;
    });

    registerBlock('arduino_servo_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERVO_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("9"), "PIN");
            this.setOutput(true, "Number");
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_SERVO_READ_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        return [`servo_${pin}.read()`, Order.ATOMIC];
    });

    registerBlock('arduino_servo_detach', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERVO_DETACH);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("9"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_SERVO_DETACH_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        return `servo_${pin}.detach();\n`;
    });

};

export const ServoModule: BlockModule = {
    id: 'hardware.servo',
    name: 'Servo Motors',
    category: 'Servo',
    init
};
