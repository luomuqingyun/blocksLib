/**
 * ============================================================
 * LED 点阵显示模块 (MAX7219 8x8 LED Matrix)
 * ============================================================
 * 
 * 提供 MAX7219 LED 点阵积木:
 * - display_matrix_init: 初始化 (DIN/CLK/CS)
 * - display_matrix_set_led: 设置单个 LED
 * - display_matrix_row/col: 设置整行/列
 * - display_matrix_clear/brightness: 清屏/亮度
 * 
 * 使用 LedControl.h 库。
 * 
 * @file src/modules/hardware/display_matrix.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // MAX7219 LED Matrix (LedControl.h)
    // =========================================================================

    registerBlock('display_matrix_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MATRIX_INIT);
            this.appendDummyInput()
                .appendField("DIN")
                .appendField(new Blockly.FieldTextInput("12"), "DIN");
            this.appendDummyInput()
                .appendField("CLK")
                .appendField(new Blockly.FieldTextInput("11"), "CLK");
            this.appendDummyInput()
                .appendField("CS")
                .appendField(new Blockly.FieldTextInput("10"), "CS");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_MATRIX_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const din = block.getFieldValue('DIN');
        const clk = block.getFieldValue('CLK');
        const cs = block.getFieldValue('CS');

        reservePin(block, din, 'OUTPUT');
        reservePin(block, clk, 'OUTPUT');
        reservePin(block, cs, 'OUTPUT');

        arduinoGenerator.addInclude('matrix_lib', '#include <LedControl.h>');
        arduinoGenerator.addVariable('matrix_obj', `LedControl lc = LedControl(${din}, ${clk}, ${cs}, 1);`);

        arduinoGenerator.addSetup('matrix_init', `
  lc.shutdown(0, false);
  lc.setIntensity(0, 8);
  lc.clearDisplay(0);`);

        return '';
    });

    registerBlock('display_matrix_set_led', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MATRIX_SET_LED);
            this.appendValueInput("ROW")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MATRIX_ROW_NUM);
            this.appendValueInput("COL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MATRIX_COL_NUM);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACTUATOR_STATE)
                .appendField(new Blockly.FieldDropdown([["ON", "true"], ["OFF", "false"]]), "STATE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_MATRIX_LED_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const row = arduinoGenerator.valueToCode(block, 'ROW', Order.ATOMIC) || '0';
        const col = arduinoGenerator.valueToCode(block, 'COL', Order.ATOMIC) || '0';
        const state = block.getFieldValue('STATE');

        return `lc.setLed(0, ${row}, ${col}, ${state});\n`;
    });

    registerBlock('display_matrix_clear', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MATRIX_CLEAR);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_MATRIX_CLEAR_TOOLTIP);
        }
    }, (block: any) => {
        return `lc.clearDisplay(0);\n`;
    });

    registerBlock('display_matrix_brightness', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MATRIX_BRIGHTNESS);
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField("(0-15)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_MATRIX_BRIGHT_TOOLTIP);
        }
    }, (block: any) => {
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '8';
        return `lc.setIntensity(0, ${val});\n`;
    });

    registerBlock('display_matrix_write_char', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MATRIX_CHAR);
            this.appendValueInput("CHAR")
                .setCheck("String")
                .appendField("Char");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DS18B20_INDEX)
                .appendField(new Blockly.FieldTextInput("0"), "IDX");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_MATRIX_CHAR_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const char = arduinoGenerator.valueToCode(block, 'CHAR', Order.ATOMIC) || "'A'";
        const idx = block.getFieldValue('IDX');
        return `lc.setChar(0, ${idx}, ${char}, false);\n`;
    });

    registerBlock('display_matrix_row', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MATRIX_ROW);
            this.appendValueInput("ROW")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MATRIX_ROW_NUM);
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MATRIX_VAL_BYTE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_MATRIX_ROW_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const row = arduinoGenerator.valueToCode(block, 'ROW', Order.ATOMIC) || '0';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        return `lc.setRow(0, ${row}, ${val});\n`;
    });

    registerBlock('display_matrix_col', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MATRIX_COL);
            this.appendValueInput("COL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MATRIX_COL_NUM);
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_MATRIX_VAL_BYTE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_MATRIX_COL_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const col = arduinoGenerator.valueToCode(block, 'COL', Order.ATOMIC) || '0';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        return `lc.setColumn(0, ${col}, ${val});\n`;
    });

};

export const DisplayMatrixModule: BlockModule = {
    id: 'hardware.display_matrix',
    name: 'Matrix Display',
    category: 'Matrix',
    init
};
