import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // PIR Motion Sensor (Simple Digital Read)
    // =========================================================================
    registerBlock('sensor_pir_motion', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIR);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.setOutput(true, "Boolean");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_PIR_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'INPUT');
        return [`digitalRead(${pin})`, Order.ATOMIC];
    });


    // =========================================================================
    // ADXL362 Accelerometer (ADXL362.h)
    // =========================================================================
    registerBlock('sensor_adxl362_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADXL362_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_CS_PIN)
                .appendField(new Blockly.FieldTextInput("10"), "CS");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_ADXL362_TOOLTIP);
        }
    }, (block: any) => {
        const cs = block.getFieldValue('CS');
        reservePin(block, cs, 'OUTPUT');

        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('adxl362_lib', '#include <ADXL362.h>');
        arduinoGenerator.addVariable('adxl_obj', `ADXL362 xl;`);

        arduinoGenerator.addSetup('adxl_init', `xl.begin({${cs}}); // Setup ADXL362 on CS pin ${cs}
  xl.beginMeasure();`);

        return '';
    });

    registerBlock('sensor_adxl362_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADXL362_READ)
                .appendField(new Blockly.FieldDropdown([
                    ["X Data", "readXData()"],
                    ["Y Data", "readYData()"],
                    ["Z Data", "readZData()"],
                    [Blockly.Msg.ARD_SENSOR_TEMPERATURE || "Temperature", "readTemp()"]
                ]), "AXIS");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_ADXL362_TOOLTIP);
        }
    }, (block: any) => {
        const axis = block.getFieldValue('AXIS');
        return [`xl.${axis}`, Order.ATOMIC];
    });


    // =========================================================================
    // APDS-9960 Gesture/Color (Arduino_APDS9960.h)
    // =========================================================================
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
        arduinoGenerator.addSetup('apds_init', `if (!APDS.begin()) { while (1); }`);
        return '';
    });

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

    registerBlock('sensor_apds9960_color', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_COLOR_READ)
                .appendField(new Blockly.FieldDropdown([
                    ["Red", "0"],
                    ["Green", "1"],
                    ["Blue", "2"]
                ]), "COLOR");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_APDS9960_TOOLTIP);
        }
    }, (block: any) => {
        const color = block.getFieldValue('COLOR');
        // APDS lib usually reads distinct vars: APDS.readColor(r, g, b);
        // Blocks need a simple expression. We wrap logic in function.
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


    // =========================================================================
    // HX711 Load Cell (HX711.h)
    // =========================================================================
    registerBlock('sensor_hx711_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_HX711_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_DOUT_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "DOUT");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_CLK_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "CLK");
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


    // =========================================================================
    // BMP280 Pressure/Altitude (Adafruit_BMP280.h)
    // =========================================================================
    registerBlock('sensor_bmp280_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_BMP280_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADDRESS)
                .appendField(new Blockly.FieldTextInput("0x76"), "ADDR");
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

        arduinoGenerator.addSetup('bmp280_init', `if (!bmp.begin(${addr})) { while (1); } // Halt if failed`);
        return '';
    });

    registerBlock('sensor_bmp280_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_BMP280_READ)
                .appendField(new Blockly.FieldDropdown([
                    [Blockly.Msg.ARD_SENSOR_TEMPERATURE || "Temperature (C)", "readTemperature()"],
                    ["Pressure (Pa)", "readPressure()"],
                    ["Altitude (m)", "readAltitude(1013.25)"]
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

export const AdvancedSensorsModule: BlockModule = {
    id: 'hardware.advanced_sensors',
    name: 'Advanced Sensors',
    category: 'Adv Sensors',
    init
};
