/**
 * ============================================================
 * WebSocket 服务器模块 (WebSocket Server Module)
 * ============================================================
 * 
 * 提供 WebSocket 实时通信服务器积木:
 * - ws_server_init: 初始化服务器 (端口)
 * - ws_on_event: 事件回调处理
 * - ws_check_type: 检查事件类型 (连接/断开/文本)
 * - ws_send_all: 广播消息给所有客户端
 * 
 * 使用 WebSocketsServer.h 库。
 * 
 * @file src/modules/protocols/websocket.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化 WebSocket 服务器 (默认 81 端口)
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

        // 包含 WebSockets 库
        arduinoGenerator.addInclude('ws_lib', '#include <WebSocketsServer.h>');
        // 定义全局 webSocket 对象
        arduinoGenerator.addVariable('ws_obj', `WebSocketsServer webSocket = WebSocketsServer(${port});`);

        // 在 setup 中开启服务器
        arduinoGenerator.addSetup('ws_begin', `webSocket.begin();`);

        // 在 loop 中处理 WebSocket 连接和数据，确保实时性
        arduinoGenerator.addLoop('ws_loop', `webSocket.loop();`);

        return '';
    });

    // WebSocket 事件监听积木
    registerBlock('ws_on_event', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WS_ON_EVENT);
            this.appendStatementInput("DO")
                .appendField("执行");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_WS_ON_EVENT_TOOLTIP);
        }
    }, (block: any) => {
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        const funcName = 'webSocketEvent';
        // 定义 WebSocket 事件回调函数：包含连接 ID、事件类型、数据载荷及长度
        arduinoGenerator.functions_[funcName] = `
void ${funcName}(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
${branch}
}`;
        // 在 setup 中绑定事件回调
        arduinoGenerator.addSetup('ws_event', `webSocket.onEvent(${funcName});`);
        return '';
    });

    /**
     * 判断 WebSocket 当前事件的类型 (Mutator 回调内使用)
     * @param {String} TYPE 事件类型 (CONNECTED/DISCONNECTED/TEXT)
     */
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

    // 向所有连接的 WebSocket 客户端广播文本消息
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
        // 使用广播功能发送数据
        return `webSocket.broadcastTXT(${text});\n`;
    });

};

export const WebSocketModule: BlockModule = {
    id: 'protocols.websocket',
    name: 'WebSocket Server',
    init
};
