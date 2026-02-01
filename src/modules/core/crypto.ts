/**
 * ============================================================
 * 加密模块 (Cryptography Module)
 * ============================================================
 * 
 * 提供加密和编码相关积木:
 * - crypto_md5: MD5 哈希
 * - crypto_sha256: SHA256 哈希
 * - crypto_base64_encode: Base64 编码
 * - crypto_base64_decode: Base64 解码
 * 
 * @file src/modules/core/crypto.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('crypto_md5', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CRYPTO_MD5);
            this.appendValueInput("TEXT").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.setOutput(true, "String");
            this.setColour(230); // Math/Logic
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';

        arduinoGenerator.addInclude('md5_lib', '#include <MD5Builder.h>');

        const funcName = 'calculateMD5';
        arduinoGenerator.functions_[funcName] = `
String ${funcName}(String text) {
  MD5Builder md5;
  md5.begin();
  md5.add(text);
  md5.calculate();
  return md5.toString();
}`;
        return [`${funcName}(${text})`, Order.ATOMIC];
    });

    registerBlock('crypto_sha256', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CRYPTO_SHA256);
            this.appendValueInput("TEXT").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.setOutput(true, "String");
            this.setColour(230);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';

        arduinoGenerator.addInclude('mbedtls_sha256', '#include "mbedtls/md.h"');

        const funcName = 'calculateSHA256';
        arduinoGenerator.functions_[funcName] = `
String ${funcName}(String text) {
  byte shaResult[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;
  
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 0);
  mbedtls_md_starts(&ctx);
  mbedtls_md_update(&ctx, (const unsigned char *) text.c_str(), text.length());
  mbedtls_md_finish(&ctx, shaResult);
  mbedtls_md_free(&ctx);
  
  String shaHex = "";
  for(int i=0; i<32; i++) {
      if(shaResult[i] < 16) shaHex += "0";
      shaHex += String(shaResult[i], HEX);
  }
  return shaHex;
}`;
        return [`${funcName}(${text})`, Order.ATOMIC];
    });

    registerBlock('crypto_base64_encode', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CRYPTO_BASE64_ENC);
            this.appendValueInput("TEXT").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.setOutput(true, "String");
            this.setColour(230);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
        arduinoGenerator.addInclude('base64_lib', '#include <base64.h>');
        // Note: Arduino has multiple base64 libs. ESP32 core often has 'base64' included or available.
        // If generic 'base64.h' isn't there, we might need a custom implementation or include correct header path.
        // ESP32 usually has <base64.h> exposing `encode()` and `decode()`.
        return [`base64::encode(${text})`, Order.ATOMIC];
    });

    registerBlock('crypto_base64_decode', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CRYPTO_BASE64_DEC);
            this.appendValueInput("TEXT").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.setOutput(true, "String");
            this.setColour(230);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
        arduinoGenerator.addInclude('base64_lib', '#include <base64.h>');
        return [`base64::decode(${text})`, Order.ATOMIC];
    });

};

export const CryptoModule: BlockModule = {
    id: 'core.crypto',
    name: 'Cryptography',
    category: 'Security', // New category
    init
};
