/**
 * ============================================================
 * RFID 模块 (RFID Module - MFRC522)
 * ============================================================
 * 
 * 提供 MFRC522 RFID 读卡器积木:
 * - rfid_init: 初始化 (SDA/RST 引脚)
 * - rfid_is_new_card: 检测新卡
 * - rfid_read_uid: 读取卡片 UID
 * - rfid_auth: 认证块
 * - rfid_read_block/write_block: 读写数据块
 * - rfid_halt: 停止通信
 * 
 * 使用默认密钥 0xFF×6 进行 MIFARE Classic 操作。
 * 
 * @file src/modules/hardware/rfid.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // RFID MFRC522 (MFRC522.h)
    // =========================================================================

    registerBlock('rfid_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_SDA)
                .appendField(new Blockly.FieldTextInput("10"), "SDA");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_RST)
                .appendField(new Blockly.FieldTextInput("9"), "RST");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_RFID_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const sda = block.getFieldValue('SDA');
        const rst = block.getFieldValue('RST');

        reservePin(block, sda, 'OUTPUT');
        reservePin(block, rst, 'OUTPUT');

        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('rfid_lib', '#include <MFRC522.h>');
        arduinoGenerator.addVariable('rfid_obj', `MFRC522 mfrc522(${sda}, ${rst});`);

        arduinoGenerator.addSetup('rfid_init', `SPI.begin();\n  mfrc522.PCD_Init();`);

        return '';
    });

    // 检测是否有新卡片放置在读卡器上，并尝试读取其序列号
    registerBlock('rfid_is_new_card', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_NEW_CARD);
            this.setOutput(true, "Boolean");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_RFID_AVAIL_TOOLTIP);
        }
    }, (block: any) => {
        // PICC_IsNewCardPresent: 检查感应区域是否有卡
        // PICC_ReadCardSerial: 读取卡片信息
        return ['mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()', Order.ATOMIC];
    });

    // 读取当前卡片的唯一标识符 (UID) 并以十六进制字符串形式返回
    registerBlock('rfid_read_uid', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_READ_UID);
            this.setOutput(true, "String");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_RFID_GET_TOOLTIP);
        }
    }, (block: any) => {
        // 定义辅助函数 get_rfid_uid 遍历字节数组并拼接成字符串
        const funcName = 'get_rfid_uid';
        arduinoGenerator.addFunction(funcName, `
String ${funcName}() {
  String content= "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
     content.concat(String(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " "));
     content.concat(String(mfrc522.uid.uidByte[i], HEX));
  }
  content.toUpperCase();
  return content.substring(1);
}`);
        return [`${funcName}()`, Order.ATOMIC];
    });

    // 停止读取并释放卡片通信，允许系统进入低功耗或与其他设备通信
    registerBlock('rfid_halt', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_HALT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_RFID_STOP_TOOLTIP);
        }
    }, (block: any) => {
        return `mfrc522.PICC_HaltA();\n  mfrc522.PCD_StopCrypto1();\n`;
    });

    // MIFARE 卡片扇区验证（读写扇区前必须先通过密钥验证）
    registerBlock('rfid_auth', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_AUTH);
            this.appendValueInput("BLOCK")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_RFID_BLOCK); // 扇区内的块编号
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_KEY_TYPE)
                .appendField(new Blockly.FieldDropdown([["Key A", "A"], ["Key B", "B"]]), "KEY_TYPE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_RFID_AUTH_TOOLTIP);
        }
    }, (block: any) => {
        const blk = arduinoGenerator.valueToCode(block, 'BLOCK', Order.ATOMIC) || '0';
        const type = block.getFieldValue('KEY_TYPE');
        const keyCmd = type === 'A' ? 'PICC_CMD_MF_AUTH_KEY_A' : 'PICC_CMD_MF_AUTH_KEY_B';

        return `
    MFRC522::MIFARE_Key key;
    // 使用工厂默认密钥: FF FF FF FF FF FF
    for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;
    // 调用 PCD_Authenticate 进行身份校验，校验通过后才能操作 block
    MFRC522::StatusCode status = mfrc522.PCD_Authenticate(MFRC522::${keyCmd}, ${blk}, &key, &(mfrc522.uid));
    if (status != MFRC522::STATUS_OK) {
       // 校验失败逻辑（可选）
    }
\n`;
    });

    // 写入原始数据块 (16 字节)
    registerBlock('rfid_write', {
        init: function () {
            this.appendDummyInput()
                .appendField("RFID 写入数据块");
            this.appendValueInput("BLOCK")
                .setCheck("Number")
                .appendField("块编号 #");
            this.appendValueInput("DATA")
                .setCheck("String")
                .appendField("字符串 (16 字符)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
        }
    }, (block: any) => {
        const blk = arduinoGenerator.valueToCode(block, 'BLOCK', Order.ATOMIC) || '4';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '"1234567812345678"';

        return `
    byte buffer[18];
    String str = ${data};
    // 自动填充或截断至 16 字节宽度
    for(int i=0; i<16; i++) {
        if(i < str.length()) buffer[i] = str[i];
        else buffer[i] = ' '; 
    }
    mfrc522.MIFARE_Write(${blk}, buffer, 16);
\n`;
    });

    // 读取指定数据块的内容并转换为字符串
    registerBlock('rfid_read_block', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_READ);
            this.appendValueInput("BLOCK")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_RFID_BLOCK);
            this.setOutput(true, "String");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_RFID_READ_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const blockNum = arduinoGenerator.valueToCode(block, 'BLOCK', Order.ATOMIC) || '0';

        const funcName = 'rfid_read_str_block';
        // 生成辅助函数，包含自动验证和读取逻辑
        arduinoGenerator.addFunction(funcName, `
String ${funcName}(int blockNumber) {
  MFRC522::MIFARE_Key key;
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;
  MFRC522::StatusCode status;
  byte buffersize = 18;
  byte buffer[18];
  
  // 操作前必须先验证对应块所属的扇区
  status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, blockNumber, &key, &(mfrc522.uid));
  if (status != MFRC522::STATUS_OK) return "";
  
  // 读取块内容
  status = mfrc522.MIFARE_Read(blockNumber, buffer, &buffersize);
  if (status != MFRC522::STATUS_OK) return "";
  
  String str = "";
  for(byte i = 0; i < 16; i++){
    if(buffer[i] != 0) str += (char)buffer[i];
  }
  return str;
}`);
        return [`${funcName}(${blockNum})`, Order.ATOMIC];
    });

    // 格式化写入字符串到指定数据块
    registerBlock('rfid_write_block', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_WRITE);
            this.appendValueInput("BLOCK")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_RFID_BLOCK);
            this.appendValueInput("DATA")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_RFID_DATA);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_RFID_WRITE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const blockNum = arduinoGenerator.valueToCode(block, 'BLOCK', Order.ATOMIC) || '4';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '"hello"';

        const funcName = 'rfid_write_str_block';
        // 生成辅助函数，清理旧数据并写入新字符串
        arduinoGenerator.addFunction(funcName, `
void ${funcName}(int blockNumber, String dataStr) {
  MFRC522::MIFARE_Key key;
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;
  MFRC522::StatusCode status;
  byte buffer[16];
  
  // 填充缓冲区
  for(byte i=0; i<16; i++) buffer[i] = 0;
  for(byte i=0; i<dataStr.length() && i<16; i++) buffer[i] = dataStr[i];
  
  // 验证
  status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, blockNumber, &key, &(mfrc522.uid));
  if (status != MFRC522::STATUS_OK) return;
  
  // 写入
  status = mfrc522.MIFARE_Write(blockNumber, buffer, 16);
  if (status != MFRC522::STATUS_OK) return;
}`);
        return `${funcName}(${blockNum}, ${data});\n`;
    });
};

/**
 * RFID (MFRC522) 模块
 * 提供对 MIFARE IC 卡的 UID 读取、块读取和写入功能。
 */
export const RFIDModule: BlockModule = {
    id: 'hardware.rfid',
    name: 'RFID (MFRC522)',
    init
};
