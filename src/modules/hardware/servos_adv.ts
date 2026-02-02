/**
 * ============================================================
 * 高级舵机模块 (PCA9685 16-Channel PWM Driver)
 * ============================================================
 * 
 * 提供 PCA9685 I2C PWM 扩展积木:
 * - pca9685_init: 初始化 (地址/频率)
 * - pca9685_set_servo: 设置舵机角度
 * - pca9685_set_pwm: 设置原始 PWM 值
 * 
 * 使用 Adafruit_PWMServoDriver.h 库。
 * 
 * @file src/modules/hardware/servos_adv.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化 PCA9685 16 路 PWM 驱动器
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

        // 包含 I2C 库和 Adafruit 驱动库
        arduinoGenerator.addInclude('wire_lib', '#include <Wire.h>');
        arduinoGenerator.addInclude('pca_lib', '#include <Adafruit_PWMServoDriver.h>');
        // 定义全局驱动器对象 (支持多个模块共存)
        arduinoGenerator.addVariable(`pca_obj_${addr}`, `Adafruit_PWMServoDriver pwm_${addr} = Adafruit_PWMServoDriver(${addr});`);

        // 在 setup 中启动通信并设置输出频率 (舵机通常使用 50Hz)
        arduinoGenerator.addSetup(`pca_init_${addr}`, `
  pwm_${addr}.begin();
  pwm_${addr}.setPWMFreq(${freq});
`);
        return '';
    });

    // 设置 PCA9685 扩展板上指定通道的舵机角度
    registerBlock('pca9685_set_servo', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCA9685_SET_SERVO);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PCA9685_ADDR)
                .appendField(new Blockly.FieldTextInput("0x40"), "ADDR"); // I2C 地址
            this.appendValueInput("CH")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PCA9685_CHANNEL); // 通道 (0-15)
            this.appendValueInput("ANGLE")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PCA9685_ANGLE); // 角度 (0-180)
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_SERVO_PCA_WRITE_TOOLTIP);
        }
    }, (block: any) => {
        const addr = block.getFieldValue('ADDR');
        const ch = arduinoGenerator.valueToCode(block, 'CH', Order.ATOMIC) || '0';
        const angle = arduinoGenerator.valueToCode(block, 'ANGLE', Order.ATOMIC) || '90';

        // 生成辅助函数，将角度映射为脉冲计数值
        // 标准舵机工作频率为 50Hz，对应 20ms 周期。
        // PCA9685 的分辨率为 12位 (4096 级)。
        // 1ms 约为 205 ticks，2ms 约为 410 ticks。通常映射范围在 150-600 之间。
        const funcName = `setServoPulse_${addr}`;
        arduinoGenerator.addFunction(funcName, `
void ${funcName}(uint8_t n, double angle) {
  double pulse = map(angle, 0, 180, 150, 600); // 将 0-180 度映射为典型的 PWM 宽度
  pwm_${addr}.setPWM(n, 0, pulse);
}`);
        return `${funcName}(${ch}, ${angle});\n`;
    });

    // 直接设置 PCA9685 指定通道的 PWM 原始参数
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
                .appendField(Blockly.Msg.ARD_PCA9685_ON); // 脉冲开启时刻 (0-4095)
            this.appendValueInput("OFF")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PCA9685_OFF); // 脉冲结束时刻 (0-4095)
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

/**
 * 高级舵机控制模块 (PCA9685)
 * 通过 I2C 接口扩展 16 路独立 PWM 输出，专门用于大规模舵机控制或 LED 调光。
 */
export const ServosAdvModule: BlockModule = {
    id: 'hardware.servos_adv',
    name: 'Advanced Servos (PCA9685)',
    init
};
