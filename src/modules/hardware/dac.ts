/**
 * ============================================================
 * DAC 模数转换模块 (Digital to Analog Converter)
 * ============================================================
 * 
 * 提供 ESP32 DAC 模拟输出积木:
 * - dac_write: 写入 DAC 值 (0-255)
 * 
 * ESP32 有两个 DAC 通道: GPIO25 (DAC1) 和 GPIO26 (DAC2)。
 * 
 * @file src/modules/hardware/dac.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('dac_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DAC_WRITE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldDropdown([
                    ["DAC 1 (GPIO 25)", "25"],
                    ["DAC 2 (GPIO 26)", "26"]
                ]), "PIN");
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_DAC_VAL);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(250);
            this.setTooltip(Blockly.Msg.ARD_DAC_WRITE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        return `dacWrite(${pin}, ${val});\n`;
    });

};

export const DACModule: BlockModule = {
    id: 'hardware.dac',
    name: 'DAC (Analog Out)',
    category: 'IO',
    init
};
