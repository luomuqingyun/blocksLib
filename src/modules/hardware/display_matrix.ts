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

    // 初始化 LED 点阵 (DIN/CLK/CS 引脚)
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

        // 包含 LedControl 库
        arduinoGenerator.addInclude('matrix_lib', '#include <LedControl.h>');
        // 定义全局 lc 对象，参数分别为 DIN, CLK, CS, 设备数量(此处固定为1)
        arduinoGenerator.addVariable('matrix_obj', `LedControl lc = LedControl(${din}, ${clk}, ${cs}, 1);`);

        // 在 setup 中唤醒屏幕、设置亮度并清屏
        arduinoGenerator.addSetup('matrix_init', `
  lc.shutdown(0, false); // 退出省电模式
  lc.setIntensity(0, 8); // 设置中等亮度
  lc.clearDisplay(0);    // 清空显示缓冲区`);

        return '';
    });

    // 设置点阵屏上特定位置 LED 的开关状态
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

        // 调用 LedControl 的 setLed 函数，第一个参数 0 代表第一个显示模块
        return `lc.setLed(0, ${row}, ${col}, ${state});\n`;
    });

    // 清空点阵屏显示（关闭所有 LED）
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

    // 设置点阵屏亮度
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
        // setIntensity 用于控制 MAX7219 的显示亮度，范围 0-15
        return `lc.setIntensity(0, ${val});\n`;
    });

    // 在点阵屏上显示单个字符
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
        // setChar 可以在指定位置显示预设的字符，第四个参数为是否显示小数点
        return `lc.setChar(0, ${idx}, ${char}, false);\n`;
    });

    // 通过字节数据设置点阵屏的一整行
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
        // setRow 使用一个字节（8位）的数据直接控制一行 8 个 LED 的开关
        return `lc.setRow(0, ${row}, ${val});\n`;
    });

    // 通过字节数据设置点阵屏的一整列
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
        // setColumn 使用一个字节（8位）的数据直接控制一列 8 个 LED 的开关
        return `lc.setColumn(0, ${col}, ${val});\n`;
    });

};

export const DisplayMatrixModule: BlockModule = {
    id: 'hardware.display_matrix',
    name: 'Matrix Display',
    init
};
