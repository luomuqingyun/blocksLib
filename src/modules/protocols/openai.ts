/**
 * ============================================================
 * OpenAI 模块 (ChatGPT API)
 * ============================================================
 * 
 * 提供 OpenAI ChatGPT API 积木:
 * - openai_init: 初始化 (API Key)
 * - openai_ask: 发送提示词并获取回复
 * 
 * 使用 HTTPClient 进行 REST API 调用。
 * 注意: API 调用是阻塞的，可能需要数秒。
 * 
 * @file src/modules/protocols/openai.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // OpenAI (ChatGPT) 初始化
    registerBlock('openai_init', {
        init: function () {
            this.appendDummyInput()
                .appendField("OpenAI 初始化 (ChatGPT)");
            this.appendValueInput("KEY")
                .setCheck("String")
                .appendField("API Key");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_OPENAI_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '""';

        // 包含网络通信和 JSON 解析库
        arduinoGenerator.addInclude('http_client', '#include <HTTPClient.h>');
        arduinoGenerator.addInclude('wifi_client_secure', '#include <WiFiClientSecure.h>');
        arduinoGenerator.addInclude('arduino_json', '#include <ArduinoJson.h>');

        // 将 API Key 设为全局常量
        arduinoGenerator.addVariable('openai_api_key', `const char* openai_api_key = ${key};`);

        // 定义发送请求的核心函数
        arduinoGenerator.functions_['openai_func'] = `
String askOpenAI(String prompt) {
  if(WiFi.status() != WL_CONNECTED) return "Error: No WiFi";

  WiFiClientSecure client;
  client.setInsecure(); // 生产环境建议校验，此处为示例跳过证书验证
  HTTPClient http;
  
  // 指定 OpenAI 聊天补全 API 地址
  http.begin(client, "https://api.openai.com/v1/chat/completions");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + openai_api_key);

  // 构建 JSON 请求体
  DynamicJsonDocument doc(1024);
  doc["model"] = "gpt-3.5-turbo";
  JsonArray messages = doc.createNestedArray("messages");
  JsonObject msg1 = messages.createNestedObject();
  msg1["role"] = "user";
  msg1["content"] = prompt;
  
  String requestBody;
  serializeJson(doc, requestBody);

  // 发送 POST 请求并解析回复
  int httpResponseCode = http.POST(requestBody);
  String response = "Error";
  
  if (httpResponseCode > 0) {
    String payload = http.getString();
    DynamicJsonDocument respDoc(2048);
    deserializeJson(respDoc, payload);
    // 从 JSON 响应路径中提取文本内容
    const char* text = respDoc["choices"][0]["message"]["content"];
    if(text) response = String(text);
  }
  
  http.end();
  return response;
}`;
        return '';
    });

    // 向 OpenAI 发提问
    registerBlock('openai_ask', {
        init: function () {
            this.appendDummyInput()
                .appendField("向 OpenAI 提问");
            this.appendValueInput("PROMPT")
                .setCheck("String")
                .appendField("提示词");
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_OPENAI_CHAT_TOOLTIP);
        }
    }, (block: any) => {
        const prompt = arduinoGenerator.valueToCode(block, 'PROMPT', Order.ATOMIC) || '"Hello"';
        // 注意：这是一个阻塞式的 HTTP 调用，通常耗时 2-10 秒
        return [`askOpenAI(${prompt})`, Order.ATOMIC];
    });

};

export const OpenAIModule: BlockModule = {
    id: 'protocols.openai',
    name: 'OpenAI (ChatGPT)',
    init
};
