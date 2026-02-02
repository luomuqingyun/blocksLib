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


/**
 * 模块初始化函数
 * 注册加解密与编码相关的积木定义及其代码生成器。
 */
const init = () => {

    // =========================================================================
    // MD5 哈希计算 (MD5 Hashing)
    // 使用 ESP32/ESP8266 内置的 MD5Builder 库生成 32 位十六进制摘要。
    // =========================================================================
    registerBlock('crypto_md5', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CRYPTO_MD5); // MD5 哈希
            this.appendValueInput("TEXT").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT); // 文本
            this.setOutput(true, "String");
            this.setColour(230); // 蓝色系，属于数学/逻辑类扩展
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';

        // 引入 Arduino 核心提供的 MD5Builder
        arduinoGenerator.addInclude('md5_lib', '#include <MD5Builder.h>');

        // 注入私有辅助函数以简化积木调用逻辑
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

    // =========================================================================
    // SHA256 哈希计算 (SHA256 Hashing)
    // 使用工业级的 mbedTLS 库（ESP32 硬件加速支持）执行哈希运算。
    // =========================================================================
    registerBlock('crypto_sha256', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CRYPTO_SHA256); // SHA256 哈希
            this.appendValueInput("TEXT").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.setOutput(true, "String");
            this.setColour(230);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';

        // 引入嵌入式标准的 mbedTLS 库头文件
        arduinoGenerator.addInclude('mbedtls_sha256', '#include "mbedtls/md.h"');

        // 生成 SHA256 辅助函数，将计算结果（32位二进制）转换为 HEX 字符串
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

    // =========================================================================
    // Base64 编码 (Base64 Encoding)
    // 将二进制或普通文本转换为可打印的 Base64 字符串。
    // =========================================================================
    registerBlock('crypto_base64_encode', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CRYPTO_BASE64_ENC); // Base64 编码
            this.appendValueInput("TEXT").setCheck("String").appendField(Blockly.Msg.ARD_TEXT_TEXT);
            this.setOutput(true, "String");
            this.setColour(230);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
        // 依赖 Arduino 核心自带的 base64.h (常用于 ESP 板卡)
        arduinoGenerator.addInclude('base64_lib', '#include <base64.h>');
        return [`base64::encode(${text})`, Order.ATOMIC];
    });

    // =========================================================================
    // Base64 解码 (Base64 Decoding)
    // =========================================================================
    registerBlock('crypto_base64_decode', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CRYPTO_BASE64_DEC); // Base64 解码
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

/**
 * 加密模块定义
 * 为物联网应用提供基础的安全哈希与编码支持。
 */
export const CryptoModule: BlockModule = {
    id: 'core.crypto',
    name: 'Cryptography',
    init
};
