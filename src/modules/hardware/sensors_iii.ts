/**
 * ============================================================
 * 高级传感器 III 模块 (VL53L0X / MPU6050 / GPS)
 * ============================================================
 * 
 * 提供专业传感器积木:
 * - VL53L0X: ToF 激光测距 (I2C)
 * - MPU6050: 六轴加速度陀螺仪
 * - GPS: TinyGPS++ 定位
 * 
 * 使用 Adafruit 库。
 * 
 * @file src/modules/hardware/sensors_iii.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // VL53L0X Time of Flight (Adafruit_VL53L0X.h)
    // =========================================================================
    // 初始化 VL53L0X 激距传感器 (ToF)
    registerBlock('sensor_vl53l0x_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_VL530X_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_VL530X_TOOLTIP);
        }
    }, (block: any) => {
        // 包含 Adafruit VL53L0X 库
        arduinoGenerator.addInclude('vl53l0x_lib', '#include "Adafruit_VL53L0X.h"');
        // 实例化激光测距对象
        arduinoGenerator.addVariable('vl53l0x_obj', `Adafruit_VL53L0X lox = Adafruit_VL53L0X();`);
        // 在 setup 中测试传感器是否正常启动
        arduinoGenerator.addSetup('vl53l0x_init', `if (!lox.begin()) { while(1); }`);
        return '';
    });

    // 读取 VL53L0X 测量得到的距离 (mm)
    registerBlock('sensor_vl53l0x_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_VL530X_READ);
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_VL530X_TOOLTIP);
        }
    }, (block: any) => {
        // 使用辅助函数包装复杂的结构体读取逻辑
        const funcName = 'readVL53L0X';
        arduinoGenerator.addFunction(funcName, `
int ${funcName}() {
  VL53L0X_RangingMeasurementData_t measure;
  lox.rangingTest(&measure, false); 
  if (measure.RangeStatus != 4) {  // Phase failure 代表超出范围或读取错误
    return measure.RangeMilliMeter;
  } else {
    return -1; // -1 表示测量无效
  }
}`);
        return [`${funcName}()`, Order.ATOMIC];
    });


    // =========================================================================
    // MPU6050 (Adafruit_MPU6050.h)
    // =========================================================================
    // 初始化 MPU6050 六轴传感器 (加速度 + 陀螺仪)
    registerBlock('sensor_mpu6050_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MPU6050_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_MPU6050_TOOLTIP);
        }
    }, (block: any) => {
        // 包含 I2C 和 Adafruit 传感器相关库
        arduinoGenerator.addInclude('wire_lib', '#include <Wire.h>');
        arduinoGenerator.addInclude('mpu6050_lib', '#include <Adafruit_MPU6050.h>');
        arduinoGenerator.addInclude('sensor_lib', '#include <Adafruit_Sensor.h>');

        // 定义全局 MPU 对象
        arduinoGenerator.addVariable('mpu_obj', `Adafruit_MPU6050 mpu;`);

        // 在 setup 中进行初始化配置
        arduinoGenerator.addSetup('mpu_init', `if (!mpu.begin()) { while (1); } // 初始化失败则停止运行（可替换为串口报错）
          mpu.setAccelerometerRange(MPU6050_RANGE_8_G);  // 设置加速度范围为 +/- 8G
          mpu.setGyroRange(MPU6050_RANGE_500_DEG);     // 设置陀螺仪范围为 500 deg/s
          mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);  // 设置数字过滤带宽
        `);
        return '';
    });

    // 读取 MPU6050 的传感器数值
    registerBlock('sensor_mpu6050_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MPU6050_READ)
                .appendField(new Blockly.FieldDropdown([
                    ["加速度 X", "a.acceleration.x"],
                    ["加速度 Y", "a.acceleration.y"],
                    ["加速度 Z", "a.acceleration.z"],
                    ["角速度 X", "g.gyro.x"],
                    ["角速度 Y", "g.gyro.y"],
                    ["角速度 Z", "g.gyro.z"],
                    ["温度", "temp.temperature"]
                ]), "VAL");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_MPU6050_TOOLTIP);
        }
    }, (block: any) => {
        const val = block.getFieldValue('VAL');

        // 为了简化积木逻辑，定义一个通用的读取辅助函数
        arduinoGenerator.addFunction('mpu_read_helper', `
float getMPUValue(int type) {
  sensors_event_t a, g, temp;
  // 调用 getEvent 一次性获取加速度、陀螺仪和温度数据
  mpu.getEvent(&a, &g, &temp);
  switch(type) {
      case 0: return a.acceleration.x;
      case 1: return a.acceleration.y;
      case 2: return a.acceleration.z;
      case 3: return g.gyro.x;
      case 4: return g.gyro.y;
      case 5: return g.gyro.z;
      case 6: return temp.temperature;
  }
  return 0;
}`);

        // 根据下拉菜单选择的分量确定 typeId
        let typeId = 0;
        if (val.includes("acceleration.y")) typeId = 1;
        if (val.includes("acceleration.z")) typeId = 2;
        if (val.includes("gyro.x")) typeId = 3;
        if (val.includes("gyro.y")) typeId = 4;
        if (val.includes("gyro.z")) typeId = 5;
        if (val.includes("temp")) typeId = 6;

        return [`getMPUValue(${typeId})`, Order.ATOMIC];
    });

    // =========================================================================
    // GPS (TinyGPS++)
    // =========================================================================

    // 初始化 GPS 模块 (TinyGPS++)
    registerBlock('sensor_gps_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GPS_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GPS_RX)
                .appendField(new Blockly.FieldTextInput("16"), "RX");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GPS_TX)
                .appendField(new Blockly.FieldTextInput("17"), "TX");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_GPS_TOOLTIP);
        }
    }, (block: any) => {
        const rx = block.getFieldValue('RX');
        const tx = block.getFieldValue('TX');

        // 包含 TinyGPS++ 解析库
        arduinoGenerator.addInclude('gps_lib', '#include <TinyGPS++.h>');
        // 定义全局 GPS 解析对象
        arduinoGenerator.addVariable('gps_obj', `TinyGPSPlus gps;`);

        // 使用 ESP32 的串口 2 与 GPS 通信
        arduinoGenerator.addSetup('gps_serial', `Serial2.begin(9600, SERIAL_8N1, ${rx}, ${tx});`);

        // 在主循环循环中不断喂入串口原始数据进行解析 (GPS 数据解析是流式的)
        arduinoGenerator.addLoop('gps_feed', `while (Serial2.available() > 0) gps.encode(Serial2.read());`);

        return '';
    });

    // 读取解析后的 GPS 信息（经纬度、高度、星数、速度等）
    registerBlock('sensor_gps_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GPS_READ)
                .appendField(new Blockly.FieldDropdown([
                    ["纬度", "location.lat()"],
                    ["经度", "location.lng()"],
                    ["海拔 (m)", "altitude.meters()"],
                    ["卫星数", "satellites.value()"],
                    ["速度 (km/h)", "speed.kmph()"]
                ]), "VAL");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_GPS_TOOLTIP);
        }
    }, (block: any) => {
        const val = block.getFieldValue('VAL');
        // 直接从全局 gps 对象获取解析好的数值
        return [`gps.${val}`, Order.ATOMIC];
    });


};

/**
 * 高级传感器 III 模块
 * 封装了 MPU6050 六轴运动传感器及基于 TinyGPS++ 库的串行 GPS 解析功能。
 */
export const SensorsIIIModule: BlockModule = {
    id: 'hardware.sensors_iii',
    name: 'Advanced Sensors III',
    init
};
