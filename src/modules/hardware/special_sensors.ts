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

    registerBlock('sensor_capacitive_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_SEND)
                .appendField(new Blockly.FieldTextInput("4"), "SEND");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_RECV)
                .appendField(new Blockly.FieldTextInput("2"), "RECV");
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

        arduinoGenerator.addInclude('cap_lib', '#include <CapacitiveSensor.h>');
        // Object name driven by pins to allow multiple
        arduinoGenerator.addVariable(`cap_${send}_${recv}`, `CapacitiveSensor cap_${send}_${recv} = CapacitiveSensor(${send}, ${recv});`);

        return '';
    });

    registerBlock('sensor_capacitive_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_SEND)
                .appendField(new Blockly.FieldTextInput("4"), "SEND");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_RECV)
                .appendField(new Blockly.FieldTextInput("2"), "RECV");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAP_SAMPLES)
                .appendField(new Blockly.FieldNumber(30), "SAMPLES");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_CAP_READ_TOOLTIP);
        }
    }, (block: any) => {
        const send = block.getFieldValue('SEND');
        const recv = block.getFieldValue('RECV');
        const samples = block.getFieldValue('SAMPLES');

        return [`cap_${send}_${recv}.capacitiveSensor(${samples})`, Order.ATOMIC];
    });


    // =========================================================================
    // Pulse Sensor (Simple Analog)
    // =========================================================================

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
        return [`analogRead(${pin})`, Order.ATOMIC];
    });


    // =========================================================================
    // TSL2561 Light Sensor (Adafruit_TSL2561)
    // =========================================================================

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
        arduinoGenerator.addVariable('tsl_obj', `Adafruit_TSL2561_Unified tsl = Adafruit_TSL2561_Unified(TSL2561_ADDR_FLOAT, 12345);`);

        arduinoGenerator.addSetup('tsl_init', `if (!tsl.begin()) { while(1); }\n  tsl.enableAutoRange(true);\n  tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_13MS);`);

        return '';
    });

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
        arduinoGenerator.addFunction(funcName, `
float ${funcName}() {
  sensors_event_t event;
  tsl.getEvent(&event);
  if (event.light) return event.light;
  return 0;
}`);
        return [`${funcName}()`, Order.ATOMIC];
    });


};

export const SpecialSensorsModule: BlockModule = {
    id: 'hardware.special_sensors',
    name: 'Special Sensors',
    category: 'Special Sensors',
    init
};
