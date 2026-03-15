
import { registerBlock, arduinoGenerator } from '../../../generators/arduino-base';
import * as Blockly from 'blockly';

export const initBasicLedBlocks = () => {
    /**
     * 示例积木：控制基础 LED 灯的开关。
     * @param {String} PIN 绑定的引脚号
     * @param {String} STATE 高低电平状态 (HIGH/LOW)
     */
    registerBlock('example_led_control', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_EXAMPLE_LED_CONTROL.replace('%1', '').replace('%2', ''))
                .appendField(new Blockly.FieldTextInput("13"), "PIN")
                .appendField(Blockly.Msg.ARD_IO_TO)
                .appendField(new Blockly.FieldDropdown([["HIGH", "HIGH"], ["LOW", "LOW"]]), "STATE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230); // Blue
            this.setTooltip(Blockly.Msg.ARD_EXAMPLE_LED_TOOLTIP);
            this.setHelpUrl("");
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const state = block.getFieldValue('STATE');
        arduinoGenerator.addSetup(`pinMode_${pin}`, `pinMode(${pin}, OUTPUT);`);
        const code = `digitalWrite(${pin}, ${state});\n`;
        return code;
    });
};
