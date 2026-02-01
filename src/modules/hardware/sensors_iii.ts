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
        arduinoGenerator.addInclude('vl53l0x_lib', '#include "Adafruit_VL53L0X.h"');
        arduinoGenerator.addVariable('vl53l0x_obj', `Adafruit_VL53L0X lox = Adafruit_VL53L0X();`);
        arduinoGenerator.addSetup('vl53l0x_init', `if (!lox.begin()) { while(1); }`);
        return '';
    });

    registerBlock('sensor_vl53l0x_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_VL530X_READ);
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_VL530X_TOOLTIP);
        }
    }, (block: any) => {
        // We wrap in a helper function to handle the struct
        const funcName = 'readVL53L0X';
        arduinoGenerator.addFunction(funcName, `
int ${funcName}() {
  VL53L0X_RangingMeasurementData_t measure;
  lox.rangingTest(&measure, false); 
  if (measure.RangeStatus != 4) {  // phase failures have incorrect data
    return measure.RangeMilliMeter;
  } else {
    return -1; // Out of range
  }
}`);
        return [`${funcName}()`, Order.ATOMIC];
    });


    // =========================================================================
    // MPU6050 (Adafruit_MPU6050.h)
    // =========================================================================
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
        arduinoGenerator.addInclude('wire_lib', '#include <Wire.h>');
        arduinoGenerator.addInclude('mpu6050_lib', '#include <Adafruit_MPU6050.h>');
        arduinoGenerator.addInclude('sensor_lib', '#include <Adafruit_Sensor.h>');
        arduinoGenerator.addVariable('mpu_obj', `Adafruit_MPU6050 mpu;`);
        arduinoGenerator.addSetup('mpu_init', `if (!mpu.begin()) { while (1); } // Halt if failed
          mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
          mpu.setGyroRange(MPU6050_RANGE_500_DEG);
          mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
        `);
        return '';
    });

    registerBlock('sensor_mpu6050_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MPU6050_READ)
                .appendField(new Blockly.FieldDropdown([
                    ["Accel X", "a.acceleration.x"],
                    ["Accel Y", "a.acceleration.y"],
                    ["Accel Z", "a.acceleration.z"],
                    ["Gyro X", "g.gyro.x"],
                    ["Gyro Y", "g.gyro.y"],
                    ["Gyro Z", "g.gyro.z"],
                    ["Temperature", "temp.temperature"]
                ]), "VAL");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_MPU6050_TOOLTIP);
        }
    }, (block: any) => {
        const val = block.getFieldValue('VAL');

        // This requires an update function or we read all every time?
        // Adafruit lib reads into event objects.
        const funcName = 'readMPU6050_' + val.replace(/\./g, '_');

        // This approach is a bit tricky because we need to define 'sensors_event_t a, g, temp;'
        // Best to have a function that returns the specific value updating if needed?
        // Let's assume we read fresh every time for simplicity, though slightly inefficient.
        arduinoGenerator.addFunction('mpu_read_helper', `
float getMPUValue(int type) {
  sensors_event_t a, g, temp;
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

        arduinoGenerator.addInclude('gps_lib', '#include <TinyGPS++.h>');
        arduinoGenerator.addVariable('gps_obj', `TinyGPSPlus gps;`);

        arduinoGenerator.addSetup('gps_serial', `Serial2.begin(9600, SERIAL_8N1, ${rx}, ${tx});`);

        // We need to feed the GPS object in Loop
        arduinoGenerator.addLoop('gps_feed', `while (Serial2.available() > 0) gps.encode(Serial2.read());`);

        return '';
    });

    registerBlock('sensor_gps_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GPS_READ)
                .appendField(new Blockly.FieldDropdown([
                    ["Latitude", "location.lat()"],
                    ["Longitude", "location.lng()"],
                    ["Altitude (m)", "altitude.meters()"],
                    ["Satellites", "satellites.value()"],
                    ["Speed (kmph)", "speed.kmph()"]
                ]), "VAL");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_GPS_TOOLTIP);
        }
    }, (block: any) => {
        const val = block.getFieldValue('VAL');
        return [`gps.${val}`, Order.ATOMIC];
    });


};

export const SensorsIIIModule: BlockModule = {
    id: 'hardware.sensors_iii',
    name: 'Advanced Sensors III',
    category: 'Adv Sensors',
    init
};
