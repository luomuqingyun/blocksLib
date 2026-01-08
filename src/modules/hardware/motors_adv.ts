import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // Step/Dir Stepper Driver (A4988, DRV8825)
    // =========================================================================

    registerBlock('motor_stepper_driver_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_DRIVER_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_STEP_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "STEP");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_DIR_PIN)
                .appendField(new Blockly.FieldTextInput("4"), "DIR");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_STEPPER_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const step = block.getFieldValue('STEP');
        const dir = block.getFieldValue('DIR');

        reservePin(block, step, 'OUTPUT');
        reservePin(block, dir, 'OUTPUT');

        arduinoGenerator.addSetup(`stepper_driver_${step}_${dir}`, `pinMode(${step}, OUTPUT);\npinMode(${dir}, OUTPUT);`);
        return '';
    });

    registerBlock('motor_stepper_driver_step', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_DRIVER_MOVE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_STEP_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "STEP");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_DIR_PIN)
                .appendField(new Blockly.FieldTextInput("4"), "DIR");
            this.appendValueInput("STEPS")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_STEPPER_STEPS);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_DIR)
                .appendField(new Blockly.FieldDropdown([["CW", "HIGH"], ["CCW", "LOW"]]), "D");
            this.appendValueInput("DELAY")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_STEPPER_DELAY);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_STEPPER_MOVE_MAN_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const step = block.getFieldValue('STEP');
        const dir = block.getFieldValue('DIR');
        const steps = arduinoGenerator.valueToCode(block, 'STEPS', Order.ATOMIC) || '0';
        const d = block.getFieldValue('D');
        const delay = arduinoGenerator.valueToCode(block, 'DELAY', Order.ATOMIC) || '1000';

        // Clean room implementation: Blocking loop
        return `
digitalWrite(${dir}, ${d});
for(int i=0; i<${steps}; i++) {
  digitalWrite(${step}, HIGH);
  delayMicroseconds(${delay});
  digitalWrite(${step}, LOW);
  delayMicroseconds(${delay});
}
`;
    });

    registerBlock('motor_stepper_enable', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_ENABLE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("8"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_STATE)
                .appendField(new Blockly.FieldDropdown([["Enable (LOW)", "LOW"], ["Disable (HIGH)", "HIGH"]]), "STATE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_STEPPER_CTRL_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const state = block.getFieldValue('STATE');
        reservePin(block, pin, 'OUTPUT');
        arduinoGenerator.addSetup(`stepper_en_${pin}`, `pinMode(${pin}, OUTPUT);`);
        return `digitalWrite(${pin}, ${state});\n`;
    });

    registerBlock('motor_stepper_move_relative', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_MOVE_REL);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_STEP_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "STEP");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_DIR_PIN)
                .appendField(new Blockly.FieldTextInput("4"), "DIR");
            this.appendValueInput("STEPS")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_STEPPER_STEPS_REL);
            this.appendValueInput("DELAY")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_STEPPER_DELAY);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_STEPPER_MOVE_STP_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const step = block.getFieldValue('STEP');
        const dir = block.getFieldValue('DIR');
        const steps = arduinoGenerator.valueToCode(block, 'STEPS', Order.ATOMIC) || '0';
        const delay = arduinoGenerator.valueToCode(block, 'DELAY', Order.ATOMIC) || '1000';

        // Helper function to handle signed steps
        const funcName = 'stepper_move_rel';
        arduinoGenerator.functions_[funcName] = `
void ${funcName}(int stepPin, int dirPin, long steps, int delayTime) {
  int d = (steps > 0) ? HIGH : LOW;
  digitalWrite(dirPin, d);
  long s = abs(steps);
  for(long i=0; i<s; i++) {
    digitalWrite(stepPin, HIGH);
    delayMicroseconds(delayTime);
    digitalWrite(stepPin, LOW);
    delayMicroseconds(delayTime);
  }
}`;
        return `${funcName}(${step}, ${dir}, ${steps}, ${delay});\n`;
    });

};

export const AdvancedMotorsModule: BlockModule = {
    id: 'hardware.motors_adv',
    name: 'Advanced Motors',
    category: 'Adv Motors',
    init
};
