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
    registerBlock('storage_sd_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_SD_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_SD_CS_PIN)
                .appendField(new Blockly.FieldTextInput("4"), "CSPIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_SD_INIT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const cspin = block.getFieldValue('CSPIN');
        reservePin(block, cspin, 'OUTPUT');

        arduinoGenerator.addInclude('sd_lib', '#include <SPI.h>\n#include <SD.h>');
        arduinoGenerator.addSetup('sd_init', `SD.begin(${cspin});`);
        return '';
    });

    // Write File Block
    registerBlock('storage_sd_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_SD_WRITE);
            this.appendValueInput("FILENAME")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_STORAGE_FILENAME);
            this.appendValueInput("DATA")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_STORAGE_DATA);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_SD_WRITE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const filename = arduinoGenerator.valueToCode(block, 'FILENAME', Order.ATOMIC) || '"log.txt"';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';

        // Using a function to keep loop code clean and handle file opening cleanly
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

    registerBlock('storage_sd_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_SD_READ);
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

    registerBlock('storage_sd_exists', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_SD_EXISTS);
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
    // EEPROM
    // =========================================================================

    registerBlock('storage_eeprom_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STORAGE_EEPROM_WRITE);
            this.appendValueInput("ADDR")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_STORAGE_ADDRESS);
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_STORAGE_VALUE_BYTE);
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

        // ESP32 compatibility: EEPROM.begin(size) needed in setup if not present
        // We can add a safe check or just assume standard Arduino or add setup line
        // For ESP32, EEPROM is emulated in flash.
        // Let's add a generic safe begin for ESP32 in setup just in case.
        arduinoGenerator.addSetup('eeprom_begin', `
#if defined(ESP32) || defined(ESP8266)
    EEPROM.begin(512);
#endif
`);
        return `EEPROM.write(${addr}, ${val});\n`;
    });

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
        // Ensure setup is present if read is used first
        arduinoGenerator.addSetup('eeprom_begin', `
#if defined(ESP32) || defined(ESP8266)
    EEPROM.begin(512);
#endif
`);
        return [`EEPROM.read(${addr})`, Order.ATOMIC];
    });

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

    // SPIFFS (ESP32)
    registerBlock('storage_spiffs_begin', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_STORAGE_SPIFFS_BEGIN);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(30);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('spiffs_lib', '#include <SPIFFS.h>');
        arduinoGenerator.addSetup('spiffs_begin', 'if(!SPIFFS.begin(true)){ return; }');
        return '';
    });

    registerBlock('storage_spiffs_write', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_STORAGE_SPIFFS_WRITE);
            this.appendValueInput("PATH").setCheck("String").appendField(Blockly.Msg.ARD_STORAGE_PATH);
            this.appendValueInput("DATA").setCheck("String").appendField(Blockly.Msg.ARD_STORAGE_DATA);
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

export const StorageModule: BlockModule = {
    id: 'hardware.storage',
    name: 'Storage (SD/EEPROM)',
    category: 'Storage',
    init
};
