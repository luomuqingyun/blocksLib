/**
 * ============================================================
 * 音频输入模块 (Microphone Input / Sound Detection)
 * ============================================================
 * 
 * 提供麦克风/声音传感器积木:
 * - audio_read_volume: 读取音量 (峰值检测)
 * - audio_is_loud: 检测是否响亮 (阈值)
 * 
 * 使用 analogRead 采样，适用于声音检测模块。
 * 
 * @file src/modules/hardware/audio_input.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('audio_read_volume', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_AUDIO_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("A0"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_AUDIO_WINDOW)
                .appendField(new Blockly.FieldTextInput("50"), "WINDOW");
            this.setOutput(true, "Number");
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_AUDIO_MIC_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const window = block.getFieldValue('WINDOW');

        reservePin(block, pin, 'INPUT');

        // Helper function for peak detection to avoid blocking main loop too strangely
        // But here we do a blocking sample for 'window' ms.
        const funcName = 'getAudioVolume';
        arduinoGenerator.functions_[funcName] = `
int ${funcName}(int pin, int windowMS) {
   unsigned long startMillis = millis();
   unsigned int signalMax = 0;
   unsigned int signalMin = 1024;
   
   // Collect data for windowMS
   while (millis() - startMillis < windowMS) {
      int sample = analogRead(pin);
      if (sample < 1024) {
         if (sample > signalMax) signalMax = sample;
         if (sample < signalMin) signalMin = sample;
      }
   }
   int peakToPeak = signalMax - signalMin;
   // Map roughly to 0-100. Typical mic p2p might be 0-512 depending on gain
   int vol = map(peakToPeak, 0, 512, 0, 100);
   if(vol > 100) vol = 100;
   return vol;
}`;
        return [`${funcName}(${pin}, ${window})`, Order.ATOMIC];
    });

    registerBlock('audio_is_loud', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_AUDIO_DETECT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("A0"), "PIN");
            this.appendValueInput("THRESH")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_AUDIO_THRESH);
            this.setOutput(true, "Boolean");
            this.setColour(250);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const thresh = arduinoGenerator.valueToCode(block, 'THRESH', Order.ATOMIC) || '30';
        // Reuse func
        return [`(getAudioVolume(${pin}, 30) > ${thresh})`, Order.ATOMIC];
    });

};

export const AudioInputModule: BlockModule = {
    id: 'hardware.audio_input',
    name: 'Audio Input (Mic)',
    category: 'Sensors',
    init
};
