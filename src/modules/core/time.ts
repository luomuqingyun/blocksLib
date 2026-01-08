import * as Blockly from 'blockly';
import { Order, registerBlock, arduinoGenerator } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {
    registerBlock('arduino_delay_ms', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIME_DELAY);
            this.appendValueInput("DELAY").setCheck("Number");
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIME_MS);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(120);
            this.setInputsInline(true);
            this.setTooltip(Blockly.Msg.ARD_TIME_DELAY_TOOLTIP);
        }
    }, (b: any) => {
        const delay = arduinoGenerator.valueToCode(b, 'DELAY', Order.NONE) || '1000';
        return `delay(${delay});\n`;
    });

    registerBlock('arduino_millis', { init: function () { this.appendDummyInput().appendField(Blockly.Msg.ARD_TIME_MILLIS); this.setOutput(true, "Number"); this.setColour(120); this.setTooltip(Blockly.Msg.ARD_TIME_MILLIS_TOOLTIP); } }, () => ['millis()', Order.ATOMIC]);
    registerBlock('arduino_micros', { init: function () { this.appendDummyInput().appendField(Blockly.Msg.ARD_TIME_MICROS); this.setOutput(true, "Number"); this.setColour(120); this.setTooltip(Blockly.Msg.ARD_TIME_MICROS_TOOLTIP); } }, () => ['micros()', Order.ATOMIC]);
};

export const TimeModule: BlockModule = {
    id: 'core.time',
    name: 'Time Blocks',
    init
};