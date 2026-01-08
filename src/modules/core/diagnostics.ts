// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('temp_read', { // ESP32 internal temp - deprecated in some versions but good to have if works
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DIAG_TEMP);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_DIAG_TEMP_TOOLTIP);
        }
    }, (block: any) => {
        return [`temperatureRead()`, Order.ATOMIC];
    });

    registerBlock('diag_free_heap', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DIAG_HEAP);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_DIAG_RAM_TOOLTIP);
        }
    }, (block: any) => {
        return [`ESP.getFreeHeap()`, Order.ATOMIC];
    });

    registerBlock('diag_uptime', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DIAG_UPTIME);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_DIAG_BOOT_TOOLTIP);
        }
    }, (block: any) => {
        return [`(millis() / 1000)`, Order.ATOMIC];
    });

    registerBlock('diag_restart_reason', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DIAG_REASON);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_DIAG_RESET_TOOLTIP);
        }
    }, (block: any) => {
        // Only valid for ESP32
        return [`esp_reset_reason()`, Order.ATOMIC];
    });

    registerBlock('diag_chip_model', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DIAG_MODEL);
            this.setOutput(true, "String");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_DIAG_CPU_TOOLTIP);
        }
    }, (block: any) => {
        return [`ESP.getChipModel()`, Order.ATOMIC];
    });

};

export const DiagnosticsModule: BlockModule = {
    id: 'core.diagnostics',
    name: 'System Diagnostics',
    category: 'System',
    init
};
