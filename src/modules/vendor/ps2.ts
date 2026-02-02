/**
 * ============================================================
 * PS2 游戏手柄模块 (PS2 Controller)
 * ============================================================
 * 
 * 提供 PS2 无线/有线手柄积木:
 * - ps2_init: 初始化 (CLK/CMD/ATT/DAT)
 * - ps2_button: 读取按钮状态
 * - ps2_analog: 读取摇杆模拟值
 * 
 * 使用 PS2X_lib.h 库。
 * 
 * @file src/modules/vendor/ps2.ts
 * @module EmbedBlocks/Frontend/Modules/Vendor
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化 PS2 手柄
    registerBlock('ps2_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_CLOCK)
                .appendField(new Blockly.FieldTextInput("13"), "CLK");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_CMD)
                .appendField(new Blockly.FieldTextInput("11"), "CMD");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_ATT)
                .appendField(new Blockly.FieldTextInput("10"), "ATT");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_DATA)
                .appendField(new Blockly.FieldTextInput("12"), "DAT");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_PS2_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const clk = block.getFieldValue('CLK');
        const cmd = block.getFieldValue('CMD');
        const att = block.getFieldValue('ATT');
        const dat = block.getFieldValue('DAT');

        // 包含 PS2X 库
        arduinoGenerator.addInclude('ps2_lib', '#include <PS2X_lib.h>');
        // 定义 PS2X 对象和错误变量
        arduinoGenerator.addVariable('ps2_obj', `PS2X ps2x;`);
        arduinoGenerator.addVariable('ps2_err', `int ps2_error = 0;`);

        // 在 Setup 中配置手柄
        arduinoGenerator.addSetup('ps2_begin', `ps2_error = ps2x.config_gamepad(${clk}, ${cmd}, ${att}, ${dat}, true, true);`);
        arduinoGenerator.addSetup('ps2_check', `if(ps2_error == 0) Serial.println("Found Controller");`);

        // 注意：此处代码假设生成器支持 addLoop 方法用于在 loop() 中持续读取手柄状态
        // 若生成器不支持，需查阅 arduino-base.ts 的实现
        if ((arduinoGenerator as any).addLoop) {
            (arduinoGenerator as any).addLoop('ps2_read', `ps2x.read_gamepad(false, 0); // 读取手柄状态`);
        }

        return '';
    });

    // 检测按钮是否按下
    registerBlock('ps2_button', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_BTN_PRESSED)
                .appendField(new Blockly.FieldDropdown([
                    ["Start", "PSB_START"],
                    ["Select", "PSB_SELECT"],
                    ["Up", "PSB_PAD_UP"],
                    ["Down", "PSB_PAD_DOWN"],
                    ["Left", "PSB_PAD_LEFT"],
                    ["Right", "PSB_PAD_RIGHT"],
                    ["Square", "PSB_SQUARE"],
                    ["Circle", "PSB_CIRCLE"],
                    ["Cross", "PSB_CROSS"],
                    ["Triangle", "PSB_TRIANGLE"],
                    ["L1", "PSB_L1"],
                    ["R1", "PSB_R1"]
                ]), "BTN");
            this.setOutput(true, "Boolean");
            this.setColour(30);
        }
    }, (block: any) => {
        const btn = block.getFieldValue('BTN');
        // 调用 ps2x.Button 方法读取按钮状态
        return [`ps2x.Button(${btn})`, Order.ATOMIC];
    });

    // 读取摇杆模拟值
    registerBlock('ps2_analog', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_READ_ANA)
                .appendField(new Blockly.FieldDropdown([
                    ["Left Stick X", "PSS_LX"],
                    ["Left Stick Y", "PSS_LY"],
                    ["Right Stick X", "PSS_RX"],
                    ["Right Stick Y", "PSS_RY"]
                ]), "AXIS");
            this.setOutput(true, "Number");
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_PS2_READ_TOOLTIP);
        }
    }, (block: any) => {
        const axis = block.getFieldValue('AXIS');
        // 调用 ps2x.Analog 方法读取模拟值
        return [`ps2x.Analog(${axis})`, Order.ATOMIC];
    });

};

export const PS2ControllerModule: BlockModule = {
    id: 'vendor.ps2',
    name: 'PS2 Controller',
    init
};
