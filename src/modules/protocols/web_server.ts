/**
 * ============================================================
 * Web 服务器模块 (ESP32/ESP8266 Web Server)
 * ============================================================
 * 
 * 提供 HTTP Web 服务器积木 (WebServer.h):
 * - web_server_init: 初始化服务器 (80端口)
 * - web_server_on: 注册路由处理
 * - web_server_send: 发送响应
 * - web_server_start: 启动服务器
 * - web_server_handle_client: 处理请求循环
 * 
 * @file src/modules/protocols/web_server.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化 Web 服务器 (默认 80 端口)
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
        // 包含 WiFi 和 WebServer 库
        arduinoGenerator.addInclude('wifi_lib', '#include <WiFi.h>');
        arduinoGenerator.addInclude('web_server_lib', '#include <WebServer.h>');
        // 定义全局 server 对象，监听 80 端口
        arduinoGenerator.addVariable('web_server_obj', `WebServer server(80);`);
        return '';
    });

    // 注册 Web 路由处理
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

        // 为该路由路径创建一个唯一的处理函数名
        const funcName = `handle_path_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;

        // 定义回调处理函数
        arduinoGenerator.functions_[funcName] = `
void ${funcName}() {
${branch}
}`;
        // 绑定路径到对应的回调函数
        return `server.on(${path}, ${funcName});\n`;
    });

    // 发送 Web 响应
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

        // 发送带 HTTP 状态码、内容类型和内容的响应
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

    // 处理客户端请求 (需放在 loop 中)
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
        // 核心运行逻辑：处理异步的网络请求
        return `server.handleClient();\n`;
    });

};

export const WebServerModule: BlockModule = {
    id: 'protocols.web_server',
    name: 'Web Server',
    init
};
