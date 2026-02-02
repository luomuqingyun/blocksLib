/**
 * ============================================================
 * 音频模块 (Audio Module - Tone)
 * ============================================================
 * 
 * 提供 Arduino 蜂鸣器/扬声器音频积木:
 * - audio_tone: 播放指定频率音调
 * - audio_notone: 停止播放
 * - audio_note_freq: 音符频率常量 (C4-A5)
 * 
 * 使用 Arduino 内置 tone() 函数。
 * 
 * @file src/modules/hardware/audio.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 播放音调
    registerBlock('audio_tone', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_AUDIO_TONE);
            this.appendValueInput("PIN")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SENSOR_PIN);
            this.appendValueInput("FREQ")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_AUDIO_FREQ);
            this.appendValueInput("DURATION")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_AUDIO_DURATION);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_AUDIO_TONE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = arduinoGenerator.valueToCode(block, 'PIN', Order.ATOMIC) || '8';
        const freq = arduinoGenerator.valueToCode(block, 'FREQ', Order.ATOMIC) || '440';
        const dur = arduinoGenerator.valueToCode(block, 'DURATION', Order.ATOMIC) || '1000';

        // 使用 Arduino 内置 tone 函数播放指定频率和持续时间的音调
        return `tone(${pin}, ${freq}, ${dur});\n`;
    });

    registerBlock('audio_notone', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_AUDIO_STOP);
            this.appendValueInput("PIN")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SENSOR_PIN);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_AUDIO_STOP_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = arduinoGenerator.valueToCode(block, 'PIN', Order.ATOMIC) || '8';
        return `noTone(${pin});\n`;
    });

    registerBlock('audio_note_freq', {
        init: function () {
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["Note C4 (262)", "262"],
                    ["Note D4 (294)", "294"],
                    ["Note E4 (330)", "330"],
                    ["Note F4 (349)", "349"],
                    ["Note G4 (392)", "392"],
                    ["Note A4 (440)", "440"],
                    ["Note B4 (494)", "494"],
                    ["Note C5 (523)", "523"],
                    ["Note A5 (880)", "880"],
                ]), "FREQ");
            this.setOutput(true, "Number");
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_AUDIO_NOTE_TOOLTIP);
        }
    }, (block: any) => {
        const freq = block.getFieldValue('FREQ');
        return [freq, Order.ATOMIC];
    });

};

export const AudioModule: BlockModule = {
    id: 'hardware.audio',
    name: 'Audio (Tone)',
    init
};
