/**
 * ============================================================
 * HTTP 客户端模块 (HTTP Client)
 * ============================================================
 * 
 * 提供 HTTP 请求积木:
 * - http_get: GET 请求
 * - http_post: POST 请求 (支持 JSON/Form/Plain)
 * 
 * 使用 HTTPClient.h 库，需要 WiFi 连接。
 * 
 * @file src/modules/protocols/http_client.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('http_get', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_HTTP_CLIENT_GET);
            this.appendValueInput("URL")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NET_HTTP_URL);
            this.setOutput(true, "String");
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_HTTP_CLIENT_GET_TOOLTIP);
        }
    }, (block: any) => {
        const url = arduinoGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '""';

        arduinoGenerator.addInclude('http_lib', '#include <HTTPClient.h>');

        const funcName = 'sendHTTPGet';
        arduinoGenerator.functions_[funcName] = `
String ${funcName}(String url) {
  if(WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(url);
    int httpCode = http.GET();
    String payload = "{}";
    if (httpCode > 0) {
      payload = http.getString();
    } else {
       payload = "Error: " + String(httpCode);
    }
    http.end();
    return payload;
  }
  return "WiFi Disconnected";
}`;
        return [`${funcName}(${url})`, Order.ATOMIC];
    });

    registerBlock('http_post', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_HTTP_CLIENT_POST);
            this.appendValueInput("URL")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NET_HTTP_URL);
            this.appendValueInput("DATA")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_HTTP_CLIENT_DATA);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_HTTP_TYPE) // Content-Type
                .appendField(new Blockly.FieldDropdown([
                    ["application/json", "application/json"],
                    ["application/x-www-form-urlencoded", "application/x-www-form-urlencoded"],
                    ["text/plain", "text/plain"]
                ]), "TYPE");
            this.setOutput(true, "String");
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_HTTP_CLIENT_POST_TOOLTIP);
        }
    }, (block: any) => {
        const url = arduinoGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '""';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';
        const type = block.getFieldValue('TYPE');

        arduinoGenerator.addInclude('http_lib', '#include <HTTPClient.h>');

        const funcName = 'sendHTTPPost';
        arduinoGenerator.functions_[funcName] = `
String ${funcName}(String url, String data, String contentType) {
  if(WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(url);
    http.addHeader("Content-Type", contentType);
    int httpCode = http.POST(data);
    String payload = "{}";
    if (httpCode > 0) {
      payload = http.getString();
    } else {
       payload = "Error: " + String(httpCode);
    }
    http.end();
    return payload;
  }
  return "WiFi Disconnected";
}`;
        return [`${funcName}(${url}, ${data}, "${type}")`, Order.ATOMIC];
    });


};

export const HTTPClientModule: BlockModule = {
    id: 'protocols.http_client',
    name: 'HTTP Client',
    category: 'Cloud',
    init
};
