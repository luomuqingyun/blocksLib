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

    registerBlock('rfid_is_new_card', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_NEW_CARD);
            this.setOutput(true, "Boolean");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_RFID_AVAIL_TOOLTIP);
        }
    }, (block: any) => {
        return ['mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()', Order.ATOMIC];
    });

    registerBlock('rfid_read_uid', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_READ_UID);
            this.setOutput(true, "String");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_RFID_GET_TOOLTIP);
        }
    }, (block: any) => {
        // Helper function to format UID as hex string
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

    registerBlock('rfid_auth', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RFID_AUTH);
            this.appendValueInput("BLOCK")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_RFID_BLOCK);
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

        // Define default key just once globally or locally
        return `
    MFRC522::MIFARE_Key key;
    for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;
    MFRC522::StatusCode status = mfrc522.PCD_Authenticate(MFRC522::${keyCmd}, ${blk}, &key, &(mfrc522.uid));
    if (status != MFRC522::STATUS_OK) {
       // Serial.print(F("Auth failed"));
    }
\n`;
    });

    registerBlock('rfid_write', {
        init: function () {
            this.appendDummyInput()
                .appendField("RFID Write Block");
            this.appendValueInput("BLOCK")
                .setCheck("Number")
                .appendField("Block #");
            this.appendValueInput("DATA")
                .setCheck("String")
                .appendField("String (16 chars)");
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
    // Pad or truncate
    for(int i=0; i<16; i++) {
        if(i < str.length()) buffer[i] = str[i];
        else buffer[i] = ' '; 
    }
    mfrc522.MIFARE_Write(${blk}, buffer, 16);
\n`;
    });

    // Helper function for block read/write is complex due to keys/authentication
    // We will assume default key FF FF FF FF FF FF for simplification in this context
    // or provide a simple wrapper if needed. For now, we'll try to keep it inline or simple func.

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
        arduinoGenerator.addFunction(funcName, `
String ${funcName}(int blockNumber) {
  MFRC522::MIFARE_Key key;
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;
  MFRC522::StatusCode status;
  byte buffersize = 18;
  byte buffer[18];
  status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, blockNumber, &key, &(mfrc522.uid));
  if (status != MFRC522::STATUS_OK) return "";
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
        arduinoGenerator.addFunction(funcName, `
void ${funcName}(int blockNumber, String dataStr) {
  MFRC522::MIFARE_Key key;
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;
  MFRC522::StatusCode status;
  byte buffer[16];
  for(byte i=0; i<16; i++) buffer[i] = 0;
  for(byte i=0; i<dataStr.length() && i<16; i++) buffer[i] = dataStr[i];
  
  status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, blockNumber, &key, &(mfrc522.uid));
  if (status != MFRC522::STATUS_OK) return;
  
  status = mfrc522.MIFARE_Write(blockNumber, buffer, 16);
  if (status != MFRC522::STATUS_OK) return;
}`);
        return `${funcName}(${blockNum}, ${data});\n`;
    });
};

export const RFIDModule: BlockModule = {
    id: 'hardware.rfid',
    name: 'RFID (MFRC522)',
    category: 'RFID',
    init
};
