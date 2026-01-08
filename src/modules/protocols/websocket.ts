// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('ws_server_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WS_SERVER_INIT);
            this.appendValueInput("PORT")
                .setCheck("Number")
                .appendField("");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_WS_SERVER_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const port = arduinoGenerator.valueToCode(block, 'PORT', Order.ATOMIC) || '81';

        arduinoGenerator.addInclude('ws_lib', '#include <WebSocketsServer.h>');
        arduinoGenerator.addVariable('ws_obj', `WebSocketsServer webSocket = WebSocketsServer(${port});`);

        arduinoGenerator.addSetup('ws_begin', `webSocket.begin();`);

        // Loop hook needs to be careful not to conflict
        arduinoGenerator.addLoop('ws_loop', `webSocket.loop();`);

        return '';
    });

    registerBlock('ws_on_event', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WS_ON_EVENT);
            this.appendStatementInput("DO")
                .appendField("Do");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_WS_ON_EVENT_TOOLTIP);
        }
    }, (block: any) => {
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        const funcName = 'webSocketEvent';
        arduinoGenerator.functions_[funcName] = `
void ${funcName}(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
${branch}
}`;
        arduinoGenerator.addSetup('ws_event', `webSocket.onEvent(${funcName});`);
        return '';
    });

    registerBlock('ws_check_type', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WS_CHECK_TYPE) // If Event Type is
                .appendField(new Blockly.FieldDropdown([
                    [Blockly.Msg.ARD_WS_TYPE_CONNECTED || "Connected", "WStype_CONNECTED"],
                    [Blockly.Msg.ARD_WS_TYPE_DISCONNECTED || "Disconnected", "WStype_DISCONNECTED"],
                    [Blockly.Msg.ARD_WS_TYPE_TEXT || "Text", "WStype_TEXT"]
                ]), "TYPE");
            this.appendStatementInput("DO")
                .appendField("Do");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_WS_CHECK_TYPE_TOOLTIP);
        }
    }, (block: any) => {
        const type = block.getFieldValue('TYPE');
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        return `if(type == ${type}) {\n${branch}\n}\n`;
    });

    registerBlock('ws_send_all', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WS_SEND_ALL);
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_DISPLAY_TEXT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_WS_SEND_ALL_TOOLTIP);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
        return `webSocket.broadcastTXT(${text});\n`;
    });

};

export const WebSocketModule: BlockModule = {
    id: 'protocols.websocket',
    name: 'WebSocket Server',
    category: 'Communication',
    init
};
