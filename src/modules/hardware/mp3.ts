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

    // 初始化 MP3 播放器 (DFPlayer Mini)
    registerBlock('mp3_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_SERIAL || "Serial Port")
                .appendField(new Blockly.FieldDropdown([
                    ["Serial", "Serial"],
                    ["Serial1", "Serial1"],
                    ["Serial2", "Serial2"],
                    ["SoftwareSerial", "SW_SERIAL"]
                ]), "SERIAL");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_RX)
                .appendField(new Blockly.FieldTextInput("16"), "RX"); // 接 DFPlayer 的 TX 引脚
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_TX)
                .appendField(new Blockly.FieldTextInput("17"), "TX"); // 接 DFPlayer 的 RX 引脚
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_MP3_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const serialPort = block.getFieldValue('SERIAL');
        const rx = block.getFieldValue('RX');
        const tx = block.getFieldValue('TX');

        reservePin(block, rx, 'INPUT');
        reservePin(block, tx, 'OUTPUT');

        // 包含 DFRobot 官方 DFPlayer 库
        arduinoGenerator.addInclude('mp3_lib', '#include <DFRobotDFPlayerMini.h>');

        // 定义全局播放器对象
        arduinoGenerator.addVariable('mp3_obj', `DFRobotDFPlayerMini myDFPlayer;`);

        if (serialPort === 'SW_SERIAL') {
            // 模式 A: 使用 软件串口 (SoftwareSerial) 驱动 MP3
            arduinoGenerator.addInclude('soft_serial', '#include <SoftwareSerial.h>');
            arduinoGenerator.addVariable('mp3_ss', `SoftwareSerial myMP3Serial(${rx}, ${tx});`);
            arduinoGenerator.addSetup('mp3_init', `
  myMP3Serial.begin(9600); // DFPlayer 默认波特率为 9600
  if (!myDFPlayer.begin(myMP3Serial)) {
    // 若初始化失败，可以在此处增加错误提示逻辑
  }
  myDFPlayer.volume(20); // 默认初始化音量为 20
`);
        } else {
            // 模式 B: 使用 硬件串口 (Hardware Serial) 驱动 MP3
            // 针对具有引脚映射能力的板卡（如 ESP32）指定具体的 RX/TX 引脚
            arduinoGenerator.addSetup('mp3_init', `
#if defined(ESP32) || defined(ARDUINO_ARCH_STM32)
  ${serialPort}.begin(9600, SERIAL_8N1, ${rx}, ${tx});
#else
  ${serialPort}.begin(9600);
#endif
  if (!myDFPlayer.begin(${serialPort})) {
    // 初始化失败处理
  }
  myDFPlayer.volume(20);
`);
        }
        return '';
    });

    // 播放指定编号的曲目 (曲目存储在 TF 卡根目录下)
    registerBlock('mp3_play', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_PLAY);
            this.appendValueInput("TRACK")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MP3_TRACK); // 曲目编号
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

    // 控制播放状态 (上一曲、下一曲、暂停、继续、停止)
    registerBlock('mp3_control', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_CONTROL)
                .appendField(new Blockly.FieldDropdown([
                    ["下一曲", "next"],
                    ["上一曲", "previous"],
                    ["暂停", "pause"],
                    ["播放", "start"],
                    ["停止", "stop"]
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

    // 设置播放音量 (音量等级 0-30)
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

/**
 * MP3 播放器模块
 * 适配 DFPlayer Mini 串口 MP3 模块，支持 TF 卡播放及基本的播放控制功能。
 */
export const MP3Module: BlockModule = {
    id: 'hardware.mp3',
    name: 'MP3 Player',
    init
};
