/**
 * ============================================================
 * 存储模块 (Storage Module - SD/EEPROM/SPIFFS)
 * ============================================================
 * 
 * 提供数据存储相关积木:
 * - SD 卡: 初始化、读写文件、检查存在
 * - EEPROM: 字节读写 (支持 ESP32/ESP8266 兼容)
 * - SPIFFS: ESP32 内置文件系统
 * 
 * @file src/modules/hardware/storage.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // SD Card (SD.h)
    // =========================================================================

    // Init Block
    // 初始化 SD 卡模块 (SPI 接口)
    registerBlock('storage_sd_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_SD_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_SD_CS_PIN)
                .appendField(new Blockly.FieldTextInput("4"), "CSPIN"); // 片选引脚
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_SD_INIT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const cspin = block.getFieldValue('CSPIN');
        reservePin(block, cspin, 'OUTPUT');

        // 包含 SPI 和 SD 库
        arduinoGenerator.addInclude('sd_lib', '#include <SPI.h>\n#include <SD.h>');
        // 在 setup 中根据引脚启动 SD 卡
        arduinoGenerator.addSetup('sd_init', `SD.begin(${cspin});`);
        return '';
    });

    // Write File Block
    // 在 SD 卡上写入数据（追加模式，并换行）
    registerBlock('storage_sd_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_SD_WRITE); // SD 卡写入
            this.appendValueInput("FILENAME")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_STORAGE_FILENAME); // 文件名
            this.appendValueInput("DATA")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_STORAGE_DATA); // 数据
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_SD_WRITE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const filename = arduinoGenerator.valueToCode(block, 'FILENAME', Order.ATOMIC) || '"log.txt"';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';

        // 封装写入函数，以保证 loop 代码简洁并正确处理文件开关
        const funcName = 'sd_write_file';
        arduinoGenerator.functions_[funcName] = `
void ${funcName}(String filename, String data) {
  File dataFile = SD.open(filename, FILE_WRITE);
  if (dataFile) {
    dataFile.println(data);
    dataFile.close();
  }
}`;
        return `${funcName}(${filename}, ${data});\n`;
    });

    // 从 SD 卡中读取文件内容并返回字符串
    registerBlock('storage_sd_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_SD_READ); // SD 卡读取
            this.appendValueInput("FILENAME")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_STORAGE_FILENAME);
            this.setOutput(true, "String");
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_SD_READ_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const filename = arduinoGenerator.valueToCode(block, 'FILENAME', Order.ATOMIC) || '"log.txt"';

        const funcName = 'sd_read_file';
        arduinoGenerator.functions_[funcName] = `
String ${funcName}(String filename) {
  File dataFile = SD.open(filename);
  if (dataFile) {
    String content = "";
    while (dataFile.available()) {
      content += (char)dataFile.read();
    }
    dataFile.close();
    return content;
  }
  return "";
}`;
        return [`${funcName}(${filename})`, Order.ATOMIC];
    });

    // 检查 SD 卡中是否存在指定文件
    registerBlock('storage_sd_exists', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_SD_EXISTS); // 文件是否存在
            this.appendValueInput("FILENAME")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_STORAGE_FILENAME);
            this.setOutput(true, "Boolean");
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_SD_EXISTS_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const filename = arduinoGenerator.valueToCode(block, 'FILENAME', Order.ATOMIC) || '"log.txt"';
        return [`SD.exists(${filename})`, Order.ATOMIC];
    });


    // =========================================================================
    // EEPROM (电可擦除可编程只读存储器)
    // =========================================================================

    // 向 EEPROM 指定地址写入一个字节的数据
    registerBlock('storage_eeprom_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_EEPROM_WRITE);
            this.appendValueInput("ADDR")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_STORAGE_ADDRESS); // 地址
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_STORAGE_VALUE_BYTE); // 字节值 (0-255)
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_EEPROM_WRITE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const addr = arduinoGenerator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        arduinoGenerator.addInclude('eeprom_lib', '#include <EEPROM.h>');

        // 在 ESP32/ESP8266 上，EEPROM 是在 Flash 中模拟的，需要先 begin 指定大小
        arduinoGenerator.addSetup('eeprom_begin', `
#if defined(ESP32) || defined(ESP8266)
    EEPROM.begin(512); // 初始化 512 字节的模拟 EEPROM 空间
#endif
`);
        return `EEPROM.write(${addr}, ${val});\n`;
    });

    // 从 EEPROM 指定地址读取一个字节的数据
    registerBlock('storage_eeprom_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_EEPROM_READ);
            this.appendValueInput("ADDR")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_STORAGE_ADDRESS);
            this.setOutput(true, "Number");
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_EEPROM_READ_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const addr = arduinoGenerator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0';
        arduinoGenerator.addInclude('eeprom_lib', '#include <EEPROM.h>');
        // 确保初始化代码存在
        arduinoGenerator.addSetup('eeprom_begin', `
#if defined(ESP32) || defined(ESP8266)
    EEPROM.begin(512);
#endif
`);
        return [`EEPROM.read(${addr})`, Order.ATOMIC];
    });

    // 提交 EEPROM 更改（仅对 ESP32/ESP8266 必须，将缓存写入 Flash）
    registerBlock('storage_eeprom_commit', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_EEPROM_COMMIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_EEPROM_COMMIT_TOOLTIP);
        }
    }, (block: any) => {
        return `
#if defined(ESP32) || defined(ESP8266)
    EEPROM.commit();
#endif
`;
    });

    // SPIFFS 文件系统 (仅限 ESP32)
    // 初始化 SPIFFS 存储
    registerBlock('storage_spiffs_begin', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_STORAGE_SPIFFS_BEGIN);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(30);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('spiffs_lib', '#include <SPIFFS.h>');
        // 在 setup 中挂载 SPIFFS 分区，true 表示挂载失败时格式化
        arduinoGenerator.addSetup('spiffs_begin', 'if(!SPIFFS.begin(true)){ return; }');
        return '';
    });

    // 在 SPIFFS 文件系统中写入数据
    registerBlock('storage_spiffs_write', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_STORAGE_SPIFFS_WRITE); // SPIFFS 写入
            this.appendValueInput("PATH").setCheck("String").appendField(Blockly.Msg.ARD_STORAGE_PATH); // 路径
            this.appendValueInput("DATA").setCheck("String").appendField(Blockly.Msg.ARD_STORAGE_DATA); // 内容
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(30);
        }
    }, (block: any) => {
        const path = arduinoGenerator.valueToCode(block, 'PATH', Order.ATOMIC) || '"/test.txt"';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';
        return `
    File file = SPIFFS.open(${path}, FILE_WRITE);
    if(file){
        file.print(${data});
        file.close();
    }
`;
    });





};

/**
 * 存储模块
 * 提供对 SD 卡文件系统、EEPROM 掉电存储以及 ESP32 内置闪存文件系统（SPIFFS）的操作支持。
 */
export const StorageModule: BlockModule = {
    id: 'hardware.storage',
    name: 'Storage (SD/EEPROM)',
    init
};
