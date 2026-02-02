/**
 * ============================================================
 * AccelStepper 高级步进电机模块
 * ============================================================
 * 
 * 提供 AccelStepper 库积木:
 * - stepper_accel_init: 初始化 (类型/引脚)
 * - stepper_accel_setup: 设置速度/加速度
 * - stepper_accel_run: 运行步进
 * - stepper_accel_move: 移动到位置
 * 
 * 使用 AccelStepper.h 库，支持非阻塞运动。
 * 
 * @file src/modules/hardware/stepper_adv.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化高级步进电机 (AccelStepper)
    registerBlock('stepper_accel_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_INIT);
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("stepper1"), "NAME"); // 实例名称
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_TYPE)
                .appendField(new Blockly.FieldDropdown([
                    ["DRIVER (2 Pins)", "1"],
                    ["FULL4WIRE (4 Pins)", "4"],
                    ["FULL3WIRE (3 Pins)", "3"],
                    ["HALF4WIRE (8 Pins)", "8"]
                ]), "TYPE"); // 电机驱动类型
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

        // 包含 AccelStepper 库
        arduinoGenerator.addInclude('accel_stepper_lib', '#include <AccelStepper.h>');

        // 根据接线方式 (2/3/4 线) 构造参数列表
        let args = `${type}, ${p1}, ${p2}`;
        if (type === '4' || type === '8') {
            args += `, ${p3}, ${p4}`;
        }

        // 定义全局步进电机对象
        arduinoGenerator.addVariable(`stepper_accel_${name}`, `AccelStepper ${name}(${args});`);

        return '';
    });

    // 配置步进电机的运行速度和加速度
    registerBlock('stepper_accel_setup', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_SETUP); // 设置加速步进
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("stepper1"), "NAME"); // 实例名称
            this.appendValueInput("SPEED")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_MAX_SPEED); // 最大速度
            this.appendValueInput("ACCEL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_ACCEL); // 加速度
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_ACCELSTEPPER_SETUP_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        const speed = arduinoGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '1000';
        const accel = arduinoGenerator.valueToCode(block, 'ACCEL', Order.ATOMIC) || '500';
        // 动态设置其物理参数
        return `
    ${name}.setMaxSpeed(${speed});
    ${name}.setAcceleration(${accel});\n`;
    });

    // 驱动步进电机运行一个微步 (需放入循环中高频调用)
    registerBlock('stepper_accel_run', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_RUN); // 处理步进
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("stepper1"), "NAME");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_ACCELSTEPPER_RUN_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        // run() 是非阻塞的，它会根据设定的速度计算当前时刻是否需要产生脉冲
        return `${name}.run();\n`;
    });

    // 控制步进电机移动到绝对目标位置
    registerBlock('stepper_accel_move', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_MOVE); // 移动到
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("stepper1"), "NAME");
            this.appendValueInput("POS")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ACCELSTEPPER_POS); // 位置
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_ACCELSTEPPER_MOVE_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        const pos = arduinoGenerator.valueToCode(block, 'POS', Order.ATOMIC) || '0';
        // 设置绝对目标步数，实际运动由 run() 函数在循环中驱动执行
        return `${name}.moveTo(${pos});\n`;
    });

};

/**
 * 高级步进电机模块 (AccelStepper)
 * 基于 AccelStepper 库，支持梯形加减速控制、多电机同步运行以及非阻塞控制模式。
 */
export const AccelStepperModule: BlockModule = {
    id: 'hardware.stepper_adv',
    name: 'Advanced Steppers',
    init
};
