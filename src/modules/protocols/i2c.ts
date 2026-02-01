// ============================================================
// I2C 协议模块 (I2C Protocol Module)
// ============================================================
// 封装了 Arduino 标准 Wire 库，支持 I2C 总线通信。
// 提供的积木包括：初始化、写入数据、读取数据、总线扫描。

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {
    // ------------------------------------------------------------------
    // I2C Init
    // ------------------------------------------------------------------
    registerBlock('arduino_i2c_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_I2C_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("Initialize I2C bus");
        }
    }, function () {
        arduinoGenerator.addInclude('Wire', '#include <Wire.h>');
        arduinoGenerator.addSetup('Wire.begin', 'Wire.begin();');
        return '';
    });

    // ------------------------------------------------------------------
    // I2C Config (Set Clock)
    // ------------------------------------------------------------------
    registerBlock('arduino_i2c_config', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_I2C_CONFIG)
                .appendField(new Blockly.FieldDropdown([
                    ["Standard (100000)", "100000"],
                    ["Fast (400000)", "400000"]
                ]), "CLOCK");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("Set I2C Clock Speed");
        }
    }, function (block: any) {
        const clock = block.getFieldValue('CLOCK');
        arduinoGenerator.addInclude('Wire', '#include <Wire.h>');
        arduinoGenerator.addSetup('Wire.begin', 'Wire.begin();');
        return `Wire.setClock(${clock});\n`;
    });

    // ------------------------------------------------------------------
    // I2C Write Byte
    // ------------------------------------------------------------------
    registerBlock('arduino_i2c_write', {
        init: function () {
            this.appendValueInput("ADDR")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_I2C_WRITE);
            this.appendValueInput("DATA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_I2C_DATA);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("Write a single byte to an I2C device");
        }
    }, function (block: any) {
        const addr = arduinoGenerator.valueToCode(block, 'ADDR', Order.NONE) || '0x00';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.NONE) || '0';

        arduinoGenerator.addInclude('Wire', '#include <Wire.h>');
        arduinoGenerator.addSetup('Wire.begin', 'Wire.begin();');

        return `Wire.beginTransmission(${addr});\nWire.write(${data});\nWire.endTransmission();\n`;
    });

    // ------------------------------------------------------------------
    // I2C Read Byte
    // ------------------------------------------------------------------
    registerBlock('arduino_i2c_read', {
        init: function () {
            this.appendValueInput("ADDR")
                .setCheck("Number")
            this.appendValueInput("ADDR")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_I2C_READ);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip("Read a single byte from an I2C device");
        }
    }, function (block: any) {
        const addr = arduinoGenerator.valueToCode(block, 'ADDR', Order.NONE) || '0x00';

        arduinoGenerator.addInclude('Wire', '#include <Wire.h>');
        arduinoGenerator.addSetup('Wire.begin', 'Wire.begin();');

        // Define helper function for safe reading
        const funcName = arduinoGenerator.addFunction('i2cReadByte', `
uint8_t i2cReadByte(uint8_t addr) {
  Wire.requestFrom(addr, (uint8_t)1);
  if (Wire.available()) {
    return Wire.read();
  }
  return 0;
}`);
        return [`${funcName}(${addr})`, Order.ATOMIC];
    });

    // ------------------------------------------------------------------
    // I2C Scanner (Debugging)
    // ------------------------------------------------------------------
    registerBlock('arduino_i2c_scan', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_I2C_SCAN);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("Scan I2C bus and print addresses to Serial Monitor");
        }
    }, function () {
        arduinoGenerator.addInclude('Wire', '#include <Wire.h>');
        arduinoGenerator.addSetup('Wire.begin', 'Wire.begin();');
        arduinoGenerator.addSetup('serial_begin', 'Serial.begin(115200);');

        const scanFunc = arduinoGenerator.addFunction('i2cScanner', `
void i2cScanner() {
  byte error, address;
  int nDevices = 0;
  Serial.println("Scanning I2C bus...");
  for(address = 1; address < 127; address++ ) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("I2C device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      Serial.println("  !");
      nDevices++;
    } else if (error == 4) {
      Serial.print("Unknown error at address 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }
  }
  if (nDevices == 0) Serial.println("No I2C devices found\\n");
  else Serial.println("done\\n");
}`);
        return `${scanFunc}();\n`;
    });
};

export const I2CModule: BlockModule = {
    id: 'protocols.i2c',
    name: 'I2C',
    category: 'Communication',
    init
};
