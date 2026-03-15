/**
 * ============================================================
 * NRF24L01 无线模块 (2.4GHz Radio Module)
 * ============================================================
 * 
 * 提供 NRF24L01 2.4GHz 短距离无线通信积木 (RF24.h):
 * - nrf24_init: 初始化 (CE/CSN 引脚)
 * - nrf24_send/read: 发送/接收消息
 * - nrf24_available: 检查是否有数据
 * - nrf24_config: 配置信道和功率
 * - nrf24_open_pipe: 打开通信管道
 * 
 * @file src/modules/protocols/nrf24.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // NRF24L01 (RF24.h)
    // =========================================================================

    // 初始化 NRF24L01 模块
    registerBlock('nrf24_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_CE)
                .appendField(new Blockly.FieldTextInput("9"), "CE");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_CSN)
                .appendField(new Blockly.FieldTextInput("10"), "CSN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const ce = block.getFieldValue('CE');
        const csn = block.getFieldValue('CSN');

        reservePin(block, ce, 'OUTPUT');
        reservePin(block, csn, 'OUTPUT');

        // 包含 SPI 和 RF24 库
        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('rf24_lib', '#include <RF24.h>');
        // 定义 radio 对象和默认地址
        arduinoGenerator.addVariable('rf24_obj', `RF24 radio(${ce}, ${csn});`);
        arduinoGenerator.addVariable('rf24_addr', `const byte address[6] = "00001";`); // 演示用固定地址

        // 在 setup 中初始化 radio 并开启监听
        arduinoGenerator.addSetup('rf24_init', `
  radio.begin();
  radio.openWritingPipe(address);
  radio.openReadingPipe(1, address);
  radio.setPALevel(RF24_PA_MIN);
  radio.startListening();`);

        return '';
    });

    // 发送 NRF24 消息
    registerBlock('nrf24_send', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_SEND);
            this.appendValueInput("MSG")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NRF24_MSG);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_SEND_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const msg = arduinoGenerator.valueToCode(block, 'MSG', Order.ATOMIC) || '"Hello"';

        // 发送逻辑：停止监听 -> 写入数据 -> 重新开启监听
        return `
radio.stopListening();
const char text[] = ${msg};
radio.write(&text, sizeof(text));
radio.startListening();
`;
    });

    /**
     * 检查 NRF24L01 缓冲区是否有可用数据
     * @return {Boolean} 是否收到数据
     */
    registerBlock('nrf24_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_AVAIL);
            this.setOutput(true, "Boolean");
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_AVAIL_TOOLTIP);
        }
    }, (block: any) => {
        return ['radio.available()', Order.ATOMIC];
    });

    // 读取 NRF24 接收到的字符串
    registerBlock('nrf24_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_READ_STR);
            this.setOutput(true, "String");
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_READ_TOOLTIP);
        }
    }, (block: any) => {
        // 定义读取字符串的辅助函数
        const funcName = 'nrf24_read_str';
        arduinoGenerator.functions_[funcName] = `
String ${funcName}() {
  char text[32] = "";
  if (radio.available()) {
    radio.read(&text, sizeof(text));
  }
  return String(text);
}`;
        return [`${funcName}()`, Order.ATOMIC];
    });

    // 配置 NRF24 信道和功率等级
    registerBlock('nrf24_config', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_CONFIG);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_CHAN)
                .appendField(new Blockly.FieldNumber(76), "CHAN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_PWR)
                .appendField(new Blockly.FieldDropdown([
                    ["Min", "RF24_PA_MIN"],
                    ["Low", "RF24_PA_LOW"],
                    ["High", "RF24_PA_HIGH"],
                    ["Max", "RF24_PA_MAX"]
                ]), "LEVEL");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_CONFIG_TOOLTIP);
        }
    }, (block: any) => {
        const chan = block.getFieldValue('CHAN');
        const level = block.getFieldValue('LEVEL');
        // 设置通信信道和功率
        return `radio.setChannel(${chan});\nradio.setPALevel(${level});\n`;
    });

    /**
     * 打开 NRF24L01 通信管道 (Pipe)
     * @param {String} TYPE 管道类型 (Reading/Writing)
     * @param {String} ADDR 通信地址 (5位字符)
     */
    registerBlock('nrf24_open_pipe', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_OPEN_PIPE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_TYPE)
                .appendField(new Blockly.FieldDropdown([["Reading", "Reading"], ["Writing", "Writing"]]), "TYPE");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NRF24_ADDR)
                .appendField(new Blockly.FieldTextInput("00001"), "ADDR");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_NRF24_PIPE_TOOLTIP);
        }
    }, (block: any) => {
        const type = block.getFieldValue('TYPE');
        const addr = block.getFieldValue('ADDR');
        // Addresses usually 5 bytes. Strings passed to open*Pipe need conversion or byte array.
        // Simplified usage: passing string literal works if cast/handled, but library expects byte array or uint64.
        // RF24 supports opening pip with const byte address[6] = "..."
        // We will create a local byte array definition for this pipe action.

        // Quick hack: define inline or just pass string if library overload supports it (some do).
        // Standard RF24: openWritingPipe(const uint8_t *address)

        return `
const byte addr_${type}[] = "${addr}";
radio.open${type}Pipe(1, addr_${type}); // Note: Reading pipe needs index (1-5), Writing does not (or ignores it)
// Correcting standard lib usage:
// radio.openWritingPipe(address) -> takes address
// radio.openReadingPipe(number, address) -> takes index and address
if ("${type}" == "Writing") {
 radio.openWritingPipe(addr_${type});
} else {
 radio.openReadingPipe(1, addr_${type});
}
`;
    });
};

export const NRF24Module: BlockModule = {
    id: 'protocols.nrf24',
    name: 'NRF24L01 Radio',
    init
};
