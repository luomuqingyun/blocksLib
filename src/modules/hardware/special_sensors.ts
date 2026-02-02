/**
 * ============================================================
 * 特殊传感器模块 (Capacitive/Pulse/Light Sensors)
 * ============================================================
 * 
 * 提供特殊传感器积木:
 * - 电容触摸: CapacitiveSensor 库 (AVR)
 * - 脉搏传感器: 简单模拟读取
 * - TSL2561: 光照度传感器 (Lux)
 * 
 * @file src/modules/hardware/special_sensors.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // Capacitive Touch (CapacitiveSensor.h)
    // =========================================================================

    // 初始化电容触摸传感器 (基于 CapacitiveSensor 库)
    registerBlock('sensor_capacitive_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_SEND)
                .appendField(new Blockly.FieldTextInput("4"), "SEND"); // 发送引脚 (高阻抗)
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_RECV)
                .appendField(new Blockly.FieldTextInput("2"), "RECV"); // 接收引脚 (连接触摸板)
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_CAP_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const send = block.getFieldValue('SEND');
        const recv = block.getFieldValue('RECV');

        reservePin(block, send, 'OUTPUT');
        reservePin(block, recv, 'INPUT');

        // 包含电容感应库
        arduinoGenerator.addInclude('cap_lib', '#include <CapacitiveSensor.h>');
        // 实例化传感器对象，名称中包含引脚号以支持多个传感器
        arduinoGenerator.addVariable(`cap_${send}_${recv}`, `CapacitiveSensor cap_${send}_${recv} = CapacitiveSensor(${send}, ${recv});`);

        return '';
    });

    // 读取电容式触摸传感器的数值
    registerBlock('sensor_capacitive_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_SEND)
                .appendField(new Blockly.FieldTextInput("4"), "SEND"); // 发送引脚
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_RECV)
                .appendField(new Blockly.FieldTextInput("2"), "RECV"); // 接收引脚
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_SAMPLES)
                .appendField(new Blockly.FieldNumber(30), "SAMPLES"); // 采样次数
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_CAP_READ_TOOLTIP);
        }
    }, (block: any) => {
        const send = block.getFieldValue('SEND');
        const recv = block.getFieldValue('RECV');
        const samples = block.getFieldValue('SAMPLES');

        // 调用 capacitiveSensor 方法进行电容检测
        return [`cap_${send}_${recv}.capacitiveSensor(${samples})`, Order.ATOMIC];
    });


    // =========================================================================
    // 脉搏传感器 (Pulse Sensor - 模拟输出型)
    // =========================================================================

    // 读取脉搏传感器的模拟原始值 (通常通过 analogRead)
    registerBlock('sensor_pulse_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PULSE_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("A0"), "PIN");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_PULSE_READ_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'INPUT');
        // 脉搏传感器直接输出与心跳相关的模拟电压值
        return [`analogRead(${pin})`, Order.ATOMIC];
    });


    // =========================================================================
    // TSL2561 光照传感器 (Adafruit_TSL2561)
    // =========================================================================

    // 初始化 TSL2561 高精度光照传感器 (I2C 接口)
    registerBlock('sensor_tsl2561_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TSL2561_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_LIGHT_INIT_TOOLTIP);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('wire_lib', '#include <Wire.h>');
        arduinoGenerator.addInclude('tsl_lib', '#include <Adafruit_Sensor.h>\n#include <Adafruit_TSL2561_U.h>');

        // 实例化 TSL2561 对象，默认地址和传感器 ID
        arduinoGenerator.addVariable('tsl_obj', `Adafruit_TSL2561_Unified tsl = Adafruit_TSL2561_Unified(TSL2561_ADDR_FLOAT, 12345);`);

        arduinoGenerator.addSetup('tsl_init', `if (!tsl.begin()) { while(1); } // 启动失败则挂起
  tsl.enableAutoRange(true); // 开启自动量程切换
  tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_13MS); // 设置积分时间`);

        return '';
    });

    // 读取 TSL2561 转换后的光照强度 (单位: Lux)
    registerBlock('sensor_tsl2561_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TSL2561_READ);
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_LIGHT_READ_TOOLTIP);
        }
    }, (block: any) => {
        const funcName = 'get_tsl_lux';
        // 内部通过传感器事件对象获取光照强度
        arduinoGenerator.addFunction(funcName, `
float ${funcName}() {
  sensors_event_t event;
  tsl.getEvent(&event);
  if (event.light) return event.light;
  return 0; // 如果传感器无数据输出
}`);
        return [`${funcName}()`, Order.ATOMIC];
    });


};

/**
 * 特殊传感器模块
 * 包含电容式触摸检测、模拟脉搏检测以及高精度 TSL2561 数字光强感应器。
 */
export const SpecialSensorsModule: BlockModule = {
    id: 'hardware.special_sensors',
    name: 'Special Sensors',
    init
};
