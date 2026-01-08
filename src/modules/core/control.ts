// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('pid_create', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PID_SETUP);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PID_NAME)
                .appendField(new Blockly.FieldTextInput("myPID"), "NAME");
            this.appendValueInput("INPUT")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_INPUT);
            this.appendValueInput("OUTPUT")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_OUTPUT);
            this.appendValueInput("SETPOINT")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_SETPOINT);
            this.appendValueInput("KP")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KP || "Kp");
            this.appendValueInput("KI")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KI || "Ki");
            this.appendValueInput("KD")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KD || "Kd");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_PID_SETUP_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        // NOTE: PID library expects pointers/references to global variables usually. 
        // We will assume the user provides Global variables via the Variables block which returns "varName".
        // But valueToCode returns code.
        // We need to strip standard value wrappers maybe?
        // Actually, if user puts a Variable getter block, it returns "varName".
        // PID(&Input, &Output, &Setpoint, Kp, Ki, Kd, DIRECT)

        const input = arduinoGenerator.valueToCode(block, 'INPUT', Order.ATOMIC) || 'inputVar';
        const output = arduinoGenerator.valueToCode(block, 'OUTPUT', Order.ATOMIC) || 'outputVar';
        const setpoint = arduinoGenerator.valueToCode(block, 'SETPOINT', Order.ATOMIC) || 'setpointVar';

        const kp = arduinoGenerator.valueToCode(block, 'KP', Order.ATOMIC) || '1.0';
        const ki = arduinoGenerator.valueToCode(block, 'KI', Order.ATOMIC) || '0.0';
        const kd = arduinoGenerator.valueToCode(block, 'KD', Order.ATOMIC) || '0.0';

        arduinoGenerator.addInclude('pid_lib', '#include <PID_v1.h>');

        // Define PID object globally using variable references
        // Note: The library binds to these variables. They MUST exist globally.
        arduinoGenerator.addVariable('pid_' + name, `PID ${name}(&${input}, &${output}, &${setpoint}, ${kp}, ${ki}, ${kd}, DIRECT);`);

        arduinoGenerator.addSetup('pid_begin_' + name, `${name}.SetMode(AUTOMATIC);`);

        return '';
    });

    registerBlock('pid_compute', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PID_COMPUTE)
                .appendField(new Blockly.FieldTextInput("myPID"), "NAME");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_PID_COMPUTE_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        return `${name}.Compute();\n`;
    });

    registerBlock('pid_tunings', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PID_TUNINGS)
                .appendField(new Blockly.FieldTextInput("myPID"), "NAME");
            this.appendValueInput("KP")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KP || "Kp");
            this.appendValueInput("KI")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KI || "Ki");
            this.appendValueInput("KD")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KD || "Kd");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_PID_TUNINGS_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        const kp = arduinoGenerator.valueToCode(block, 'KP', Order.ATOMIC) || '1.0';
        const ki = arduinoGenerator.valueToCode(block, 'KI', Order.ATOMIC) || '0.0';
        const kd = arduinoGenerator.valueToCode(block, 'KD', Order.ATOMIC) || '0.0';
        return `${name}.SetTunings(${kp}, ${ki}, ${kd});\n`;
    });
};

export const ControlModule: BlockModule = {
    id: 'core.control',
    name: 'Control Systems',
    category: 'Control',
    init
};
