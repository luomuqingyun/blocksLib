/**
 * ============================================================
 * MQTT 通信模块 (MQTT Protocol Module)
 * ============================================================
 * 
 * 提供 MQTT 消息队列协议相关积木:
 * - mqtt_setup: 配置服务器和端口
 * - mqtt_connect: 连接到 Broker
 * - mqtt_publish: 发布消息
 * - mqtt_subscribe: 订阅主题
 * - mqtt_callback: 接收消息回调
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    /**
     * MQTT 设置 (配置服务器地址和端口)
     * @param {String} SERVER MQTT 服务器地址
     * @param {Number} PORT 服务器端口 (默认 1883)
     */
    registerBlock('mqtt_setup', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MQTT_SETUP);
            this.appendValueInput("SERVER")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_MQTT_SERVER);
            this.appendValueInput("PORT")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MQTT_PORT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_MQTT_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const server = arduinoGenerator.valueToCode(block, 'SERVER', Order.ATOMIC) || '"broker.hivemq.com"';
        const port = arduinoGenerator.valueToCode(block, 'PORT', Order.ATOMIC) || '1883';

        // 包含 WiFi 和 MQTT 库 (PubSubClient)
        arduinoGenerator.addInclude('wifi_lib', '#include <WiFi.h>');
        arduinoGenerator.addInclude('pubsub_lib', '#include <PubSubClient.h>');

        // 定义 MQTT 客户端及其底层网络客户端
        arduinoGenerator.addVariable('mqtt_client_obj', `WiFiClient espClient;\nPubSubClient mqttClient(espClient);`);
        // 在 setup 中配置服务器信息
        arduinoGenerator.addSetup('mqtt_set_server', `mqttClient.setServer(${server}, ${port});`);

        return '';
    });

    /**
     * 连接到 MQTT Broker
     * @param {String} ID 客户端唯一标识符 (ID)
     */
    registerBlock('mqtt_connect', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MQTT_CONNECT);
            this.appendValueInput("ID")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_MQTT_CLIENT_ID);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_MQTT_CONN_TOOLTIP);
        }
    }, (block: any) => {
        const id = arduinoGenerator.valueToCode(block, 'ID', Order.ATOMIC) || '"ESP32Client"';

        // 阻塞直到连接成功
        return `
if (!mqttClient.connected()) {
    while (!mqttClient.connected()) {
        if (mqttClient.connect(${id})) {
            // 已成功连接
        } else {
            // 连接失败，等待 5 秒重试
            delay(5000);
        }
    }
}
`;
    });

    /**
     * 发布 MQTT 消息
     * @param {String} TOPIC 发布的主题
     * @param {String} PAYLOAD 发布的消息内容 (负载)
     */
    registerBlock('mqtt_publish', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MQTT_PUBLISH);
            this.appendValueInput("TOPIC")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_MQTT_TOPIC);
            this.appendValueInput("PAYLOAD")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_MQTT_MSG);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_MQTT_PUB_TOOLTIP);
        }
    }, (block: any) => {
        const topic = arduinoGenerator.valueToCode(block, 'TOPIC', Order.ATOMIC) || '"test"';
        const payload = arduinoGenerator.valueToCode(block, 'PAYLOAD', Order.ATOMIC) || '"hello"';
        // 向指定主题发送有效载荷
        return `mqttClient.publish(${topic}, ${payload});\n`;
    });

    /**
     * 订阅 MQTT 主题
     * @param {String} TOPIC 要订阅的主题名称
     */
    registerBlock('mqtt_subscribe', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MQTT_SUB);
            this.appendValueInput("TOPIC")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_MQTT_TOPIC);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_MQTT_SUB_TOOLTIP);
        }
    }, (block: any) => {
        const topic = arduinoGenerator.valueToCode(block, 'TOPIC', Order.ATOMIC) || '"test"';
        return `mqttClient.subscribe(${topic});\n`;
    });

    /**
     * MQTT 客户端心跳保持与消息处理循环
     */
    registerBlock('mqtt_loop', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MQTT_LOOP);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_MQTT_LOOP_TOOLTIP);
        }
    }, (block: any) => {
        return `mqttClient.loop();\n`;
    });

    /**
     * 定义 MQTT 消息接收回调逻辑
     * @param {Block[]} DO 收到消息时执行的积木
     */
    registerBlock('mqtt_callback_define', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MQTT_CALLBACK);
            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_DO);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_MQTT_CALLBACK_TOOLTIP);
        }
    }, (block: any) => {
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        const funcName = 'mqtt_callback';

        // 生成回调函数：处理收到的主题和内容
        arduinoGenerator.functions_[funcName] = `
void ${funcName}(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  ${branch}
}`;
        // 在 setup 中绑定回调函数
        arduinoGenerator.addSetup('mqtt_set_callback', `mqttClient.setCallback(${funcName});`);
        return '';
    });

    /**
     * 获取当前接收到的 MQTT 消息主题
     * @return {String} 主题名称
     */
    registerBlock('mqtt_get_topic', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_MQTT_RECEIVED_TOPIC);
            this.setOutput(true, "String");
            this.setColour(180);
        }
    }, (block: any) => {
        return ['String(topic)', Order.ATOMIC];
    });

    /**
     * 获取当前接收到的 MQTT 消息内容
     * @return {String} 消息载荷
     */
    registerBlock('mqtt_get_message', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_MQTT_RECEIVED_MSG);
            this.setOutput(true, "String");
            this.setColour(180);
        }
    }, (block: any) => {
        return ['message', Order.ATOMIC];
    });

};

export const MQTTModule: BlockModule = {
    id: 'protocols.mqtt',
    name: 'MQTT',
    init
};
