import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // LoRa (LoRa.h)
    // =========================================================================

    registerBlock('lora_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_FREQ)
                .appendField(new Blockly.FieldNumber(915E6), "FREQ");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_CS)
                .appendField(new Blockly.FieldTextInput("10"), "CS");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_RST)
                .appendField(new Blockly.FieldTextInput("9"), "RST");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_IRQ)
                .appendField(new Blockly.FieldTextInput("2"), "IRQ");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const freq = block.getFieldValue('FREQ');
        const cs = block.getFieldValue('CS');
        const rst = block.getFieldValue('RST');
        const irq = block.getFieldValue('IRQ');

        reservePin(block, cs, 'OUTPUT');
        reservePin(block, rst, 'OUTPUT');
        reservePin(block, irq, 'INPUT');

        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('lora_lib', '#include <LoRa.h>');

        arduinoGenerator.addSetup('lora_pins', `LoRa.setPins(${cs}, ${rst}, ${irq});`);
        arduinoGenerator.addSetup('lora_begin', `if (!LoRa.begin(${freq})) { while (1); }`);

        return '';
    });

    registerBlock('lora_config', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_CONFIG);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_PWR)
                .appendField(new Blockly.FieldNumber(17), "PWR");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_SF)
                .appendField(new Blockly.FieldNumber(7), "SF");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_SYNC)
                .appendField(new Blockly.FieldNumber(0x12), "SYNC");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_CONFIG_TOOLTIP);
        }
    }, (block: any) => {
        const pwr = block.getFieldValue('PWR');
        const sf = block.getFieldValue('SF');
        const sync = block.getFieldValue('SYNC');

        return `LoRa.setTxPower(${pwr});\nLoRa.setSpreadingFactor(${sf});\nLoRa.setSyncWord(${sync});\n`;
    });

    registerBlock('lora_packet_begin', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_BEGIN_PKT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_PKT_START_TOOLTIP);
        }
    }, (block: any) => {
        return `LoRa.beginPacket();\n`;
    });

    registerBlock('lora_print', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_PRINT);
            this.appendValueInput("DATA")
                .setCheck("String")
                .appendField("Data");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_PKT_ADD_TOOLTIP);
        }
    }, (block: any) => {
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';
        return `LoRa.print(${data});\n`;
    });

    registerBlock('lora_packet_end', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_END_PKT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_PKT_SEND_TOOLTIP);
        }
    }, (block: any) => {
        return `LoRa.endPacket();\n`;
    });

    registerBlock('lora_parse_packet', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_PARSE);
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_PARSE_TOOLTIP);
        }
    }, (block: any) => {
        return [`LoRa.parsePacket()`, Order.ATOMIC];
    });

    registerBlock('lora_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_READ);
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_READ_CHAR_TOOLTIP);
        }
    }, (block: any) => {
        return [`LoRa.read()`, Order.ATOMIC];
    });

    registerBlock('lora_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_AVAIL);
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_AVAIL_TOOLTIP);
        }
    }, (block: any) => {
        return [`LoRa.available()`, Order.ATOMIC];
    });

    registerBlock('lora_packet_rssi', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_RSSI);
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_RSSI_TOOLTIP);
        }
    }, (block: any) => {
        return [`LoRa.packetRssi()`, Order.ATOMIC];
    });

    registerBlock('lora_packet_snr', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_SNR);
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_SNR_TOOLTIP);
        }
    }, (block: any) => {
        return [`LoRa.packetSnr()`, Order.ATOMIC];
    });

    registerBlock('lora_read_string', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_READ_STR);
            this.setOutput(true, "String");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_READ_STR_TOOLTIP);
        }
    }, (block: any) => {
        const funcName = 'lora_read_string_fn';
        arduinoGenerator.functions_[funcName] = `
String ${funcName}() {
  String received = "";
  while (LoRa.available()) {
    received += (char)LoRa.read();
  }
  return received;
}`;
        return [`${funcName}()`, Order.ATOMIC];
    });

};

export const LoRaModule: BlockModule = {
    id: 'protocols.lora',
    name: 'LoRa Radio',
    category: 'LoRa',
    init
};
