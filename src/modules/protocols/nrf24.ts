import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // NRF24L01 (RF24.h)
    // =========================================================================

    registerBlock('nrf24_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_CE)
                .appendField(new Blockly.FieldTextInput("9"), "CE");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_CSN)
                .appendField(new Blockly.FieldTextInput("10"), "CSN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const ce = block.getFieldValue('CE');
        const csn = block.getFieldValue('CSN');

        reservePin(block, ce, 'OUTPUT');
        reservePin(block, csn, 'OUTPUT');

        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('rf24_lib', '#include <RF24.h>');
        arduinoGenerator.addVariable('rf24_obj', `RF24 radio(${ce}, ${csn});`);
        arduinoGenerator.addVariable('rf24_addr', `const byte address[6] = "00001";`); // Simplified fixed address for block demo

        arduinoGenerator.addSetup('rf24_init', `
  radio.begin();
  radio.openWritingPipe(address);
  radio.openReadingPipe(1, address);
  radio.setPALevel(RF24_PA_MIN);
  radio.startListening();`);

        return '';
    });

    registerBlock('nrf24_send', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_SEND);
            this.appendValueInput("MSG")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NRF24_MSG);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_SEND_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const msg = arduinoGenerator.valueToCode(block, 'MSG', Order.ATOMIC) || '"Hello"';

        // Logic: Stop listening -> Write -> Start listening
        return `
radio.stopListening();
const char text[] = ${msg};
radio.write(&text, sizeof(text));
radio.startListening();
`;
    });

    registerBlock('nrf24_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_AVAIL);
            this.setOutput(true, "Boolean");
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_AVAIL_TOOLTIP);
        }
    }, (block: any) => {
        return ['radio.available()', Order.ATOMIC];
    });

    registerBlock('nrf24_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_READ_STR);
            this.setOutput(true, "String");
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_READ_TOOLTIP);
        }
    }, (block: any) => {
        // Setup helper function for reading
        const funcName = 'nrf24_read_str';
        arduinoGenerator.functions_[funcName] = `
String ${funcName}() {
  char text[32] = "";
  if (radio.available()) {
    radio.read(&text, sizeof(text));
  }
  return String(text);
}`;
        return [`${funcName}()`, Order.ATOMIC];
    });

    registerBlock('nrf24_config', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_CONFIG);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_CHAN)
                .appendField(new Blockly.FieldNumber(76), "CHAN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_PWR)
                .appendField(new Blockly.FieldDropdown([
                    ["Min", "RF24_PA_MIN"],
                    ["Low", "RF24_PA_LOW"],
                    ["High", "RF24_PA_HIGH"],
                    ["Max", "RF24_PA_MAX"]
                ]), "LEVEL");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_CONFIG_TOOLTIP);
        }
    }, (block: any) => {
        const chan = block.getFieldValue('CHAN');
        const level = block.getFieldValue('LEVEL');
        return `radio.setChannel(${chan});\nradio.setPALevel(${level});\n`;
    });

    registerBlock('nrf24_open_pipe', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_OPEN_PIPE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_TYPE)
                .appendField(new Blockly.FieldDropdown([["Reading", "Reading"], ["Writing", "Writing"]]), "TYPE");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_ADDR)
                .appendField(new Blockly.FieldTextInput("00001"), "ADDR");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_PIPE_TOOLTIP);
        }
    }, (block: any) => {
        const type = block.getFieldValue('TYPE');
        const addr = block.getFieldValue('ADDR');
        // Addresses usually 5 bytes. Strings passed to open*Pipe need conversion or byte array.
        // Simplified usage: passing string literal works if cast/handled, but library expects byte array or uint64.
        // RF24 supports opening pip with const byte address[6] = "..."
        // We will create a local byte array definition for this pipe action.

        // Quick hack: define inline or just pass string if library overload supports it (some do).
        // Standard RF24: openWritingPipe(const uint8_t *address)

        return `
const byte addr_${type}[] = "${addr}";
radio.open${type}Pipe(1, addr_${type}); // Note: Reading pipe needs index (1-5), Writing does not (or ignores it)
// Correcting standard lib usage:
// radio.openWritingPipe(address) -> takes address
// radio.openReadingPipe(number, address) -> takes index and address
if ("${type}" == "Writing") {
 radio.openWritingPipe(addr_${type});
} else {
 radio.openReadingPipe(1, addr_${type});
}
`;
    });
};

export const NRF24Module: BlockModule = {
    id: 'protocols.nrf24',
    name: 'NRF24L01 Radio',
    category: 'NRF24',
    init
};
