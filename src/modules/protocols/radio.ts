import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // RCSwitch (RCSwitch.h) - 433MHz
    // =========================================================================

    registerBlock('radio_tx_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_TX_INIT);
            this.appendDummyInput()
                .appendField("Pin")
                .appendField(new Blockly.FieldTextInput("10"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_TX_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'OUTPUT');

        arduinoGenerator.addInclude('rcswitch_lib', '#include <RCSwitch.h>');
        arduinoGenerator.addVariable('rcswitch_obj', `RCSwitch mySwitch = RCSwitch();`);
        arduinoGenerator.addSetup('rcswitch_tx_init', `mySwitch.enableTransmit(${pin});`);

        return '';
    });

    registerBlock('radio_tx_send', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_TX_SEND);
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField("Value");
            this.appendValueInput("LEN")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_RADIO_LEN);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_TX_SEND_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        const len = arduinoGenerator.valueToCode(block, 'LEN', Order.ATOMIC) || '24';
        return `mySwitch.send(${val}, ${len});\n`;
    });

    registerBlock('radio_rx_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_RX_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_IRQ_PIN)
                .appendField(new Blockly.FieldTextInput("0"), "PIN"); // 0 is usually Pin 2 on Uno
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_RX_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        // reservePin(block, pin, 'INPUT'); // Logic for IRQ mapping is complex, simplest to just use number

        arduinoGenerator.addInclude('rcswitch_lib', '#include <RCSwitch.h>');
        arduinoGenerator.addVariable('rcswitch_obj', `RCSwitch mySwitch = RCSwitch();`);
        arduinoGenerator.addSetup('rcswitch_rx_init', `mySwitch.enableReceive(${pin});`);

        return '';
    });

    registerBlock('radio_rx_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_AVAIL);
            this.setOutput(true, "Boolean");
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_RX_AVAIL_TOOLTIP);
        }
    }, (block: any) => {
        return ['mySwitch.available()', Order.ATOMIC];
    });

    registerBlock('radio_rx_get', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_GET);
            this.setOutput(true, "Number");
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_RX_GET_TOOLTIP);
        }
    }, (block: any) => {
        return ['mySwitch.getReceivedValue()', Order.ATOMIC];
    });

    registerBlock('radio_rx_reset', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_RESET);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_RX_RESET_TOOLTIP);
        }
    }, (block: any) => {
        return `mySwitch.resetAvailable();\n`;
    });

    registerBlock('radio_rx_info', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_INFO)
                .appendField(new Blockly.FieldDropdown([
                    [Blockly.Msg.ARD_RADIO_INFO_LEN, "getReceivedBitlength()"],
                    [Blockly.Msg.ARD_RADIO_INFO_PROTO, "getReceivedProtocol()"],
                    [Blockly.Msg.ARD_RADIO_INFO_DELAY, "getReceivedDelay()"]
                ]), "INFO");
            this.setOutput(true, "Number");
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_RX_INFO_TOOLTIP);
        }
    }, (block: any) => {
        const info = block.getFieldValue('INFO');
        return [`mySwitch.${info}`, Order.ATOMIC];
    });

};

export const RadioModule: BlockModule = {
    id: 'protocols.radio',
    name: 'Radio (RF433)',
    category: 'Radio',
    init
};
