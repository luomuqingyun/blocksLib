/**
 * ============================================================
 * MP3 播放器模块 (DFPlayer Mini)
 * ============================================================
 * 
 * 提供 DFPlayer Mini MP3 模块积木:
 * - mp3_init: 初始化 (RX/TX 引脚)
 * - mp3_play: 播放指定曲目
 * - mp3_control: 控制 (上一曲/下一曲/暂停/播放/停止)
 * - mp3_volume: 设置音量 (0-30)
 * 
 * 使用 DFRobotDFPlayerMini.h 库。
 * 
 * @file src/modules/hardware/mp3.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('mp3_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_RX)
                .appendField(new Blockly.FieldTextInput("16"), "RX");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_TX)
                .appendField(new Blockly.FieldTextInput("17"), "TX");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_MP3_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const rx = block.getFieldValue('RX');
        const tx = block.getFieldValue('TX');

        reservePin(block, rx, 'INPUT');
        reservePin(block, tx, 'OUTPUT');

        // Using HardwareSerial 2 logic if pins match, but for generality on ESP32 we often use Serial2
        // However, DFPlayer lib often takes a stream.
        // Let's use standard DFRobotDFPlayerMini lib

        arduinoGenerator.addInclude('mp3_lib', '#include <DFRobotDFPlayerMini.h>');

        // We will use Serial2 for ESP32 best performance if possible, or a named HardwareSerial
        // For simplicity in blocks, we'll map to Serial2 or create a SoftSerial if really needed,
        // but ESP32 has 3 UARTs.

        arduinoGenerator.addVariable('mp3_obj', `DFRobotDFPlayerMini myDFPlayer;`);
        // We assume usage of Serial2 for pins 16/17 (Standard ESP32 UART2)
        // If user picks other pins, they should be mapped.
        // For robustness, we will try to use HardwareSerial if pins 16/17, else SoftwareSerial?
        // ESP32 doesn't recommend SoftSerial. HardwareSerial can be remapped.

        arduinoGenerator.addVariable('mp3_serial', `HardwareSerial myMP3Serial(2);`);

        arduinoGenerator.addSetup('mp3_init', `
  myMP3Serial.begin(9600, SERIAL_8N1, ${rx}, ${tx});
  
  if (!myDFPlayer.begin(myMP3Serial)) {
    // Serial.println(F("Unable to begin:"));
    // Serial.println(F("1.Please recheck the connection!"));
    // Serial.println(F("2.Please insert the SD card!"));
    // while(true);
  }
  myDFPlayer.volume(20);  //Set volume value. From 0 to 30
`);
        return '';
    });

    registerBlock('mp3_play', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_PLAY);
            this.appendValueInput("TRACK")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MP3_TRACK);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_MP3_PLAY_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const track = arduinoGenerator.valueToCode(block, 'TRACK', Order.ATOMIC) || '1';
        return `myDFPlayer.play(${track});\n`;
    });

    registerBlock('mp3_control', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_CONTROL)
                .appendField(new Blockly.FieldDropdown([
                    ["Next", "next"],
                    ["Previous", "previous"],
                    ["Pause", "pause"],
                    ["Start", "start"],
                    ["Stop", "stop"]
                ]), "ACTION");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_MP3_CTRL_TOOLTIP);
        }
    }, (block: any) => {
        const action = block.getFieldValue('ACTION');
        return `myDFPlayer.${action}();\n`;
    });

    registerBlock('mp3_volume', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_VOLUME);
            this.appendValueInput("VOL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MP3_LEVEL);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_MP3_VOL_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const vol = arduinoGenerator.valueToCode(block, 'VOL', Order.ATOMIC) || '20';
        return `myDFPlayer.volume(${vol});\n`;
    });

};

export const MP3Module: BlockModule = {
    id: 'hardware.mp3',
    name: 'MP3 Player',
    category: 'Sensors', // Actuators really
    init
};
