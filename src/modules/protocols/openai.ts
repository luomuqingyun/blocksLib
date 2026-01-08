// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('openai_init', {
        init: function () {
            this.appendDummyInput()
                .appendField("OpenAI Init (ChatGPT)");
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

        arduinoGenerator.addInclude('http_client', '#include <HTTPClient.h>');
        arduinoGenerator.addInclude('wifi_client_secure', '#include <WiFiClientSecure.h>');
        arduinoGenerator.addInclude('arduino_json', '#include <ArduinoJson.h>');

        // We'll use a global function for the API call
        arduinoGenerator.addVariable('openai_api_key', `const char* openai_api_key = ${key};`);

        arduinoGenerator.functions_['openai_func'] = `
String askOpenAI(String prompt) {
  if(WiFi.status() != WL_CONNECTED) return "Error: No WiFi";

  WiFiClientSecure client;
  client.setInsecure(); // Skip cert validation
  HTTPClient http;
  
  http.begin(client, "https://api.openai.com/v1/chat/completions");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + openai_api_key);

  // JSON payload
  DynamicJsonDocument doc(1024);
  doc["model"] = "gpt-3.5-turbo";
  JsonArray messages = doc.createNestedArray("messages");
  JsonObject msg1 = messages.createNestedObject();
  msg1["role"] = "user";
  msg1["content"] = prompt;
  
  String requestBody;
  serializeJson(doc, requestBody);

  int httpResponseCode = http.POST(requestBody);
  String response = "Error";
  
  if (httpResponseCode > 0) {
    String payload = http.getString();
    DynamicJsonDocument respDoc(2048);
    deserializeJson(respDoc, payload);
    const char* text = respDoc["choices"][0]["message"]["content"];
    if(text) response = String(text);
  } else {
    // response = "Error code: " + httpResponseCode;
  }
  
  http.end();
  return response;
}`;
        return '';
    });

    registerBlock('openai_ask', {
        init: function () {
            this.appendDummyInput()
                .appendField("Ask OpenAI");
            this.appendValueInput("PROMPT")
                .setCheck("String")
                .appendField("Prompt");
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_OPENAI_CHAT_TOOLTIP);
        }
    }, (block: any) => {
        const prompt = arduinoGenerator.valueToCode(block, 'PROMPT', Order.ATOMIC) || '"Hello"';
        // Warning: This is a blocking HTTP call, can take 2-10 seconds
        return [`askOpenAI(${prompt})`, Order.ATOMIC];
    });

};

export const OpenAIModule: BlockModule = {
    id: 'protocols.openai',
    name: 'OpenAI (ChatGPT)',
    category: 'Cloud',
    init
};
