/**
 * ============================================================
 * 语音合成模块 (Speech Synthesis - ESP8266SAM)
 * ============================================================
 * 
 * 提供文本转语音 (TTS) 积木:
 * - speech_init: 初始化 (输出引脚)
 * - speech_say: 朗读文本
 * 
 * 使用 ESP8266SAM 库，输出到 I2S/DAC。
 * 
 * @file src/modules/hardware/speech.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('speech_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPEECH_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPEECH_PIN)
                .appendField(new Blockly.FieldTextInput("25"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip(Blockly.Msg.ARD_SPEECH_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');

        arduinoGenerator.addInclude('talkie_lib', '#include <Talkie.h>');
        arduinoGenerator.addVariable('talkie_obj', `Talkie voice;`);
        // Note: SAM usually outputs to I2S or DAC. 
        // For simplicity we configure a standard AudioOutput object.
        // This is a complex lib, often usage is: ESP8266SAM *sam = new ESP8266SAM;

        arduinoGenerator.addVariable('speech_audio_out', `AudioOutputI2SNoDAC *out = NULL;`);
        arduinoGenerator.addVariable('speech_sam', `ESP8266SAM *sam = NULL;`);

        arduinoGenerator.addSetup('speech_setup', `
  out = new AudioOutputI2SNoDAC();
  sam = new ESP8266SAM;
`); // Pin assignment is often implicit in I2SNoDAC (RX pin on ESP8266, 25 on ESP32 sometimes, or standard I2S)

        return '';
    });

    registerBlock('speech_say', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPEECH_SAY);
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_DISPLAY_TEXT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip(Blockly.Msg.ARD_SPEECH_SAY_TOOLTIP);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '"Hello"';
        // cast text to char*
        // SAM.Say(out, text);
        return `sam->Say(out, ${text}.c_str());\n`;
    });

};

export const SpeechModule: BlockModule = {
    id: 'hardware.speech',
    name: 'Speech Synthesis',
    category: 'Actuators',
    init
};
