/**
 * ============================================================
 * 用户输入模块 (User Inputs Module)
 * ============================================================
 * 
 * 提供人机交互输入设备积木:
 * - 矩阵键盘 (Keypad.h): 4x4 按键初始化与读取
 * - 摇杆 (Joystick): 模拟轴读取
 * - 旋转编码器 (Encoder.h): 位置读取与复位
 * 
 * @file src/modules/hardware/inputs.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // 矩阵键盘 (Keypad.h)
    // =========================================================================

    // 初始化矩阵键盘 (Keypad.h)
    registerBlock('input_keypad_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_KEYPAD_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_ROWS)
                .appendField(new Blockly.FieldTextInput("9,8,7,6"), "R_PINS"); // 行引脚列表
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_COLS)
                .appendField(new Blockly.FieldTextInput("5,4,3,2"), "C_PINS"); // 列引脚列表
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_KEYPAD_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const rPins = block.getFieldValue('R_PINS');
        const cPins = block.getFieldValue('C_PINS');

        // 包含 Keypad 库
        // 定义 4x4 矩阵键盘配置及引脚映射，使用 hexaKeys 映射表
        arduinoGenerator.addInclude('keypad_lib', '#include <Keypad.h>');
        arduinoGenerator.addVariable('keypad_config', `
const byte ROWS = 4; 
const byte COLS = 4; 
char hexaKeys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {${rPins}}; 
byte colPins[COLS] = {${cPins}}; 

Keypad customKeypad = Keypad(makeKeymap(hexaKeys), rowPins, colPins, ROWS, COLS);`);

        return '';
    });

    // 获取当前按下的键值
    registerBlock('input_keypad_get_key', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_KEYPAD_GET);
            this.setOutput(true, "String");
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_KEYPAD_GET_TOOLTIP);
        }
    }, (block: any) => {
        // 返回 getKey() 的结果，若无按键则返回空字符
        return ['customKeypad.getKey()', Order.ATOMIC];
    });


    // =========================================================================
    // 摇杆 (Analog Joystick)
    // =========================================================================

    // 读取摇杆指定轴的模拟值
    registerBlock('input_joystick_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_JOYSTICK);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_AXIS)
                .appendField(new Blockly.FieldDropdown([["X", "X"], ["Y", "Y"]]), "AXIS");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("A0"), "PIN"); // 模拟输入引脚
            this.setOutput(true, "Number");
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_JOYSTICK_READ_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'INPUT');

        // 虽然界面分了 X/Y，实际上对应物理上的模拟引脚 read
        return [`analogRead(${pin})`, Order.ATOMIC];
    });


    // =========================================================================
    // 旋转编码器 (Encoder.h)
    // =========================================================================
    // 初始化旋转编码器 (Encoder.h)
    registerBlock('input_rotary_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_ROTARY_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_CLK_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "CLK"); // CLK/A 相引脚
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_DT_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "DT");  // DT/B 相引脚
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_ENCODER_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const clk = block.getFieldValue('CLK');
        const dt = block.getFieldValue('DT');

        reservePin(block, clk, 'INPUT');
        reservePin(block, dt, 'INPUT');

        // 包含 Encoder 核心库
        arduinoGenerator.addInclude('encoder_lib', '#include <Encoder.h>');
        // 为特定引脚组合定义独立的 Encoder 对象
        arduinoGenerator.addVariable(`encoder_${clk}_${dt}`, `Encoder myEnc_${clk}_${dt}(${clk}, ${dt});`);
        return '';
    });

    // 读取编码器的当前位置计数值
    registerBlock('input_rotary_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_ROTARY_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_CLK_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "CLK");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_DT_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "DT");
            this.setOutput(true, "Number");
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_ENCODER_READ_TOOLTIP);
        }
    }, (block: any) => {
        const clk = block.getFieldValue('CLK');
        const dt = block.getFieldValue('DT');
        // 调用 read() 方法获取从启动或复位以来的累计位移
        return [`myEnc_${clk}_${dt}.read()`, Order.ATOMIC];
    });

    // 将编码器的位置计数值重置为 0
    registerBlock('input_rotary_reset', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_ROTARY_RESET);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_CLK_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "CLK");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_INPUT_DT_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "DT");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(10);
            this.setTooltip(Blockly.Msg.ARD_ENCODER_RESET_TOOLTIP);
        }
    }, (block: any) => {
        const clk = block.getFieldValue('CLK');
        const dt = block.getFieldValue('DT');
        // 将计数器归零
        return `myEnc_${clk}_${dt}.write(0);\n`;
    });

};

/**
 * 交互输入模块
 * 封装了矩阵键盘、模拟摇杆及旋转编码器等常用人机交互设备的驱动逻辑。
 */
export const InputsModule: BlockModule = {
    id: 'hardware.inputs',
    name: 'User Inputs (Keypad/Stick)',
    init
};
