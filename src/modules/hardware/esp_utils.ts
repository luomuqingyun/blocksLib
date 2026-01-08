import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // ESP Specifics
    // =========================================================================

    registerBlock('esp_deep_sleep', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESP_SLEEP);
            this.appendValueInput("TIME")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ESP_TIME_US);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_ESP_SLEEP_TOOLTIP);
        }
    }, (block: any) => {
        const time = arduinoGenerator.valueToCode(block, 'TIME', Order.ATOMIC) || '0';
        return `ESP.deepSleep(${time});\n`;
    });

    registerBlock('esp_restart', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESP_RESTART);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_ESP_RESTART_TOOLTIP);
        }
    }, (block: any) => {
        return `ESP.restart();\n`;
    });

    registerBlock('esp_yield', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESP_YIELD);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_ESP_YIELD_TOOLTIP);
        }
    }, (block: any) => {
        return `yield();\n`;
    });


    // =========================================================================
    // Ticker (Timer Interrupts)
    // =========================================================================

    registerBlock('esp_ticker_attach', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TICKER_ATTACH);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NAME)
                .appendField(new Blockly.FieldTextInput("timer1"), "NAME");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TICKER_INTERVAL)
                .appendField(new Blockly.FieldNumber(1.0), "INTERVAL");
            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_TICKER_DO);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_TICKER_ATTACH_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        const interval = block.getFieldValue('INTERVAL');
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        // Clean room: Ticker requires a callback function
        const funcName = `ticker_callback_${name}`;

        arduinoGenerator.addInclude('ticker_lib', '#include <Ticker.h>');
        arduinoGenerator.addVariable(`ticker_obj_${name}`, `Ticker ${name};`);

        arduinoGenerator.functions_[funcName] = `
void ${funcName}() {
${branch}
}`;

        arduinoGenerator.addSetup(`ticker_attach_${name}`, `${name}.attach(${interval}, ${funcName});`);
        return '';
    });

    registerBlock('esp_ticker_detach', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TICKER_DETACH);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NAME)
                .appendField(new Blockly.FieldTextInput("timer1"), "NAME");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_TICKER_DETACH_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        return `${name}.detach();\n`;
    });

};

export const ESPUtilsModule: BlockModule = {
    id: 'hardware.esp_utils',
    name: 'ESP Utilities',
    category: 'ESP Utils',
    init
};
