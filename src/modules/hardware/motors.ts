/**
 * ============================================================
 * 电机模块 (Motors Module)
 * ============================================================
 * 
 * 提供电机控制积木:
 * - 直流电机 (L298N): 前进、后退、停止，可调速度
 * - 步进电机 (Stepper.h): 配置和步进控制
 * 
 * @file src/modules/hardware/motors.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // DC Motor (Generic L298N style or 2-pin control)
    // =========================================================================
    // 运行直流电机 (支持前进、后退、停止)
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

        // 在 setup 中将引脚设为输出模式
        arduinoGenerator.addSetup(`motor_setup_${pinA}_${pinB}`, `pinMode(${pinA}, OUTPUT);\npinMode(${pinB}, OUTPUT);`);

        let code = '';
        if (dir === 'FWD') {
            // 前进：A 推 PWM 信号（速控），B 接低电平
            code = `analogWrite(${pinA}, ${speed});\ndigitalWrite(${pinB}, LOW);\n`;
        } else if (dir === 'BWD') {
            // 后退：A 接低电平，B 推 PWM 信号（速控）
            code = `digitalWrite(${pinA}, LOW);\nalogWrite(${pinB}, ${speed});\n`;
        } else {
            // 停止：双端拉低
            code = `digitalWrite(${pinA}, LOW);\ndigitalWrite(${pinB}, LOW);\n`;
        }

        return code;
    });

    // =========================================================================
    // Stepper Motor (Stepper.h)
    // =========================================================================
    // 配置标准步进电机 (基于 Arduino 官方 Stepper 库)
    registerBlock('motor_stepper_config', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_STEPPER_CONFIG);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_STEPS_REV)
                .appendField(new Blockly.FieldNumber(2048), "STEPS"); // 每转步数 (例如 28BYJ-48 为 2048)
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

        // 包含步进电机核心库
        arduinoGenerator.addInclude('stepper_lib', '#include <Stepper.h>');
        // 实例化 Stepper 对象。注意：Stepper 库在 4 线模式下通常推荐使用 1-3-2-4 的引脚顺序
        arduinoGenerator.addVariable('stepper_def', `Stepper myStepper(${steps}, ${p1}, ${p3}, ${p2}, ${p4});`);

        return '';
    });

    // 驱动步进电机移动
    registerBlock('motor_stepper_step', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MOTOR_STEPPER_MOVE);
            this.appendValueInput("STEPS")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MOTOR_STEPS); // 步数 (正数为一个方向，负数为另一个方向)
            this.appendValueInput("SPEED")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MOTOR_SPEED_RPM); // 速度 (RPM: 每分钟转数)
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_MOTOR_STEPPER_MOVE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const steps = arduinoGenerator.valueToCode(block, 'STEPS', Order.ATOMIC) || '0';
        const speed = arduinoGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '10';

        // 设置速度并执行步进。注意：step() 是阻塞执行的
        return `myStepper.setSpeed(${speed});\nmyStepper.step(${steps});\n`;
    });

};

/**
 * 基础电机控制模块
 * 提供直流电机 (PWM) 和标准 4 线步进电机的控制功能。
 */
export const MotorsModule: BlockModule = {
    id: 'hardware.motors',
    name: 'Motors',
    init
};
