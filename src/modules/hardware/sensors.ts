/**
 * ============================================================
 * 传感器模块 (Sensors Module)
 * ============================================================
 * 
 * 提供常用传感器积木:
 * - 超声波传感器 (HC-SR04): 距离测量
 * - 温湿度传感器 (DHT11/22/21): 温度和湿度读取
 * 
 * @file src/modules/hardware/sensors.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册常用的基础传感器积木，如超声波测距和 DHT 温湿度传感器。
 */
const init = () => {

    // =========================================================================
    // 1. 超声波传感器 (HC-SR04)
    // 原理：通过 Trig 引脚发射 10us 的脉冲，Echo 引脚返回高电平持续时间，根据声速计算距离。
    // =========================================================================
    registerBlock('sensor_ultrasonic', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ULTRASONIC); // 超声波测距
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_TRIG)
                .appendField(new Blockly.FieldTextInput("12"), "TRIG"); // 触发引脚
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ECHO)
                .appendField(new Blockly.FieldTextInput("11"), "ECHO"); // 接收引脚
            this.setOutput(true, "Number");
            this.setColour(180); // 传感器类积木通常使用这种浅蓝/青绿色
            this.setTooltip(Blockly.Msg.ARD_SENSOR_ULTRASONIC_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const trig = block.getFieldValue('TRIG');
        const echo = block.getFieldValue('ECHO');

        reservePin(block, trig, 'OUTPUT');
        reservePin(block, echo, 'INPUT');

        arduinoGenerator.addSetup(`ultrasonic_${trig}_${echo}`, `pinMode(${trig}, OUTPUT);\npinMode(${echo}, INPUT);`);

        arduinoGenerator.addFunction('readUltrasonicDistance', `
long readUltrasonicDistance(int triggerPin, int echoPin) {
  digitalWrite(triggerPin, LOW);
  delayMicroseconds(2);
  digitalWrite(triggerPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(triggerPin, LOW);
  return pulseIn(echoPin, HIGH) * 0.034 / 2;
}`);

        return [`readUltrasonicDistance(${trig}, ${echo})`, Order.ATOMIC];
    });

    // =========================================================================
    // 2. 温湿度传感器 (DHT 系列)
    // =========================================================================
    registerBlock('sensor_dht', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_DHT); // DHT 传感器
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN"); // 数据引脚
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_TYPE)
                .appendField(new Blockly.FieldDropdown([["DHT11", "DHT11"], ["DHT22", "DHT22"], ["DHT21", "DHT21"]]), "TYPE");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_READ)
                .appendField(new Blockly.FieldDropdown([[Blockly.Msg.ARD_SENSOR_TEMPERATURE, "readTemperature"], [Blockly.Msg.ARD_SENSOR_HUMIDITY, "readHumidity"]]), "CMD");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_DHT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const type = block.getFieldValue('TYPE');
        const cmd = block.getFieldValue('CMD');
        const name = `dht_${pin}`;

        reservePin(block, pin, 'INPUT');

        arduinoGenerator.addInclude('dht_lib', '#include "DHT.h"');
        arduinoGenerator.addVariable(`def_${name}`, `DHT ${name}(${pin}, ${type});`);
        arduinoGenerator.addSetup(`setup_${name}`, `${name}.begin();`);

        return [`${name}.${cmd}()`, Order.ATOMIC];
    });

};

/**
 * 基础传感器模块
 */
export const SensorsModule: BlockModule = {
    id: 'hardware.sensors',
    name: 'Generic Sensors',
    init
};
