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

    // 初始化 ESP-NOW
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
        // 包含 ESP-NOW 和 WiFi 库
        arduinoGenerator.addInclude('esp_now_lib', '#include <esp_now.h>');
        arduinoGenerator.addInclude('wifi_lib', '#include <WiFi.h>');
        // 定义广播地址（默认为全 FF）
        arduinoGenerator.addVariable('esp_now_peer', `uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};`);
        // 在 setup 中初始化 ESP-NOW，失败则返回
        arduinoGenerator.addSetup('esp_now_init', `
  if (esp_now_init() != ESP_OK) {
    // 初始化失败
    return;
  }`);
        return '';
    });

    // 添加对等节点 (MAC 地址)
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

        // 定义数据结构示例（虽然此处仅定义，未直接在 send 中强制使用）
        arduinoGenerator.addVariable('esp_now_data_struct', `
typedef struct struct_message {
  char text[32];
} struct_message;

struct_message myData;
struct_message incomingData;
`);
        // 定义解析 MAC 地址并添加节点的自定义函数
        arduinoGenerator.functions_['esp_now_peer_add'] = `
void addPeer(String macStr) {
  esp_now_peer_info_t peerInfo;
  memset(&peerInfo, 0, sizeof(peerInfo));
  
  // 使用 sscanf 将字符串 MAC 地址解析为字节数组
  unsigned int mac[6];
  sscanf(macStr.c_str(), "%x:%x:%x:%x:%x:%x", &mac[0], &mac[1], &mac[2], &mac[3], &mac[4], &mac[5]);
  for(int i=0; i<6; i++) peerInfo.peer_addr[i] = (uint8_t)mac[i];
  
  peerInfo.channel = 0;  
  peerInfo.encrypt = false;
  
  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    // 添加节点失败
  }
}`;
        return `addPeer(${macStr});\n`;
    });

    // 发送 ESP-NOW 数据
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
        // 向所有已添加的对等节点（填 0 代表 broadcast）发送原始字节数据
        return `esp_now_send(0, (uint8_t*)${data}.c_str(), ${data}.length());\n`;
    });

    // 接收 ESP-NOW 数据回调
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
        // 定义接收到的数据变量
        arduinoGenerator.addVariable('esp_now_cb_var', `String receivedData = "";`);

        // 定义回调函数内部实现
        arduinoGenerator.functions_[funcName] = `
void ${funcName}(const uint8_t * mac, const uint8_t *incomingData, int len) {
  char buf[len + 1];
  memcpy(buf, incomingData, len);
  buf[len] = 0;
  receivedData = String(buf);
${branch}
}`;
        // 在 setup 中注册接收监听回调
        arduinoGenerator.addSetup('esp_now_req_cb', `esp_now_register_recv_cb(${funcName});`);
        return '';
    });

};

export const EspNowModule: BlockModule = {
    id: 'protocols.esp_now',
    name: 'ESP-NOW',
    init
};
