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
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化 NeoPixel 灯带 (WS2812)
    registerBlock('neopixel_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEOPIXEL_INIT); // 初始化 NeoPixel
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("5"), "PIN"); // 数据引脚
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEOPIXEL_PIXELS)
                .appendField(new Blockly.FieldNumber(12), "COUNT"); // 灯珠总数
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_NEOPIXEL_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const count = block.getFieldValue('COUNT');

        reservePin(block, pin, 'OUTPUT');

        // 包含 Adafruit NeoPixel 库
        arduinoGenerator.addInclude('neopixel_lib', '#include <Adafruit_NeoPixel.h>');
        // 定义全局灯带对象
        arduinoGenerator.addVariable('neopixel_obj', `Adafruit_NeoPixel pixels(${count}, ${pin}, NEO_GRB + NEO_KHZ800);`);
        // 在 setup 中开启灯带并初始清空
        arduinoGenerator.addSetup('neopixel_begin', `pixels.begin();\n  pixels.clear();\n  pixels.show();`);

        return '';
    });

    // 设置单个像素颜色
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

        // 设置指定索引处的 LED 颜色（需调用 show() 才能看到效果）
        return `pixels.setPixelColor(${index}, pixels.Color(${r}, ${g}, ${b}));\n`;
    });

    // 刷新灯带显示
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
        // 将显存中的数据推送至物理灯带
        return `pixels.show();\n`;
    });

    // 清除所有像素 (设为黑色)
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

    // 设置全局亮度
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
        // 设置 0-255 之间的亮度
        return `pixels.setBrightness(${brt});\n`;
    });
};

export const NeoPixelModule: BlockModule = {
    id: 'hardware.neopixel',
    name: 'NeoPixel LED',
    init
};
