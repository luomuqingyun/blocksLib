/**
 * ============================================================
 * ESP-NOW 模块 (ESP-NOW P2P Communication)
 * ============================================================
 * 
 * 提供 ESP-NOW 点对点通信积木:
 * - esp_now_init: 初始化 ESP-NOW
 * - esp_now_add_peer: 添加对等节点 (MAC 地址)
 * - esp_now_send: 发送数据
 * - esp_now_on_recv: 接收数据回调
 * 
 * ESP32 专用，无需 WiFi 路由器的低延迟通信。
 * 
 * @file src/modules/protocols/esp_now.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('esp_now_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESPNOW_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_ESPNOW_INIT_TOOLTIP);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('esp_now_lib', '#include <esp_now.h>');
        arduinoGenerator.addInclude('wifi_lib', '#include <WiFi.h>');
        arduinoGenerator.addVariable('esp_now_peer', `uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};`);
        arduinoGenerator.addSetup('esp_now_init', `
  if (esp_now_init() != ESP_OK) {
    // Serial.println("Error initializing ESP-NOW");
    return;
  }`);
        return '';
    });

    registerBlock('esp_now_add_peer', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESPNOW_ADD_PEER);
            this.appendValueInput("MAC")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_ESPNOW_PEER_TOOLTIP);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_ESPNOW_PEER_TOOLTIP);
        }
    }, (block: any) => {
        const macStr = arduinoGenerator.valueToCode(block, 'MAC', Order.ATOMIC) || '"FF:FF:FF:FF:FF:FF"';

        // Helper function in definitions to convert string MAC to bytes and add peer
        arduinoGenerator.addVariable('esp_now_data_struct', `
typedef struct struct_message {
  char text[32];
} struct_message;

struct_message myData;
struct_message incomingData;
`);
        arduinoGenerator.functions_['esp_now_peer_add'] = `
void addPeer(String macStr) {
  esp_now_peer_info_t peerInfo;
  memset(&peerInfo, 0, sizeof(peerInfo));
  // Simple parsing (naive) - assumed logic or user provides byte array?
  // For simplicity blocks usually take string. Detailed C++ parsing needed here or simplified logic.
  // Using broadcast for simplicity in this artifact or implementing a raw helper
  
  // Real implementation needs sscanf
  unsigned int mac[6];
  sscanf(macStr.c_str(), "%x:%x:%x:%x:%x:%x", &mac[0], &mac[1], &mac[2], &mac[3], &mac[4], &mac[5]);
  for(int i=0; i<6; i++) peerInfo.peer_addr[i] = (uint8_t)mac[i];
  
  peerInfo.channel = 0;  
  peerInfo.encrypt = false;
  
  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    // Serial.println("Failed to add peer");
  }
}`;
        return `addPeer(${macStr});\n`;
    });

    registerBlock('esp_now_send', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESPNOW_SEND);
            this.appendValueInput("DATA")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_ESPNOW_DATA_STR);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_ESPNOW_SEND_TOOLTIP);
        }
    }, (block: any) => {
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';
        return `esp_now_send(0, (uint8_t*)${data}.c_str(), ${data}.length());\n`;
    });

    registerBlock('esp_now_on_recv', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESPNOW_ON_RECV);
            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_ESPNOW_ON_RECV_DO);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_ESPNOW_RECV_TOOLTIP);
        }
    }, (block: any) => {
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        const funcName = 'OnDataRecv';
        arduinoGenerator.addVariable('esp_now_cb_var', `String receivedData = "";`);

        // Definition of callback
        arduinoGenerator.functions_[funcName] = `
void ${funcName}(const uint8_t * mac, const uint8_t *incomingData, int len) {
  char buf[len + 1];
  memcpy(buf, incomingData, len);
  buf[len] = 0;
  receivedData = String(buf);
${branch}
}`;
        arduinoGenerator.addSetup('esp_now_req_cb', `esp_now_register_recv_cb(${funcName});`);
        return '';
    });

};

export const EspNowModule: BlockModule = {
    id: 'protocols.esp_now',
    name: 'ESP-NOW',
    category: 'Communication',
    init
};
