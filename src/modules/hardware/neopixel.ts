/**
 * ============================================================
 * NeoPixel LED 模块 (WS2812 RGB LED Strip)
 * ============================================================
 * 
 * 提供 NeoPixel/WS2812 可寻址 LED 灯带积木:
 * - neopixel_init: 初始化 (引脚, 数量)
 * - neopixel_set_color: 设置单个像素颜色
 * - neopixel_show: 刷新显示
 * - neopixel_clear: 清除所有像素
 * - neopixel_brightness: 设置亮度
 * 
 * 使用 Adafruit_NeoPixel.h 库。
 * 
 * @file src/modules/hardware/neopixel.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('neopixel_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEOPIXEL_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("5"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEOPIXEL_PIXELS)
                .appendField(new Blockly.FieldNumber(12), "COUNT");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_NEOPIXEL_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const count = block.getFieldValue('COUNT');

        reservePin(block, pin, 'OUTPUT');

        arduinoGenerator.addInclude('neopixel_lib', '#include <Adafruit_NeoPixel.h>');

        // Single global strip for simplicity in blocks, or named?
        // Let's use a standard name 'pixels'
        arduinoGenerator.addVariable('neopixel_obj', `Adafruit_NeoPixel pixels(${count}, ${pin}, NEO_GRB + NEO_KHZ800);`);

        arduinoGenerator.addSetup('neopixel_begin', `pixels.begin();\n  pixels.clear();\n  pixels.show();`);

        return '';
    });

    registerBlock('neopixel_set_color', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEOPIXEL_SET_COLOR);
            this.appendValueInput("INDEX")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_DISPLAY_PIXEL);
            this.appendValueInput("R")
                .setCheck("Number")
                .appendField("R");
            this.appendValueInput("G")
                .setCheck("Number")
                .appendField("G");
            this.appendValueInput("B")
                .setCheck("Number")
                .appendField("B");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_NEOPIXEL_SET_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const index = arduinoGenerator.valueToCode(block, 'INDEX', Order.ATOMIC) || '0';
        const r = arduinoGenerator.valueToCode(block, 'R', Order.ATOMIC) || '0';
        const g = arduinoGenerator.valueToCode(block, 'G', Order.ATOMIC) || '0';
        const b = arduinoGenerator.valueToCode(block, 'B', Order.ATOMIC) || '0';

        return `pixels.setPixelColor(${index}, pixels.Color(${r}, ${g}, ${b}));\n`;
    });

    registerBlock('neopixel_show', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEOPIXEL_SHOW);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_NEOPIXEL_SHOW_TOOLTIP);
        }
    }, (block: any) => {
        return `pixels.show();\n`;
    });

    registerBlock('neopixel_clear', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEOPIXEL_CLEAR);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_NEOPIXEL_CLEAR_TOOLTIP);
        }
    }, (block: any) => {
        return `pixels.clear();\npixels.show();\n`;
    });

    registerBlock('neopixel_brightness', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEOPIXEL_BRIGHTNESS);
            this.appendValueInput("BRT")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_NEOPIXEL_LEVEL);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const brt = arduinoGenerator.valueToCode(block, 'BRT', Order.ATOMIC) || '50';
        return `pixels.setBrightness(${brt});\n`;
    });
};

export const NeoPixelModule: BlockModule = {
    id: 'hardware.neopixel',
    name: 'NeoPixel LED',
    category: 'Displays',
    init
};
