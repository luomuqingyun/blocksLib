/**
 * ============================================================
 * I2C 协议模块 (I2C Protocol Module)
 * ============================================================
 * 
 * 封装了 Arduino 标准 Wire 库，支持 I2C 总线通信。
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化 I2C 总线
    registerBlock('arduino_i2c_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_I2C_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("初始化 I2C 总线");
        }
    }, function () {
        // 包含并开启 Wire 库
        arduinoGenerator.addInclude('Wire', '#include <Wire.h>');
        arduinoGenerator.addSetup('Wire.begin', 'Wire.begin();');
        return '';
    });

    // 配置 I2C 时钟频率
    registerBlock('arduino_i2c_config', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_I2C_CONFIG)
                .appendField(new Blockly.FieldDropdown([
                    ["标准 (100KHz)", "100000"],
                    ["快速 (400KHz)", "400000"]
                ]), "CLOCK");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("设置 I2C 时钟速度");
        }
    }, function (block: any) {
        const clock = block.getFieldValue('CLOCK');
        arduinoGenerator.addInclude('Wire', '#include <Wire.h>');
        arduinoGenerator.addSetup('Wire.begin', 'Wire.begin();');
        // 在 setup 中应用频率配置
        return `Wire.setClock(${clock});\n`;
    });

    // 向 I2C 设备写入单字节数据
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
            this.setTooltip("向指定的 I2C 地址发送一个字节");
        }
    }, function (block: any) {
        const addr = arduinoGenerator.valueToCode(block, 'ADDR', Order.NONE) || '0x00';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.NONE) || '0';

        arduinoGenerator.addInclude('Wire', '#include <Wire.h>');
        arduinoGenerator.addSetup('Wire.begin', 'Wire.begin();');

        // 发送序列：开始传输 -> 写入数据 -> 结束传输
        return `Wire.beginTransmission(${addr});\nWire.write(${data});\nWire.endTransmission();\n`;
    });

    // 从 I2C 设备读取单字节数据
    registerBlock('arduino_i2c_read', {
        init: function () {
            this.appendValueInput("ADDR")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_I2C_READ);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip("从指定的 I2C 地址读取一个字节");
        }
    }, function (block: any) {
        const addr = arduinoGenerator.valueToCode(block, 'ADDR', Order.NONE) || '0x00';

        arduinoGenerator.addInclude('Wire', '#include <Wire.h>');
        arduinoGenerator.addSetup('Wire.begin', 'Wire.begin();');

        // 定义单字节读取的辅助函数
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

    // I2C 总线扫描
    registerBlock('arduino_i2c_scan', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_I2C_SCAN);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("扫描 I2C 总线并将发现的地址打印到串口监视器");
        }
    }, function () {
        arduinoGenerator.addInclude('Wire', '#include <Wire.h>');
        arduinoGenerator.addSetup('Wire.begin', 'Wire.begin();');
        arduinoGenerator.addSetup('serial_begin', 'Serial.begin(115200);');

        // 定义 I2C 扫描器的内部逻辑
        const scanFunc = arduinoGenerator.addFunction('i2cScanner', `
void i2cScanner() {
  byte error, address;
  int nDevices = 0;
  Serial.println("开始扫描 I2C 总线...");
  for(address = 1; address < 127; address++ ) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("发现设备，地址: 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      Serial.println("  !");
      nDevices++;
    } else if (error == 4) {
      Serial.print("地址 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      Serial.println(" 发生未知错误");
    }
  }
  if (nDevices == 0) Serial.println("未发现任何 I2C 设备\\n");
  else Serial.println("扫描完成\\n");
}`);
        return `${scanFunc}();\n`;
    });
};

export const I2CModule: BlockModule = {
    id: 'protocols.i2c',
    name: 'I2C',
    init
};
