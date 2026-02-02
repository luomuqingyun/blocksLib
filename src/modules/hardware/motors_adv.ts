/**
 * ============================================================
 * 高级电机模块 (Step/Dir Stepper Drivers - A4988/DRV8825)
 * ============================================================
 * 
 * 提供步进电机驱动器积木:
 * - motor_stepper_driver_init: 初始化 (STEP/DIR 引脚)
 * - motor_stepper_driver_step: 步进移动
 * - motor_stepper_enable: 使能控制
 * - motor_stepper_move_relative: 相对位置移动
 * 
 * 适用于 A4988、DRV8825 等驱动板。
 * 
 * @file src/modules/hardware/motors_adv.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // 步进电机驱动器 (A4988, DRV8825 等 STEP/DIR 协议)
    // =========================================================================

    // 初始化步进电机驱动器 (A4988 / DRV8825 等)
    registerBlock('motor_stepper_driver_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_DRIVER_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_STEP_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "STEP"); // 步进脉冲引脚
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_DIR_PIN)
                .appendField(new Blockly.FieldTextInput("4"), "DIR");  // 方向控制引脚
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

        // 在 setup 中初始化步进和方向引脚为输出模式
        arduinoGenerator.addSetup(`stepper_driver_${step}_${dir}`, `pinMode(${step}, OUTPUT);\npinMode(${dir}, OUTPUT);`);
        return '';
    });

    // 驱动步进电机移动指定的步数
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
                .appendField(new Blockly.FieldDropdown([["CW (正传)", "HIGH"], ["CCW (反转)", "LOW"]]), "D"); // 正转/反转
            this.appendValueInput("DELAY")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_STEPPER_DELAY); // 脉冲间隔微秒
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

        // 阻塞式实现：通过循环发送高低电平脉冲驱动电机
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

    // 控制步进电机的使能引脚 (Enable Pin)
    registerBlock('motor_stepper_enable', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_ENABLE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("8"), "PIN"); // 通常为 A4988 的 EN 引脚
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STEPPER_STATE)
                .appendField(new Blockly.FieldDropdown([["使能 (低电平)", "LOW"], ["断开 (高电平)", "HIGH"]]), "STATE"); // 典型驱动器低电平使能
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

    // 基于当前位置的相对移动 (支持正负步数)
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
                .appendField(Blockly.Msg.ARD_STEPPER_STEPS_REL); // 输入正负值控制方向
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

        // 生成辅助函数处理正负步数逻辑
        const funcName = 'stepper_move_rel';
        arduinoGenerator.functions_[funcName] = `
void ${funcName}(int stepPin, int dirPin, long steps, int delayTime) {
  int d = (steps > 0) ? HIGH : LOW; // 根据正负号判断方向
  digitalWrite(dirPin, d);
  long s = abs(steps); // 取绝对值进行循环
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

/**
 * 高级电机控制模块
 * 专门用于 STEP/DIR 接口的步进驱动芯片（如 A4988, DRV8825, TMC 系列等）。
 */
export const AdvancedMotorsModule: BlockModule = {
    id: 'hardware.motors_adv',
    name: 'Advanced Motors',
    init
};
