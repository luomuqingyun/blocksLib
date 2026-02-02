/**
 * ============================================================
 * mBot 机器人模块 (Makeblock mBot / mCore)
 * ============================================================
 * 
 * 提供 mBot 教育机器人积木:
 * - mbot_motor_move/stop: 运动控制
 * - mbot_ultrasonic: 超声波测距
 * - mbot_line_follower: 巡线传感器
 * - mbot_rgb: RGB LED 控制
 * 
 * 使用 MeMCore.h 库。
 * 
 * @file src/modules/robots/mbot.ts
 * @module EmbedBlocks/Frontend/Modules/Robots
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // mBot Setup & Forward/Backward (MeMCore.h)
    // =========================================================================

    // We assume standard mCore board usage.
    // Includes: MeMCore.h usually covers all standard mBot specific classes.

    // 控制 mBot 整体运动（前进、后退、左转、右转）
    registerBlock('mbot_motor_move', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MBOT_MOVE)
                .appendField(new Blockly.FieldDropdown([[Blockly.Msg.ARD_MOTOR_FORWARD, "1"], [Blockly.Msg.ARD_MOTOR_BACKWARD, "2"], [Blockly.Msg.ARD_MBOT_LEFT, "3"], [Blockly.Msg.ARD_MBOT_RIGHT, "4"]]), "DIR");
            this.appendValueInput("SPEED")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MOTOR_SPEED);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_MBOT_MOVE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const dir = block.getFieldValue('DIR');
        const speed = arduinoGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '100';

        // 包含 mCore 库，定义电机对象 (M1=9, M2=10)
        arduinoGenerator.addInclude('mcore_lib', '#include <MeMCore.h>');
        arduinoGenerator.addVariable('mbot_motors', 'MeDCMotor motor_9(9);\nMeDCMotor motor_10(10);\n');

        // 方向映射逻辑：前进、后退、左转、右转
        let code = '';
        if (dir === '1') { // 前进
            code = `motor_9.run(-${speed});\n  motor_10.run(${speed});\n`;
        } else if (dir === '2') { // 后退
            code = `motor_9.run(${speed});\n  motor_10.run(-${speed});\n`;
        } else if (dir === '3') { // 左转
            code = `motor_9.run(-${speed});\n  motor_10.run(-${speed});\n`;
        } else if (dir === '4') { // 右转
            code = `motor_9.run(${speed});\n  motor_10.run(${speed});\n`;
        }

        return code;
    });

    // 停止电机运动
    registerBlock('mbot_motor_stop', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MBOT_STOP);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_MBOT_STOP_TOOLTIP);
        }
    }, (block: any) => {
        return `motor_9.stop();\nmotor_10.stop();\n`;
    });


    // =========================================================================
    // mBot Sensors (Ultrasonic, Line Follower)
    // =========================================================================

    // 读取超声波传感器距离（厘米）
    registerBlock('mbot_ultrasonic', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MBOT_ULTRASONIC);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MBOT_PORT)
                .appendField(new Blockly.FieldDropdown([["Port 1", "1"], ["Port 2", "2"], ["Port 3", "3"], ["Port 4", "4"]]), "PORT");
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_MBOT_DISTANCE);
        }
    }, (block: any) => {
        const port = block.getFieldValue('PORT');
        arduinoGenerator.addInclude('mcore_lib', '#include <MeMCore.h>');
        // 为选定端口创建传感器实例
        arduinoGenerator.addVariable(`ultrasonic_${port}`, `MeUltrasonicSensor ultrasonic_${port}(${port});`);

        return [`ultrasonic_${port}.distanceCm()`, Order.ATOMIC];
    });

    // 读取巡线传感器状态
    registerBlock('mbot_line_follower', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MBOT_LINE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MBOT_PORT)
                .appendField(new Blockly.FieldDropdown([["Port 1", "1"], ["Port 2", "2"], ["Port 3", "3"], ["Port 4", "4"]]), "PORT");
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_MBOT_LINE_TOOLTIP);
        }
    }, (block: any) => {
        const port = block.getFieldValue('PORT');
        arduinoGenerator.addInclude('mcore_lib', '#include <MeMCore.h>');
        // 为选定端口创建巡线传感器对象
        arduinoGenerator.addVariable(`line_${port}`, `MeLineFollower line_${port}(${port});`);

        return [`line_${port}.readSensors()`, Order.ATOMIC];
    });

    // =========================================================================
    // mBot RGB LED & Extras
    // =========================================================================

    // 控制板载 RGB LED 颜色
    registerBlock('mbot_rgb', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MBOT_RGB);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MBOT_INDEX)
                .appendField(new Blockly.FieldDropdown([[Blockly.Msg.ARD_MBOT_ALL, "0"], [Blockly.Msg.ARD_MBOT_LEFT_1, "1"], [Blockly.Msg.ARD_MBOT_RIGHT_2, "2"]]), "IDX");
            this.appendValueInput("R").setCheck("Number").appendField("R");
            this.appendValueInput("G").setCheck("Number").appendField("G");
            this.appendValueInput("B").setCheck("Number").appendField("B");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_MBOT_RGB_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const idx = block.getFieldValue('IDX');
        const r = arduinoGenerator.valueToCode(block, 'R', Order.ATOMIC) || '0';
        const g = arduinoGenerator.valueToCode(block, 'G', Order.ATOMIC) || '0';
        const b = arduinoGenerator.valueToCode(block, 'B', Order.ATOMIC) || '0';

        // 标准 mBot 板载 RGB LED 位于接口 7，包含 2 个灯珠
        arduinoGenerator.addInclude('mcore_lib', '#include <MeMCore.h>');
        arduinoGenerator.addVariable('mbot_rgb_obj', `MeRGBLed rgbled_0(7, 2);`);

        return `rgbled_0.setColor(${idx}, ${r}, ${g}, ${b});\nrgbled_0.show();\n`;
    });

    // 直接控制单个电机转速
    registerBlock('mbot_motor', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MBOT_MOTOR_DIRECT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MBOT_MOTOR)
                .appendField(new Blockly.FieldDropdown([["M1", "9"], ["M2", "10"]]), "PORT");
            this.appendValueInput("SPEED")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MBOT_SPEED_DIRECT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_MBOT_MOTOR_DIRECT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const port = block.getFieldValue('PORT'); // 9 或 10
        const speed = arduinoGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '0';

        arduinoGenerator.addInclude('mcore_lib', '#include <MeMCore.h>');
        arduinoGenerator.addVariable('mbot_motors', 'MeDCMotor motor_9(9);\nMeDCMotor motor_10(10);\n');

        return `motor_${port}.run(${speed});\n`;
    });

};

export const mBotModule: BlockModule = {
    id: 'robots.mbot',
    name: 'mBot',
    init
};
