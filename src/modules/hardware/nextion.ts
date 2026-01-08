// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('nextion_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEXTION_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_RX)
                .appendField(new Blockly.FieldTextInput("16"), "RX");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_TX)
                .appendField(new Blockly.FieldTextInput("17"), "TX");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEXTION_BAUD)
                .appendField(new Blockly.FieldDropdown([["9600", "9600"], ["115200", "115200"]]), "BAUD");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_NEXTION_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const rx = block.getFieldValue('RX');
        const tx = block.getFieldValue('TX');
        const baud = block.getFieldValue('BAUD');

        reservePin(block, rx, 'INPUT');
        reservePin(block, tx, 'OUTPUT');

        // We use Serial2 for Nextion usually on ESP32
        arduinoGenerator.addSetup('nextion_setup', `Serial2.begin(${baud}, SERIAL_8N1, ${rx}, ${tx});`);
        return '';
    });

    registerBlock('nextion_set_text', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEXTION_SET_TEXT);
            this.appendValueInput("OBJ")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NEXTION_OBJ);
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_DISPLAY_TEXT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
        }
    }, (block: any) => {
        const obj = arduinoGenerator.valueToCode(block, 'OBJ', Order.ATOMIC) || '"t0"';
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
        return `
  Serial2.print(${obj});
  Serial2.print(".txt=\\"");
  Serial2.print(${text});
  Serial2.print("\\"");
  Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
\n`;
    });

    registerBlock('nextion_set_val', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEXTION_SET_NUM);
            this.appendValueInput("OBJ")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NEXTION_OBJ_NUM);
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PREF_VALUE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
        }
    }, (block: any) => {
        const obj = arduinoGenerator.valueToCode(block, 'OBJ', Order.ATOMIC) || '"n0"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        return `
  Serial2.print(${obj});
  Serial2.print(".val=");
  Serial2.print(${val});
  Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
\n`;
    });

    registerBlock('nextion_page', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEXTION_PAGE);
            this.appendValueInput("PAGE")
                .setCheck(null)
                .appendField(Blockly.Msg.ARD_NEXTION_PAGE_ID);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
        }
    }, (block: any) => {
        const page = arduinoGenerator.valueToCode(block, 'PAGE', Order.ATOMIC) || '0';
        return `
  Serial2.print("page ");
  Serial2.print(${page});
  Serial2.write(0xFF); Serial2.write(0xFF); Serial2.write(0xFF);
\n`;
    });

};

export const NextionModule: BlockModule = {
    id: 'hardware.nextion',
    name: 'Nextion Display',
    category: 'Displays',
    init
};
