/**
 * ============================================================
 * DFRobot 模块 (DFPlayer Mini MP3)
 * ============================================================
 * 
 * 提供 DFPlayer Mini MP3 播放器积木:
 * - dfrobot_player_init: 初始化 (RX/TX)
 * - dfrobot_player_play: 播放曲目
 * - dfrobot_player_volume: 设置音量
 * - dfrobot_player_control: 播放控制
 * - dfrobot_player_eq: 均衡器设置
 * 
 * 使用 DFRobotDFPlayerMini.h 和 SoftwareSerial。
 * 
 * @file src/modules/vendor/dfrobot.ts
 * @module EmbedBlocks/Frontend/Modules/Vendor
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // DFPlayer Mini (DFRobotDFPlayerMini.h)
    // =========================================================================

    registerBlock('dfrobot_player_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DFROBOT_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_RX)
                .appendField(new Blockly.FieldTextInput("10"), "RX");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_TX)
                .appendField(new Blockly.FieldTextInput("11"), "TX");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip(Blockly.Msg.ARD_DFROBOT_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const rx = block.getFieldValue('RX');
        const tx = block.getFieldValue('TX');

        arduinoGenerator.addInclude('softserial_lib', '#include <SoftwareSerial.h>');
        arduinoGenerator.addInclude('dfplayer_lib', '#include <DFRobotDFPlayerMini.h>');

        arduinoGenerator.addVariable('dfplayer_serial', `SoftwareSerial mySoftwareSerial(${rx}, ${tx});`);
        arduinoGenerator.addVariable('dfplayer_obj', `DFRobotDFPlayerMini myDFPlayer;`);

        arduinoGenerator.addSetup('dfplayer_init', `
  mySoftwareSerial.begin(9600);
  if (!myDFPlayer.begin(mySoftwareSerial)) {
    while(true);
  }
  myDFPlayer.volume(20);`);

        return '';
    });

    registerBlock('dfrobot_player_play', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DFROBOT_PLAY);
            this.appendValueInput("TRACK")
                .setCheck("Number")
                .appendField("#");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip(Blockly.Msg.ARD_DFROBOT_PLAY_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const track = arduinoGenerator.valueToCode(block, 'TRACK', Order.ATOMIC) || '1';
        return `myDFPlayer.play(${track});\n`;
    });

    registerBlock('dfrobot_player_volume', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DFROBOT_VOL);
            this.appendValueInput("VOL")
                .setCheck("Number")
                .appendField("(0-30)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip(Blockly.Msg.ARD_DFROBOT_VOL_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const vol = arduinoGenerator.valueToCode(block, 'VOL', Order.ATOMIC) || '20';
        return `myDFPlayer.volume(${vol});\n`;
    });

    registerBlock('dfrobot_player_control', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DFROBOT_CTRL);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["Next", "next"],
                    ["Previous", "previous"],
                    ["Pause", "pause"],
                    ["Start", "start"],
                    ["Stop", "stop"],
                    ["Enable Loop", "enableLoopAll"],
                    ["Disable Loop", "disableLoopAll"],
                    ["Random All", "randomAll"]
                ]), "ACTION");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip(Blockly.Msg.ARD_DFROBOT_CTRL_TOOLTIP);
        }
    }, (block: any) => {
        const action = block.getFieldValue('ACTION');
        return `myDFPlayer.${action}();\n`;
    });

    registerBlock('dfrobot_player_loop', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DFROBOT_LOOP);
            this.appendValueInput("TRACK")
                .setCheck("Number")
                .appendField("#");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip(Blockly.Msg.ARD_DFROBOT_LOOP_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const track = arduinoGenerator.valueToCode(block, 'TRACK', Order.ATOMIC) || '1';
        return `myDFPlayer.loop(${track});\n`;
    });

    registerBlock('dfrobot_player_eq', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DFROBOT_EQ);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["Normal", "DFPLAYER_EQ_NORMAL"],
                    ["Pop", "DFPLAYER_EQ_POP"],
                    ["Rock", "DFPLAYER_EQ_ROCK"],
                    ["Jazz", "DFPLAYER_EQ_JAZZ"],
                    ["Classic", "DFPLAYER_EQ_CLASSIC"],
                    ["Bass", "DFPLAYER_EQ_BASS"]
                ]), "EQ");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip(Blockly.Msg.ARD_DFROBOT_EQ_TOOLTIP);
        }
    }, (block: any) => {
        const eq = block.getFieldValue('EQ');
        return `myDFPlayer.EQ(${eq});\n`;
    });

};

export const DFRobotModule: BlockModule = {
    id: 'vendor.dfrobot',
    name: 'DFRobot',
    category: 'DFRobot',
    init
};
