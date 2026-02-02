/**
 * ============================================================
 * DS18B20 温度传感器模块 (Waterproof Temperature Sensor)
 * ============================================================
 * 
 * 提供 DS18B20 单总线温度传感器积木:
 * - ds18b20_init: 初始化 (数据引脚)
 * - ds18b20_request: 发起温度转换
 * - ds18b20_read: 读取温度 (摄氏度)
 * - ds18b20_set_resolution: 设置精度 (9-12位)
 * - ds18b20_get_device_count: 获取传感器数量
 * 
 * 使用 OneWire + DallasTemperature 库。
 * 
 * @file src/modules/hardware/ds18b20.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // DS18B20 (OneWire + DallasTemperature)
    // =========================================================================

    // 初始化 DS18B20 传感器
    registerBlock('ds18b20_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_DS18B20_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'INPUT');

        // 包含单总线 (OneWire) 和 DallasTemperature 驱动库
        arduinoGenerator.addInclude('onewire_lib', '#include <OneWire.h>');
        arduinoGenerator.addInclude('ds18b20_lib', '#include <DallasTemperature.h>');
        // 为特定引脚定义独立的通信对象
        arduinoGenerator.addVariable(`onewire_${pin}`, `OneWire oneWire_${pin}(${pin});`);
        arduinoGenerator.addVariable(`ds18b20_${pin}`, `DallasTemperature sensors_${pin}(&oneWire_${pin});`);

        // 在 setup 中启动传感器
        arduinoGenerator.addSetup(`ds18b20_init_${pin}`, `sensors_${pin}.begin();`);

        return '';
    });

    // 向总线上的所有 DS18B20 传感器发送温度转换请求
    registerBlock('ds18b20_request', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_REQUEST);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_DS18B20_CONV_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        // requestTemperatures 是非阻塞的指令，告诉传感器开始测量温度
        return `sensors_${pin}.requestTemperatures();\n`;
    });

    // 读取指定索引的 DS18B20 传感器的摄氏温度值
    registerBlock('ds18b20_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_INDEX)
                .appendField(new Blockly.FieldNumber(0), "IDX");
            this.setOutput(true, "Number");
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_DS18B20_READ_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const idx = block.getFieldValue('IDX');

        // 通过索引获取温度，单总线上可以挂载多个传感器
        return [`sensors_${pin}.getTempCByIndex(${idx})`, Order.ATOMIC];
    });

    // 设置 DS18B20 的测量分辨率 (9-12位)
    registerBlock('ds18b20_set_resolution', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_RES);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_BITS)
                .appendField(new Blockly.FieldDropdown([["9", "9"], ["10", "10"], ["11", "11"], ["12", "12"]]), "RES");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_DS18B20_RES_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const res = block.getFieldValue('RES');
        // 分辨率越高精度越高，但转换时间也越长
        return `sensors_${pin}.setResolution(${res});\n`;
    });

    // 获取当前 OneWire 总线上检测到的 DS18B20 传感器数量
    registerBlock('ds18b20_get_device_count', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_COUNT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.setOutput(true, "Number");
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_DS18B20_NR_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        return [`sensors_${pin}.getDeviceCount()`, Order.ATOMIC];
    });
};

/**
 * DS18B20 温度传感器模块
 * 支持单引脚 (OneWire) 挂载多个传感器。
 */
export const DS18B20Module: BlockModule = {
    id: 'hardware.ds18b20',
    name: 'DS18B20 Temp',
    init
};
