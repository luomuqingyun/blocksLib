// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('web_server_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WEB_SERVER_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_WEB_SERVER_INIT_TOOLTIP);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('wifi_lib', '#include <WiFi.h>');
        arduinoGenerator.addInclude('web_server_lib', '#include <WebServer.h>');
        arduinoGenerator.addVariable('web_server_obj', `WebServer server(80);`);
        return '';
    });

    registerBlock('web_server_on', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WEB_SERVER_ON);
            this.appendValueInput("PATH")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_WEB_SERVER_PATH);
            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_WEB_SERVER_DO);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_WEB_SERVER_ON_TOOLTIP);
        }
    }, (block: any) => {
        const path = arduinoGenerator.valueToCode(block, 'PATH', Order.ATOMIC) || '"/"';
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        // We need to create a unique function for this handler
        const funcName = `handle_path_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;

        arduinoGenerator.functions_[funcName] = `
void ${funcName}() {
${branch}
}`;
        return `server.on(${path}, ${funcName});\n`;
    });

    registerBlock('web_server_send', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WEB_SERVER_SEND);
            this.appendValueInput("CODE")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_WEB_SERVER_CODE);
            this.appendValueInput("TYPE")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_SENSOR_TYPE);
            this.appendValueInput("CONTENT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_WEB_SERVER_CONTENT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_WEB_SERVER_SEND_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const code = arduinoGenerator.valueToCode(block, 'CODE', Order.ATOMIC) || '200';
        const type = arduinoGenerator.valueToCode(block, 'TYPE', Order.ATOMIC) || '"text/plain"';
        const content = arduinoGenerator.valueToCode(block, 'CONTENT', Order.ATOMIC) || '"Hello"';

        return `server.send(${code}, ${type}, ${content});\n`;
    });

    registerBlock('web_server_start', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WEB_SERVER_START);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_WEB_SERVER_START_TOOLTIP);
        }
    }, (block: any) => {
        return `server.begin();\n`;
    });

    registerBlock('web_server_handle_client', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WEB_SERVER_HANDLE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_WEB_SERVER_HANDLE_TOOLTIP);
        }
    }, (block: any) => {
        return `server.handleClient();\n`;
    });

};

export const WebServerModule: BlockModule = {
    id: 'protocols.web_server',
    name: 'Web Server',
    category: 'Communication',
    init
};
