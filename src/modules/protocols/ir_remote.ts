// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('ir_recv_setup', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IR_RECV_INIT);
            this.appendDummyInput()
                .appendField("Pin")
                .appendField(new Blockly.FieldTextInput("11"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_IR_RECV_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'INPUT');

        arduinoGenerator.addInclude('ir_lib', '#include <IRremote.h>');
        arduinoGenerator.addVariable('ir_recv_obj', `IRrecv irrecv(${pin});\ndecode_results results;`);

        // IRremote library changes periodically (v2 vs v3 vs v4).
        // Using common pattern `enableIRIn()`.
        arduinoGenerator.addSetup('ir_recv_begin', `irrecv.enableIRIn();`);

        return '';
    });

    registerBlock('ir_recv_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IR_CODE_RECV);
            this.setOutput(true, "Boolean");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_IR_CHECK_TOOLTIP);
        }
    }, (block: any) => {
        return ['irrecv.decode(&results)', Order.ATOMIC];
    });

    registerBlock('ir_recv_resume', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IR_RESUME);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_IR_RESUME_TOOLTIP);
        }
    }, (block: any) => {
        return `irrecv.resume();\n`;
    });

    registerBlock('ir_recv_get_hex', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IR_GET_HEX);
            this.setOutput(true, "String");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_IR_GET_HEX_TOOLTIP);
        }
    }, (block: any) => {
        // v3/v4 might use decodedIRData.decodedRawData or value
        // Assuming v2/v3 compatible logic for simplicity or results.value
        // Using String(results.value, HEX) is standard Arduino
        return ['String(results.value, HEX)', Order.ATOMIC];
    });

    registerBlock('ir_send_nec', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IR_SEND_NEC);
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IR_VAL);
            this.appendValueInput("BITS")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IR_BITS);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_IR_SEND_TOOLTIP);
        }
    }, (block: any) => {
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        const bits = arduinoGenerator.valueToCode(block, 'BITS', Order.ATOMIC) || '32';

        arduinoGenerator.addInclude('ir_lib', '#include <IRremote.h>');
        // IRsend uses default pin usually (D3 on Uno, D9 on Mega?) user doesn't usually set it in simple lib use
        arduinoGenerator.addVariable('ir_send_obj', `IRsend irsend;`);

        return `irsend.sendNEC(${val}, ${bits});\n`;
    });

};

export const IRRemoteModule: BlockModule = {
    id: 'protocols.ir_remote',
    name: 'IR Remote',
    category: 'Communication',
    init
};
