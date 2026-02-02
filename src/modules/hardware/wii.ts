/**
 * ============================================================
 * Wii Nunchuck 控制器模块 (Wii Controller Input)
 * ============================================================
 * 
 * 提供 Wii Nunchuck I2C 控制器积木:
 * - wii_init: 初始化
 * - wii_update: 更新数据
 * - wii_read_axis: 读取摇杆/加速度
 * - wii_button: 读取按钮 (C/Z)
 * 
 * 使用 Wiichuck.h 库。
 * 
 * @file src/modules/hardware/wii.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // Wii Nunchuck (WiiChuck.h)
    // =========================================================================

    // 初始化 Wii Nunchuck 控制器
    registerBlock('wii_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WII_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
            this.setTooltip(Blockly.Msg.ARD_WII_INIT_TOOLTIP);
        }
    }, (block: any) => {
        // 包含 I2C 和 Wiichuck 库
        arduinoGenerator.addInclude('wire_lib', '#include <Wire.h>');
        arduinoGenerator.addInclude('wiichuck_lib', '#include <Wiichuck.h>');
        // 定义全局控制器对象
        arduinoGenerator.addVariable('wiichuck_obj', `Wiichuck wii;`);
        // 在 setup 中启动并执行初次数据同步
        arduinoGenerator.addSetup('wii_init', `wii.begin();\n  wii.update();`);

        return '';
    });

    // 更新 Wii Nunchuck 控制器的数据（从 I2C 读取当前状态）
    registerBlock('wii_update', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WII_UPDATE); // 更新手柄数据
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
            this.setTooltip(Blockly.Msg.ARD_WII_READ_TOOLTIP);
        }
    }, (block: any) => {
        // 调用库的 update 方法，并稍作延迟以保证 I2C 通信稳定
        return `chuck.update();\ndelay(20);\n`;
    });

    // 读取指定的摇杆或加速度计轴向数值
    registerBlock('wii_read_axis', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WII_READ)
                .appendField(new Blockly.FieldDropdown([
                    ["摇杆 X", "readJoyX()"],
                    ["摇杆 Y", "readJoyY()"],
                    ["加速度 X", "readAccelX()"],
                    ["加速度 Y", "readAccelY()"],
                    ["加速度 Z", "readAccelZ()"],
                    ["翻滚角 (Roll)", "readRoll()"],
                    ["俯仰角 (Pitch)", "readPitch()"]
                ]), "AXIS");
            this.setOutput(true, "Number");
            this.setColour(260);
            this.setTooltip(Blockly.Msg.ARD_WII_AXIS_TOOLTIP);
        }
    }, (block: any) => {
        const axis = block.getFieldValue('AXIS');
        // 返回之前 update 后缓存的轴向传感器数值
        return [`chuck.${axis}`, Order.ATOMIC];
    });

    // 检测 C 或 Z 按键是否按下
    registerBlock('wii_button', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WII_BUTTON) // 手柄按键
                .appendField(new Blockly.FieldDropdown([["C (小键)", "cPressed"], ["Z (大键)", "zPressed"]]), "BTN");
            this.setOutput(true, "Boolean");
            this.setColour(260);
            this.setTooltip(Blockly.Msg.ARD_WII_BTN_TOOLTIP);
        }
    }, (block: any) => {
        const btn = block.getFieldValue('BTN');
        // 返回按钮的布尔状态
        return [`chuck.button${btn}`, Order.ATOMIC];
    });
};

/**
 * Wii Nunchuck 控制器模块
 * 通过 I2C 协议连接经典 Wii 双节棍手柄，获取摇杆（X, Y）、三轴加速度、角度以及两个功能按键的状态。
 */
export const WiiModule: BlockModule = {
    id: 'hardware.wii',
    name: 'Wii Nunchuck',
    init
};
