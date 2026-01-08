// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // ===================================
    // Modbus Master (ModbusMaster Lib)
    // ===================================
    registerBlock('modbus_init', {
        init: function () {
            this.appendDummyInput()
                .appendField("Modbus Master Init");
            this.appendDummyInput()
                .appendField("Baud Rate")
                .appendField(new Blockly.FieldDropdown([["9600", "9600"], ["19200", "19200"], ["115200", "115200"]]), "BAUD");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_MODBUS_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const baud = block.getFieldValue('BAUD');

        arduinoGenerator.addInclude('modbus_lib', '#include <ModbusMaster.h>');
        arduinoGenerator.addVariable('modbus_obj', `ModbusMaster node;`);

        // Simple init assuming Serial (or Serial2 for ESP32)
        // Ideally block should select Serial port interactively
        arduinoGenerator.addSetup('modbus_config', `Serial.begin(${baud});\n  node.begin(1, Serial); // Default Slave ID 1`);

        return '';
    });

    registerBlock('modbus_read_regs', {
        init: function () {
            this.appendDummyInput()
                .appendField("Modbus Read Holding Regs");
            this.appendValueInput("ADDR")
                .setCheck("Number")
                .appendField("Address");
            this.appendValueInput("COUNT")
                .setCheck("Number")
                .appendField("Count");
            this.setOutput(true, "Number"); // Returns first reg or status? 
            // Modbus reading is async/complex. Returning just success code or doing it void.
            // Let's make it a statement that reads into buffer, and get functions
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_MODBUS_READ_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const addr = arduinoGenerator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0';
        const count = arduinoGenerator.valueToCode(block, 'COUNT', Order.ATOMIC) || '1';
        return `node.readHoldingRegisters(${addr}, ${count});\n`;
    });

    registerBlock('modbus_get_buffer', {
        init: function () {
            this.appendDummyInput()
                .appendField("Modbus Get Buffer Index");
            this.appendValueInput("INDEX")
                .setCheck("Number");
            this.setOutput(true, "Number");
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_MODBUS_GET_TOOLTIP);
        }
    }, (block: any) => {
        const index = arduinoGenerator.valueToCode(block, 'INDEX', Order.ATOMIC) || '0';
        return [`node.getResponseBuffer(${index})`, Order.ATOMIC];
    });

    // ===================================
    // CAN Bus (ESP32 TWAI)
    // ===================================
    registerBlock('can_init', {
        init: function () {
            this.appendDummyInput()
                .appendField("ESP32 CAN (TWAI) Init");
            this.appendDummyInput()
                .appendField("TX Pin")
                .appendField(new Blockly.FieldTextInput("26"), "TX");
            this.appendDummyInput()
                .appendField("RX Pin")
                .appendField(new Blockly.FieldTextInput("27"), "RX");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_CAN_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const tx = block.getFieldValue('TX');
        const rx = block.getFieldValue('RX');

        arduinoGenerator.addInclude('can_lib', '#include "driver/twai.h"');

        arduinoGenerator.functions_['can_setup_func'] = `
void setupCAN() {
    twai_general_config_t g_config = TWAI_GENERAL_CONFIG_DEFAULT((gpio_num_t)${tx}, (gpio_num_t)${rx}, TWAI_MODE_NORMAL);
    twai_timing_config_t t_config = TWAI_TIMING_CONFIG_500KBITS();
    twai_filter_config_t f_config = TWAI_FILTER_CONFIG_ACCEPT_ALL();
    if (twai_driver_install(&g_config, &t_config, &f_config) == ESP_OK) {
        twai_start();
    }
}`;

        arduinoGenerator.addSetup('can_init', `setupCAN();`);
        return '';
    });

    registerBlock('can_send', {
        init: function () {
            this.appendDummyInput()
                .appendField("CAN Send");
            this.appendValueInput("ID")
                .setCheck("Number")
                .appendField("ID");
            this.appendValueInput("DATA")
                .setCheck("Number") // Simple byte
                .appendField("Byte Data");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, (block: any) => {
        const id = arduinoGenerator.valueToCode(block, 'ID', Order.ATOMIC) || '0x100';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '0';

        return `
    twai_message_t message;
        message.identifier = ${id};
        message.extd = 0;
        message.data_length_code = 1;
        message.data[0] = ${data};
        twai_transmit(& message, pdMS_TO_TICKS(100));
\n`;
    });

};

export const AutomationModule: BlockModule = {
    id: 'protocols.automation',
    name: 'Industrial (CAN/Modbus)',
    category: 'Communication', // or 'Automation'
    init
};
