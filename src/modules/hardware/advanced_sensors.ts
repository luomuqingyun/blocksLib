/**
 * ============================================================
 * 高级传感器模块 (Advanced Sensors Module)
 * ============================================================
 * 
 * 提供多种专业传感器积木:
 * - PIR 人体红外感应
 * - ADXL362 三轴加速度计
 * - APDS-9960 手势/颜色传感器
 * - HX711 称重传感器 (电子秤)
 * - BMP280 气压/温度/海拔
 * 
 * @file src/modules/hardware/advanced_sensors.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // ===================================
    // PIR 人体红外感应 (简单的数字读取)
    // ===================================
    // 检测周围是否有人体移动（输出高/低电平）
    registerBlock('sensor_pir_motion', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIR);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN"); // 数字输入引脚
            this.setOutput(true, "Boolean");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_PIR_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'INPUT');
        // PIR 传感器本质上是一个开关量读取
        return [`digitalRead(${pin})`, Order.ATOMIC];
    });


    // ===================================
    // ADXL362 三轴加速度计 (ADXL362.h)
    // ===================================
    // 初始化 SPI 接口的 ADXL362 低功耗三轴加速度计
    registerBlock('sensor_adxl362_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADXL362_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_CS_PIN)
                .appendField(new Blockly.FieldTextInput("10"), "CS"); // 片选引脚
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_ADXL362_TOOLTIP);
        }
    }, (block: any) => {
        const cs = block.getFieldValue('CS');
        reservePin(block, cs, 'OUTPUT');

        // 包含核心库
        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('adxl362_lib', '#include <ADXL362.h>');
        arduinoGenerator.addVariable('adxl_obj', `ADXL362 xl;`);

        // 初始化设备并进入测量模式
        arduinoGenerator.addSetup('adxl_init', `xl.begin(${cs}); // 在引脚 ${cs} 上初始化 ADXL362\n  xl.beginMeasure();`);

        return '';
    });

    // 读取加速度计的轴向数据或温度
    registerBlock('sensor_adxl362_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADXL362_READ)
                .appendField(new Blockly.FieldDropdown([
                    ["X 轴数据", "readXData()"],
                    ["Y 轴数据", "readYData()"],
                    ["Z 轴数据", "readZData()"],
                    [Blockly.Msg.ARD_SENSOR_TEMPERATURE || "温度值", "readTemp()"]
                ]), "AXIS");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_ADXL362_TOOLTIP);
        }
    }, (block: any) => {
        const axis = block.getFieldValue('AXIS');
        return [`xl.${axis}`, Order.ATOMIC];
    });


    // ===================================
    // APDS-9960 手势/颜色传感器 (Arduino_APDS9960.h)
    // ===================================
    // 初始化 APDS-9960 功能 (支持手势、颜色、接近检测)
    registerBlock('sensor_apds9960_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_APDS9960_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_APDS9960_TOOLTIP);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('apds_lib', '#include <Arduino_APDS9960.h>');
        // 阻塞直到检测到传感器
        arduinoGenerator.addSetup('apds_init', `if (!APDS.begin()) { while (1); }`);
        return '';
    });

    // 检查当前是否有手势数据可用
    registerBlock('sensor_apds9960_gesture', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_GESTURE_CHECK);
            this.setOutput(true, "Boolean");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_APDS9960_TOOLTIP);
        }
    }, (block: any) => {
        return [`APDS.gestureAvailable()`, Order.ATOMIC];
    });

    // 读取具体的手势类型 (上、下、左、右等)
    registerBlock('sensor_apds9960_read_gesture', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_GESTURE_READ);
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_APDS9960_TOOLTIP);
        }
    }, (block: any) => {
        return [`APDS.readGesture()`, Order.ATOMIC];
    });

    // 读取并返回 R/G/B 颜色通道的原始数值
    registerBlock('sensor_apds9960_color', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_COLOR_READ)
                .appendField(new Blockly.FieldDropdown([
                    ["红色", "0"],
                    ["绿色", "1"],
                    ["蓝色", "2"]
                ]), "COLOR");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_APDS9960_TOOLTIP);
        }
    }, (block: any) => {
        const color = block.getFieldValue('COLOR');
        // 定义颜色读取辅助函数
        const funcName = 'apds_read_channel';
        arduinoGenerator.functions_[funcName] = `
int ${funcName}(int channel) {
  int r, g, b;
  if (APDS.colorAvailable()) {
    APDS.readColor(r, g, b);
    if (channel == 0) return r;
    if (channel == 1) return g;
    if (channel == 2) return b;
  }
  return 0;
}`;
        return [`${funcName}(${color})`, Order.ATOMIC];
    });


    // ===================================
    // HX711 称重传感器 (HX711.h)
    // ===================================
    // 初始化 HX711 称重模块 (电子秤专用 ADC 芯片)
    registerBlock('sensor_hx711_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_HX711_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_DOUT_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "DOUT"); // 数据引脚
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_CLK_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "CLK"); // 时钟引脚
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_HX711_TOOLTIP);
        }
    }, (block: any) => {
        const dout = block.getFieldValue('DOUT');
        const clk = block.getFieldValue('CLK');

        arduinoGenerator.addInclude('hx711_lib', '#include "HX711.h"');
        arduinoGenerator.addVariable('hx711_obj', `HX711 scale;`);
        arduinoGenerator.addSetup('hx711_init', `scale.begin(${dout}, ${clk});`);

        return '';
    });

    // 读取重量传感器当前的原始 AD 值
    registerBlock('sensor_hx711_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_HX711_READ);
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_HX711_TOOLTIP);
        }
    }, (block: any) => {
        return [`scale.read()`, Order.ATOMIC];
    });

    // 将当前重量设为皮重（校准/置零）
    registerBlock('sensor_hx711_tare', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_HX711_TARE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_HX711_TOOLTIP);
        }
    }, (block: any) => {
        return `scale.tare();\n`;
    });


    // ===================================
    // BMP280 气压/高度传感器 (Adafruit_BMP280.h)
    // ===================================
    // 初始化 BMP280 气压传感器 (通常用于海拔和温度测量)
    registerBlock('sensor_bmp280_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_BMP280_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADDRESS)
                .appendField(new Blockly.FieldTextInput("0x76"), "ADDR"); // I2C 地址 (通常为 0x76 或 0x77)
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_BMP280_TOOLTIP);
        }
    }, (block: any) => {
        const addr = block.getFieldValue('ADDR');

        arduinoGenerator.addInclude('wire_lib', '#include <Wire.h>');
        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('bmp280_lib', '#include <Adafruit_BMP280.h>');
        arduinoGenerator.addVariable('bmp280_obj', `Adafruit_BMP280 bmp;`);

        arduinoGenerator.addSetup('bmp280_init', `if (!bmp.begin(${addr})) { while (1); } // 失败则停止`);
        return '';
    });

    // 读取 BMP280 返回的具体数值 (温度、气压或估算的海拔)
    registerBlock('sensor_bmp280_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_BMP280_READ)
                .appendField(new Blockly.FieldDropdown([
                    ["温度 (°C)", "readTemperature()"],
                    ["大气压 (Pa)", "readPressure()"],
                    ["海拔高度 (m)", "readAltitude(1013.25)"]
                ]), "VAL");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_BMP280_TOOLTIP);
        }
    }, (block: any) => {
        const val = block.getFieldValue('VAL');
        return [`bmp.${val}`, Order.ATOMIC];
    });

};

/**
 * 高级传感器模块
 * 封装了包括运动检测、称重、环境压力、三轴加速度及多功能手势识别在内的多种复杂传感器积木。
 */
export const AdvancedSensorsModule: BlockModule = {
    id: 'hardware.advanced_sensors',
    name: 'Advanced Sensors',
    init
};
