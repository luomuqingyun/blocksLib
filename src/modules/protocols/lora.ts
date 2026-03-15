/**
 * ============================================================
 * LoRa 无线电模块 (LoRa Radio Module)
 * ============================================================
 * 
 * 提供 LoRa 远距离无线通信积木 (LoRa.h):
 * - lora_init: 初始化 (频率, CS/RST/IRQ 引脚)
 * - lora_config: 配置功率/扩频因子/同步字
 * - lora_packet_begin/end: 发送数据包
 * - lora_parse_packet/read: 接收数据
 * - lora_packet_rssi/snr: 信号质量
 * 
 * @file src/modules/protocols/lora.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // LoRa (LoRa.h)
    // =========================================================================

    /**
     * 初始化 LoRa 模块
     * @param {Number} FREQ 工作频率 (如 433E6, 868E6, 915E6)
     * @param {Number} CS 片选引脚 (NSS/CS)
     * @param {Number} RST 复位引脚 (Reset)
     * @param {Number} IRQ 中断引脚 (DIO0)
     */
    registerBlock('lora_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_FREQ)
                .appendField(new Blockly.FieldNumber(915E6), "FREQ");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_CS)
                .appendField(new Blockly.FieldTextInput("10"), "CS");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_RST)
                .appendField(new Blockly.FieldTextInput("9"), "RST");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_IRQ)
                .appendField(new Blockly.FieldTextInput("2"), "IRQ");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const freq = block.getFieldValue('FREQ');
        const cs = block.getFieldValue('CS');
        const rst = block.getFieldValue('RST');
        const irq = block.getFieldValue('IRQ');

        reservePin(block, cs, 'OUTPUT');
        reservePin(block, rst, 'OUTPUT');
        reservePin(block, irq, 'INPUT');

        // 包含 SPI 和 LoRa 库
        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('lora_lib', '#include <LoRa.h>');

        // 在 setup 中配置引脚交互并根据频率开启 LoRa
        arduinoGenerator.addSetup('lora_pins', `LoRa.setPins(${cs}, ${rst}, ${irq});`);
        arduinoGenerator.addSetup('lora_begin', `if (!LoRa.begin(${freq})) {\n    // 初始化失败，死循环\n    while (1);\n  }`);

        return '';
    });

    /**
     * 配置 LoRa 参数
     * @param {Number} PWR 发射功率 (dBm)
     * @param {Number} SF 扩频因子 (6-12)
     * @param {Number} SYNC 同步字 (默认 0x12)
     */
    registerBlock('lora_config', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_CONFIG);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_PWR)
                .appendField(new Blockly.FieldNumber(17), "PWR");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_SF)
                .appendField(new Blockly.FieldNumber(7), "SF");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_SYNC)
                .appendField(new Blockly.FieldNumber(0x12), "SYNC");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_CONFIG_TOOLTIP);
        }
    }, (block: any) => {
        const pwr = block.getFieldValue('PWR');
        const sf = block.getFieldValue('SF');
        const sync = block.getFieldValue('SYNC');

        // 设置发射功率、扩频因子和同步字
        return `LoRa.setTxPower(${pwr});\nLoRa.setSpreadingFactor(${sf});\nLoRa.setSyncWord(${sync});\n`;
    });

    /**
     * 开始构建 LoRa 数据包
     */
    registerBlock('lora_packet_begin', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_BEGIN_PKT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_PKT_START_TOOLTIP);
        }
    }, (block: any) => {
        return `LoRa.beginPacket();\n`;
    });

    /**
     * 向 LoRa 数据包中写入数据内容
     * @param {String} DATA 要发送的文本或数据
     */
    registerBlock('lora_print', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_PRINT);
            this.appendValueInput("DATA")
                .setCheck("String")
                .appendField("数据");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_PKT_ADD_TOOLTIP);
        }
    }, (block: any) => {
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';
        return `LoRa.print(${data});\n`;
    });

    /**
     * 结束并发送 LoRa 数据包
     */
    registerBlock('lora_packet_end', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_END_PKT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_PKT_SEND_TOOLTIP);
        }
    }, (block: any) => {
        return `LoRa.endPacket();\n`;
    });

    /**
     * 检查并解析收到的 LoRa 数据包
     * @return {Number} 数据包大小 (0 表示没有收到数据包)
     */
    registerBlock('lora_parse_packet', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_PARSE);
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_PARSE_TOOLTIP);
        }
    }, (block: any) => {
        return [`LoRa.parsePacket()`, Order.ATOMIC];
    });

    /**
     * 从接收队列读取一个字节
     * @return {Number} 读取到的字符 ASCII 码
     */
    registerBlock('lora_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_READ);
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_READ_CHAR_TOOLTIP);
        }
    }, (block: any) => {
        return [`LoRa.read()`, Order.ATOMIC];
    });

    /**
     * 检查接收队列中可读取的字节数
     * @return {Number} 可读取字节数
     */
    registerBlock('lora_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_AVAIL);
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_AVAIL_TOOLTIP);
        }
    }, (block: any) => {
        return [`LoRa.available()`, Order.ATOMIC];
    });

    /**
     * 获取最后接收到数据包的信号强度 (RSSI)
     * @return {Number} RSSI 值 (dBm)
     */
    registerBlock('lora_packet_rssi', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_RSSI);
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_RSSI_TOOLTIP);
        }
    }, (block: any) => {
        return [`LoRa.packetRssi()`, Order.ATOMIC];
    });

    /**
     * 获取最后接收到数据包的信噪比 (SNR)
     * @return {Number} SNR 值
     */
    registerBlock('lora_packet_snr', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_SNR);
            this.setOutput(true, "Number");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_SNR_TOOLTIP);
        }
    }, (block: any) => {
        return [`LoRa.packetSnr()`, Order.ATOMIC];
    });

    /**
     * 读取 LoRa 接收到的完整字符串数据包
     * @return {String} 接收到的文本内容
     */
    registerBlock('lora_read_string', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_LORA_READ_STR);
            this.setOutput(true, "String");
            this.setColour(190);
            this.setTooltip(Blockly.Msg.ARD_LORA_READ_STR_TOOLTIP);
        }
    }, (block: any) => {
        const funcName = 'lora_read_string_fn';
        // 定义读取字符串的辅助函数，通过循环 LoRa.read 拼接
        arduinoGenerator.functions_[funcName] = `
String ${funcName}() {
  String received = "";
  while (LoRa.available()) {
    received += (char)LoRa.read();
  }
  return received;
}`;
        return [`${funcName}()`, Order.ATOMIC];
    });

};

export const LoRaModule: BlockModule = {
    id: 'protocols.lora',
    name: 'LoRa Radio',
    init
};
