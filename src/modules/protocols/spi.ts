// ============================================================
// SPI 协议模块 (SPI Protocol Module)
// ============================================================
// 封装了 Arduino 标准 SPI 库，支持高速同步串行通信。
// 提供的积木包括：初始化、数据传输 (全双工发送与接收)。

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {
    // ------------------------------------------------------------------
    // SPI Init
    // ------------------------------------------------------------------
    registerBlock('arduino_spi_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPI_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("Initialize SPI bus");
        }
    }, function () {
        arduinoGenerator.addInclude('SPI', '#include <SPI.h>');
        arduinoGenerator.addSetup('SPI.begin', 'SPI.begin();');
        return '';
    });

    // ------------------------------------------------------------------
    // SPI Transfer (Send & Receive)
    // ------------------------------------------------------------------
    registerBlock('arduino_spi_transfer', {
        init: function () {
            this.appendValueInput("DATA")
                .setCheck("Number")
            this.appendValueInput("DATA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SPI_TRANS);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip("Transfers a byte over SPI. Returns the received byte.");
        }
    }, function (block: any) {
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.NONE) || '0';

        arduinoGenerator.addInclude('SPI', '#include <SPI.h>');
        // Ensure init, though explicit init block is preferred for clarity
        arduinoGenerator.addSetup('SPI.begin', 'SPI.begin();');

        // Full duplex transfer
        // Full duplex transfer
        return [`SPI.transfer(${data})`, Order.ATOMIC];
    });

    // ------------------------------------------------------------------
    // SPI Write Only (Send without waiting for read)
    // ------------------------------------------------------------------
    registerBlock('arduino_spi_write', {
        init: function () {
            this.appendValueInput("DATA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SPI_WRITE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("Send data over SPI (ignoring return value)");
        }
    }, function (block: any) {
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.NONE) || '0';
        arduinoGenerator.addInclude('SPI', '#include <SPI.h>');
        arduinoGenerator.addSetup('SPI.begin', 'SPI.begin();');
        return `SPI.transfer(${data});\n`;
    });

    // ------------------------------------------------------------------
    // SPI Config (Global)
    // ------------------------------------------------------------------
    registerBlock('arduino_spi_config', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPI_CONFIG);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPI_ORDER)
                .appendField(new Blockly.FieldDropdown([
                    ["MSBFIRST", "MSBFIRST"],
                    ["LSBFIRST", "LSBFIRST"]
                ]), "ORDER");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SPI_MODE)
                .appendField(new Blockly.FieldDropdown([
                    ["Mode 0 (CPOL=0, CPHA=0)", "SPI_MODE0"],
                    ["Mode 1 (CPOL=0, CPHA=1)", "SPI_MODE1"],
                    ["Mode 2 (CPOL=1, CPHA=0)", "SPI_MODE2"],
                    ["Mode 3 (CPOL=1, CPHA=1)", "SPI_MODE3"]
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
            this.setTooltip("Configure SPI Global Settings (Bit Order, Mode, Clock)");
        }
    }, function (block: any) {
        const order = block.getFieldValue('ORDER');
        const mode = block.getFieldValue('MODE');
        const div = block.getFieldValue('DIV');

        arduinoGenerator.addInclude('SPI', '#include <SPI.h>');
        arduinoGenerator.addSetup('SPI.begin', 'SPI.begin();');

        // Use Deprecated but Persistent APIs for global config
        return `SPI.setBitOrder(${order});\nSPI.setDataMode(${mode});\nSPI.setClockDivider(${div});\n`;
    });

    // ------------------------------------------------------------------
    // SPI Setup (Advanced) - Optional for now, simple Begin is usually enough for default pins
    // ------------------------------------------------------------------
};

export const SPIModule: BlockModule = {
    id: 'protocols.spi',
    name: 'SPI',
    category: 'Communication',
    init
};
