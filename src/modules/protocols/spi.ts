/**
 * ============================================================
 * SPI 协议模块 (SPI Protocol Module)
 * ============================================================
 * 
 * 封装了 Arduino 标准 SPI 库，支持高速同步串行通信。
 * 提供的积木包括：初始化、数据传输 (全双工发送与接收)。
 * 
 * @file src/modules/protocols/spi.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {
    // ------------------------------------------------------------------
    // SPI Init
    // ------------------------------------------------------------------
    // 初始化 SPI 总线
    registerBlock('arduino_spi_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPI_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("初始化 SPI 总线");
        }
    }, function () {
        // 包含并开启 SPI 库
        arduinoGenerator.addInclude('SPI', '#include <SPI.h>');
        arduinoGenerator.addSetup('SPI.begin', 'SPI.begin();');
        return '';
    });

    // ------------------------------------------------------------------
    // SPI Transfer (Send & Receive)
    // ------------------------------------------------------------------
    // SPI 数据交换 (全双工发送与接收)
    registerBlock('arduino_spi_transfer', {
        init: function () {
            this.appendValueInput("DATA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SPI_TRANS);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip("在 SPI 总线上交换一个字节。发送一个字节并返回接收到的字节。");
        }
    }, function (block: any) {
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.NONE) || '0';

        arduinoGenerator.addInclude('SPI', '#include <SPI.h>');
        // 自动注入初始化，优先推荐显式使用初始化积木
        arduinoGenerator.addSetup('SPI.begin', 'SPI.begin();');

        // 执行全双工传输
        return [`SPI.transfer(${data})`, Order.ATOMIC];
    });

    // ------------------------------------------------------------------
    // SPI Write Only (Send without waiting for read)
    // ------------------------------------------------------------------
    // SPI 仅发送 (不等待读取)
    registerBlock('arduino_spi_write', {
        init: function () {
            this.appendValueInput("DATA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SPI_WRITE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("在 SPI 总线上发送数据 (忽略返回值)");
        }
    }, function (block: any) {
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.NONE) || '0';
        arduinoGenerator.addInclude('SPI', '#include <SPI.h>');
        arduinoGenerator.addSetup('SPI.begin', 'SPI.begin();');
        // 虽然使用的是 SPI.transfer，但丢弃了其返回值
        return `SPI.transfer(${data});\n`;
    });

    // ------------------------------------------------------------------
    // SPI Config (Global)
    // ------------------------------------------------------------------
    // 配置 SPI 全局参数 (位序、模式、分频)
    registerBlock('arduino_spi_config', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPI_CONFIG);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPI_ORDER)
                .appendField(new Blockly.FieldDropdown([
                    ["高位在前 (MSBFIRST)", "MSBFIRST"],
                    ["低位在前 (LSBFIRST)", "LSBFIRST"]
                ]), "ORDER");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPI_MODE)
                .appendField(new Blockly.FieldDropdown([
                    ["模式 0 (CPOL=0, CPHA=0)", "SPI_MODE0"],
                    ["模式 1 (CPOL=0, CPHA=1)", "SPI_MODE1"],
                    ["模式 2 (CPOL=1, CPHA=0)", "SPI_MODE2"],
                    ["模式 3 (CPOL=1, CPHA=1)", "SPI_MODE3"]
                ]), "MODE");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPI_DIV)
                .appendField(new Blockly.FieldDropdown([
                    ["Div 2", "SPI_CLOCK_DIV2"],
                    ["Div 4", "SPI_CLOCK_DIV4"],
                    ["Div 8", "SPI_CLOCK_DIV8"],
                    ["Div 16", "SPI_CLOCK_DIV16"],
                    ["Div 32", "SPI_CLOCK_DIV32"],
                    ["Div 64", "SPI_CLOCK_DIV64"],
                    ["Div 128", "SPI_CLOCK_DIV128"]
                ]), "DIV");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("配置 SPI 全局设置（位序、模式、时钟速度）");
        }
    }, function (block: any) {
        const order = block.getFieldValue('ORDER');
        const mode = block.getFieldValue('MODE');
        const div = block.getFieldValue('DIV');

        arduinoGenerator.addInclude('SPI', '#include <SPI.h>');
        arduinoGenerator.addSetup('SPI.begin', 'SPI.begin();');

        // 使用 Arduino 标准 API 设置位序、模式和时钟分频
        return `SPI.setBitOrder(${order});\nSPI.setDataMode(${mode});\nSPI.setClockDivider(${div});\n`;
    });

    // ------------------------------------------------------------------
    // SPI Setup (Advanced) - Optional for now, simple Begin is usually enough for default pins
    // ------------------------------------------------------------------
};

export const SPIModule: BlockModule = {
    id: 'protocols.spi',
    name: 'SPI',
    init
};
