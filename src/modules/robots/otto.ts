/**
 * ============================================================
 * Otto DIY 机器人模块 (Otto Robot)
 * ============================================================
 * 
 * 提供 Otto 双足机器人积木:
 * - otto_init/home: 初始化/归位
 * - otto_move: 运动 (前进/后退/转向)
 * - otto_dance: 舞蹈动作
 * - otto_sound/gesture/mouth: 声音/表情
 * 
 * 使用 Otto.h 库。
 * 
 * @file src/modules/robots/otto.ts
 * @module EmbedBlocks/Frontend/Modules/Robots
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // Otto DIY (Otto.h)
    // =========================================================================

    // 初始化 Otto 机器人
    registerBlock('otto_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_LEFT_LEG)
                .appendField(new Blockly.FieldTextInput("2"), "PIN_YL");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_RIGHT_LEG)
                .appendField(new Blockly.FieldTextInput("3"), "PIN_YR");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_LEFT_FOOT)
                .appendField(new Blockly.FieldTextInput("4"), "PIN_RL");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_RIGHT_FOOT)
                .appendField(new Blockly.FieldTextInput("5"), "PIN_RR");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_LOAD_CALIB)
                .appendField(new Blockly.FieldCheckbox("TRUE"), "CALIB");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_BUZZER)
                .appendField(new Blockly.FieldTextInput("13"), "PIN_B");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_OTTO_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const yl = block.getFieldValue('PIN_YL');
        const yr = block.getFieldValue('PIN_YR');
        const rl = block.getFieldValue('PIN_RL');
        const rr = block.getFieldValue('PIN_RR');
        const calib = block.getFieldValue('CALIB') === 'TRUE';
        const buzzer = block.getFieldValue('PIN_B');

        // 包含 Otto 库头文件
        arduinoGenerator.addInclude('otto_lib', '#include <Otto.h>');
        // 定义 Otto 对象
        arduinoGenerator.addVariable('otto_obj', `Otto Otto;`);

        // 在 Setup 中初始化引脚、校准状态和蜂鸣器，并归位
        arduinoGenerator.addSetup('otto_init', `
  Otto.init(${yl}, ${yr}, ${rl}, ${rr}, ${calib}, ${buzzer});\n  Otto.home();`);

        return '';
    });

    // 机器人舵机归位
    registerBlock('otto_home', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_HOME);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_OTTO_HOME_TOOLTIP);
        }
    }, (block: any) => {
        return `Otto.home();\n`;
    });

    // 控制机器人移动逻辑（行进、转向、跳跃等）
    registerBlock('otto_move', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_MOVE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_ACTION)
                .appendField(new Blockly.FieldDropdown([
                    [Blockly.Msg.ARD_OTTO_WALK, "walk"],
                    [Blockly.Msg.ARD_OTTO_BACK, "back"],
                    [Blockly.Msg.ARD_OTTO_TURNL, "turnL"],
                    [Blockly.Msg.ARD_OTTO_TURNR, "turnR"],
                    [Blockly.Msg.ARD_OTTO_BENDL, "bendKeyL"],
                    [Blockly.Msg.ARD_OTTO_BENDR, "bendKeyR"],
                    [Blockly.Msg.ARD_OTTO_JUMP, "jump"]
                ]), "ACTION");
            this.appendValueInput("STEPS")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_OTTO_STEPS);
            this.appendValueInput("T")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_OTTO_SPEED);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_OTTO_MOVE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const action = block.getFieldValue('ACTION');
        const steps = arduinoGenerator.valueToCode(block, 'STEPS', Order.ATOMIC) || '1';
        const t = arduinoGenerator.valueToCode(block, 'T', Order.ATOMIC) || '1000';

        let routine = '';
        // 将下拉框选项映射到 Otto 库的相应方法
        switch (action) {
            case 'walk': routine = `Otto.walk(${steps}, ${t}, 1);`; break; // 前进
            case 'back': routine = `Otto.walk(${steps}, ${t}, -1);`; break; // 后退
            case 'turnL': routine = `Otto.turn(${steps}, ${t}, 1);`; break; // 左转
            case 'turnR': routine = `Otto.turn(${steps}, ${t}, -1);`; break; // 右转
            case 'bendKeyL': routine = `Otto.bend(${steps}, ${t}, 1);`; break; // 左侧弯腰
            case 'bendKeyR': routine = `Otto.bend(${steps}, ${t}, -1);`; break; // 右侧弯腰
            case 'jump': routine = `Otto.jump(${steps}, ${t});`; break; // 跳跃
            default: routine = `Otto.home();`;
        }

        return `${routine}\n`;
    });

    registerBlock('otto_dance', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_DANCE);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    [Blockly.Msg.ARD_OTTO_MOONWALKL, "moonwalkerLeft"],
                    [Blockly.Msg.ARD_OTTO_MOONWALKR, "moonwalkerRight"],
                    [Blockly.Msg.ARD_OTTO_CRUSAITOL, "crusaitoLeft"],
                    [Blockly.Msg.ARD_OTTO_CRUSAITOR, "crusaitoRight"],
                    [Blockly.Msg.ARD_OTTO_FLAPPING, "flapping"]
                ]), "DANCE");
            this.appendValueInput("STEPS").setCheck("Number").appendField(Blockly.Msg.ARD_OTTO_STEPS);
            this.appendValueInput("T").setCheck("Number").appendField(Blockly.Msg.ARD_OTTO_SPEED);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const dance = block.getFieldValue('DANCE');
        const steps = arduinoGenerator.valueToCode(block, 'STEPS', Order.ATOMIC) || '1';
        const t = arduinoGenerator.valueToCode(block, 'T', Order.ATOMIC) || '1000';

        // Standard mapping based on likely Otto generic API names
        // Using direct calls assuming simplified wrapper or direct correspondence
        // If generic Otto lib is used:
        if (dance.includes("Left")) {
            return `Otto.${dance.replace("Left", "")}(${steps}, ${t}, ${20}, 1);\n`; // h/dir placeholders
        } else if (dance.includes("Right")) {
            return `Otto.${dance.replace("Right", "")}(${steps}, ${t}, ${20}, -1);\n`;
        }
        return `Otto.${dance}(${steps}, ${t}, ${20}, 1);\n`;
    });

    // 让机器人发出特定的声音/唱歌
    registerBlock('otto_sound', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_SOUND);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["S_connection", "S_connection"],
                    ["S_disconnection", "S_disconnection"],
                    ["S_buttonPushed", "S_buttonPushed"],
                    ["S_mode1", "S_mode1"],
                    ["S_mode2", "S_mode2"],
                    ["S_mode3", "S_mode3"],
                    ["S_surprise", "S_surprise"],
                    ["S_OhOoh", "S_OhOoh"],
                    ["S_OhOoh2", "S_OhOoh2"],
                    ["S_cuddly", "S_cuddly"],
                    ["S_sleeping", "S_sleeping"],
                    ["S_happy", "S_happy"],
                    ["S_superHappy", "S_superHappy"],
                    ["S_sad", "S_sad"],
                    ["S_confused", "S_confused"],
                    ["S_fart1", "S_fart1"],
                    ["S_fart2", "S_fart2"],
                    ["S_fart3", "S_fart3"]
                ]), "SOUND");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_OTTO_SOUND_TOOLTIP);
        }
    }, (block: any) => {
        const sound = block.getFieldValue('SOUND');
        // 调用 Otto.sing 方法发出预定义声音
        return `Otto.sing(${sound});\n`;
    });

    // 执行预设的手势动作
    registerBlock('otto_gesture', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_GESTURE);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["Happy", "OttoHappy"],
                    ["Super Happy", "OttoSuperHappy"],
                    ["Sad", "OttoSad"],
                    ["Sleeping", "OttoSleeping"],
                    ["Fart", "OttoFart"],
                    ["Confused", "OttoConfused"],
                    ["Love", "OttoLove"],
                    ["Angry", "OttoAngry"],
                    ["Fretful", "OttoFretful"],
                    ["Magic", "OttoMagic"],
                    ["Wave", "OttoWave"],
                    ["Victory", "OttoVictory"],
                    ["Fail", "OttoFail"]
                ]), "GESTURE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_OTTO_GESTURE_TOOLTIP);
        }
    }, (block: any) => {
        const gesture = block.getFieldValue('GESTURE');
        // 调用 Otto.playGesture 播放动作
        return `Otto.playGesture(${gesture});\n`;
    });

    // Mouth requires LED Matrix support which might need specific library inclusion depending on Otto variant.
    // Assuming generic Otto library supports putMouth if matrix enabled.
    registerBlock('otto_mouth', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTTO_MOUTH);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["Happy", "happy"],
                    ["Super Happy", "superHappy"],
                    ["Sad", "sad"],
                    ["Sleeping", "sleeping"],
                    ["Fart", "fart"],
                    ["Confused", "confused"],
                    ["Love", "love"],
                    ["Angry", "angry"],
                    ["Fail", "fail"],
                    ["Vamp1", "vamp1"],
                    ["Vamp2", "vamp2"]
                ]), "MOUTH");
            // Add hex input for custom mouth? For now simple predefined.
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_OTTO_MOUTH_TOOLTIP);
        }
    }, (block: any) => {
        const mouth = block.getFieldValue('MOUTH');
        // Some libraries use constant like zero, one, two... others use specific defined arrays
        // We will assume standard predefined arrays often found in Otto examples
        // Note: Code might need `unsigned long int` definition for custom, but predefined usually exists.
        return `Otto.putMouth(${mouth});\n`;
    });

};

export const OttoModule: BlockModule = {
    id: 'robots.otto',
    name: 'Otto DIY',
    init
};
