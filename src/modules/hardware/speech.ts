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

    // 初始化语音合成模块 (ESP8266SAM)
    registerBlock('speech_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPEECH_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPEECH_PIN)
                .appendField(new Blockly.FieldTextInput("25"), "PIN"); // 输出引脚
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip(Blockly.Msg.ARD_SPEECH_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');

        // 包含 Talkie 语音库（此处实际使用了 SAM 逻辑，Talkie 仅作为备份或引脚参考）
        arduinoGenerator.addInclude('talkie_lib', '#include <Talkie.h>');
        arduinoGenerator.addVariable('talkie_obj', `Talkie voice;`);

        // 使用 ESP8266SAM 库进行软件语音合成，输出到没有外部 DAC 的 I2S 接口
        arduinoGenerator.addVariable('speech_audio_out', `AudioOutputI2SNoDAC *out = NULL;`);
        arduinoGenerator.addVariable('speech_sam', `ESP8266SAM *sam = NULL;`);

        // 在 setup 中配置输出通道和合成器
        arduinoGenerator.addSetup('speech_setup', `
  out = new AudioOutputI2SNoDAC();
  sam = new ESP8266SAM;
`);

        return '';
    });

    // 调用语音合成库说出指定文本
    registerBlock('speech_say', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPEECH_SAY); // 朗读
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_DISPLAY_TEXT); // 文本
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip(Blockly.Msg.ARD_SPEECH_SAY_TOOLTIP);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '"Hello"';
        // 将产生的 String 类型文本转换为 C 风格字符串并传递给 SAM 实例执行语音合成
        return `sam->Say(out, ${text}.c_str());\n`;
    });

};

/**
 * 语音合成模块 (TTS)
 * 使用 ESP8266SAM 库实现简单的英语语音合成（SAM: Software Automatic Mouth），支持通过 I2S 或模拟 DAC 输出音频。
 */
export const SpeechModule: BlockModule = {
    id: 'hardware.speech',
    name: 'Speech Synthesis',
    init
};
