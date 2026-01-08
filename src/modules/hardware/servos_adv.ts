// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('pca9685_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCA9685_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCA9685_ADDR)
                .appendField(new Blockly.FieldTextInput("0x40"), "ADDR");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCA9685_FREQ)
                .appendField(new Blockly.FieldTextInput("50"), "FREQ");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_SERVO_PCA_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const addr = block.getFieldValue('ADDR');
        const freq = block.getFieldValue('FREQ');

        arduinoGenerator.addInclude('wire_lib', '#include <Wire.h>');
        arduinoGenerator.addInclude('pca_lib', '#include <Adafruit_PWMServoDriver.h>');
        arduinoGenerator.addVariable(`pca_obj_${addr}`, `Adafruit_PWMServoDriver pwm_${addr} = Adafruit_PWMServoDriver(${addr});`);

        arduinoGenerator.addSetup(`pca_init_${addr}`, `
  pwm_${addr}.begin();
  pwm_${addr}.setPWMFreq(${freq});
`);
        return '';
    });

    registerBlock('pca9685_set_servo', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCA9685_SET_SERVO);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCA9685_ADDR)
                .appendField(new Blockly.FieldTextInput("0x40"), "ADDR");
            this.appendValueInput("CH")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PCA9685_CHANNEL);
            this.appendValueInput("ANGLE")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PCA9685_ANGLE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_SERVO_PCA_WRITE_TOOLTIP);
        }
    }, (block: any) => {
        const addr = block.getFieldValue('ADDR');
        const ch = arduinoGenerator.valueToCode(block, 'CH', Order.ATOMIC) || '0';
        const angle = arduinoGenerator.valueToCode(block, 'ANGLE', Order.ATOMIC) || '90';

        // Helper function to map angle to pulse
        // Standard Servo: 50Hz, 1ms-2ms pulse. 
        // 4096 ticks per cycle (20ms).
        // 1ms = 205 ticks approx. 2ms = 410 ticks.
        // Usually roughly 150 to 600 map.
        const funcName = `setServoPulse_${addr}`;
        arduinoGenerator.addFunction(funcName, `
void ${funcName}(uint8_t n, double angle) {
  double pulse = map(angle, 0, 180, 150, 600); // Approximate generic map
  pwm_${addr}.setPWM(n, 0, pulse);
}`);
        return `${funcName}(${ch}, ${angle});\n`;
    });

    registerBlock('pca9685_set_pwm', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCA9685_SET_PWM);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCA9685_ADDR)
                .appendField(new Blockly.FieldTextInput("0x40"), "ADDR");
            this.appendValueInput("CH")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PCA9685_CHANNEL);
            this.appendValueInput("ON")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PCA9685_ON);
            this.appendValueInput("OFF")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PCA9685_OFF);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_SERVO_PCA_PWM_TOOLTIP);
        }
    }, (block: any) => {
        const addr = block.getFieldValue('ADDR');
        const ch = arduinoGenerator.valueToCode(block, 'CH', Order.ATOMIC) || '0';
        const on = arduinoGenerator.valueToCode(block, 'ON', Order.ATOMIC) || '0';
        const off = arduinoGenerator.valueToCode(block, 'OFF', Order.ATOMIC) || '4095';

        return `pwm_${addr}.setPWM(${ch}, ${on}, ${off});\n`;
    });

};

export const ServosAdvModule: BlockModule = {
    id: 'hardware.servos_adv',
    name: 'Advanced Servos (PCA9685)',
    category: 'Motors',
    init
};
