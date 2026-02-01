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
 * 
 * 使用 PubSubClient 库实现。
 * 
 * @file src/modules/protocols/mqtt.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

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

        arduinoGenerator.addInclude('wifi_lib', '#include <WiFi.h>');
        arduinoGenerator.addInclude('pubsub_lib', '#include <PubSubClient.h>');
        arduinoGenerator.addVariable('mqtt_client_obj', `WiFiClient espClient;\nPubSubClient client(espClient);`);
        arduinoGenerator.addSetup('mqtt_set_server', `client.setServer(${server}, ${port});`);

        return '';
    });

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

        return `
if (!mqttClient.connected()) {
    while (!mqttClient.connected()) {
        if (mqttClient.connect(${id})) {
            // connected
        } else {
            delay(5000);
        }
    }
}
`;
    });

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
        return `mqttClient.publish(${topic}, ${payload});\n`;
    });

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

        arduinoGenerator.functions_[funcName] = `
void ${funcName}(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  ${branch}
}`;
        // Register callback in setup
        arduinoGenerator.addSetup('mqtt_set_callback', `mqttClient.setCallback(${funcName});`);
        return '';
    });

    registerBlock('mqtt_get_topic', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_MQTT_RECEIVED_TOPIC);
            this.setOutput(true, "String");
            this.setColour(180);
        }
    }, (block: any) => {
        return ['String(topic)', Order.ATOMIC];
    });

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
    category: 'Communication',
    init
};
