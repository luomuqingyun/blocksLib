/**
 * ============================================================
 * 舵机模块 (Servo Motors Module)
 * ============================================================
 * 
 * 提供标准舵机控制积木 (Servo.h):
 * - arduino_servo_attach: 连接舵机到引脚
 * - arduino_servo_write: 设置角度 (0-180°)
 * - arduino_servo_read: 读取当前角度
 * - arduino_servo_detach: 断开舵机
 * 
 * @file src/modules/hardware/servo.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册与舵机控制相关的积木块。
 */
const init = () => {

    // 将舵机对象绑定到指定引脚并进入初始化状态
    registerBlock('arduino_servo_attach', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERVO_ATTACH); // 连接舵机
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("9"), "PIN"); // 信号引脚
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_SERVO_ATTACH_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'OUTPUT');

        // 包含 Arduino 官方舵机库
        arduinoGenerator.addInclude('servo_lib', '#include <Servo.h>');
        // 定义引脚专属的全局舵机对象
        arduinoGenerator.addVariable(`servo_${pin}`, `Servo servo_${pin};`);
        // 在 setup 中执行 attach 操作
        arduinoGenerator.addSetup(`servo_attach_${pin}`, `servo_${pin}.attach(${pin});`);

        return '';
    });

    // 控制舵机转动到指定角度
    registerBlock('arduino_servo_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERVO_WRITE) // 设置舵机
                .appendField(new Blockly.FieldTextInput("9"), "PIN")
                .appendField(Blockly.Msg.ARD_SERVO_ANGLE); // 角度
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

        // 包含 Arduino 官方 Servo 库
        arduinoGenerator.addInclude('servo_lib', '#include <Servo.h>');
        // 为该引脚定义独立的静态 Servo 对象
        arduinoGenerator.addVariable(`servo_${pin}`, `Servo servo_${pin};`);
        // 在 setup 中将其与引脚绑定
        arduinoGenerator.addSetup(`servo_attach_${pin}`, `servo_${pin}.attach(${pin});`);

        // 执行写入角度指令 (0-180度)
        return `servo_${pin}.write(${angle});\n`;
    });

    // 读取该引脚舵机当前设定的角度数值
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
        // 返回当前的 PWM 脉冲对应的逻辑角度
        return [`servo_${pin}.read()`, Order.ATOMIC];
    });

    // 断开舵机与引脚的绑定（释放 PWM 资源且舵机不再受控保持力矩）
    registerBlock('arduino_servo_detach', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERVO_DETACH); // 断开舵机
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

/**
 * 舵机控制模块
 * 封装了对 180 度舵机的初始化、旋转控制和引脚回收功能，兼容常用的 SG90/MG995 等型号。
 */
export const ServoModule: BlockModule = {
    id: 'hardware.servo',
    name: 'Servo Motors',
    init
};
