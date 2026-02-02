/**
 * ============================================================
 * 显示与灯光模块 (Displays & Lights Module)
 * ============================================================
 * 
 * 提供常用显示设备积木:
 * - LCD I2C (LiquidCrystal_I2C): 初始化、打印、清屏、背光
 * - NeoPixel (Adafruit_NeoPixel): 初始化、设置颜色、填充、彩虹效果
 * 
 * @file src/modules/hardware/displays.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // LCD I2C (LiquidCrystal_I2C)
    // =========================================================================

    // 初始化 LCD I2C 屏幕
    registerBlock('display_lcd_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_LCD_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_ADDR)
                .appendField(new Blockly.FieldTextInput("0x27"), "ADDR");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_COLS)
                .appendField(new Blockly.FieldNumber(16), "COLS");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_ROWS)
                .appendField(new Blockly.FieldNumber(2), "ROWS");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_LCD_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const addr = block.getFieldValue('ADDR');
        const cols = block.getFieldValue('COLS');
        const rows = block.getFieldValue('ROWS');
        const cleanAddr = addr.replace('0x', '').replace('0X', '');
        const objName = `lcd_${cleanAddr}`;

        // 包含 LCD I2C 驱动库
        arduinoGenerator.addInclude('lcd_lib', '#include <LiquidCrystal_I2C.h>');
        // 定义全局 lcd 对象
        arduinoGenerator.addVariable(`lcd_def_${cleanAddr}`, `LiquidCrystal_I2C ${objName}(${addr}, ${cols}, ${rows});`);
        // 在 setup 中初始化 LCD 并开启背光
        arduinoGenerator.addSetup(`lcd_init_${cleanAddr}`, `${objName}.init();\n  ${objName}.backlight();`);

        return '';
    });

    // Print Block
    registerBlock('display_lcd_print', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_LCD_PRINT);
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_DISPLAY_TEXT);
            this.appendValueInput("COL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_DISPLAY_COL);
            this.appendValueInput("ROW")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_DISPLAY_ROW);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_ADDR)
                .appendField(new Blockly.FieldTextInput("0x27"), "ADDR");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_LCD_PRINT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
        const col = arduinoGenerator.valueToCode(block, 'COL', Order.ATOMIC) || '0';
        const row = arduinoGenerator.valueToCode(block, 'ROW', Order.ATOMIC) || '0';
        const addr = block.getFieldValue('ADDR');
        const cleanAddr = addr.replace('0x', '').replace('0X', '');
        const objName = `lcd_${cleanAddr}`;

        return `${objName}.setCursor(${col}, ${row});\n${objName}.print(${text});\n`;
    });

    // Clear Block
    registerBlock('display_lcd_clear', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_LCD_CLEAR);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_ADDR)
                .appendField(new Blockly.FieldTextInput("0x27"), "ADDR");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_LCD_CLEAR_TOOLTIP);
        }
    }, (block: any) => {
        const addr = block.getFieldValue('ADDR');
        const cleanAddr = addr.replace('0x', '').replace('0X', '');
        const objName = `lcd_${cleanAddr}`;
        return `${objName}.clear();\n`;
    });


    // =========================================================================
    // NeoPixel (Adafruit_NeoPixel)
    // =========================================================================

    // 初始化 NeoPixel 发光二极管 (WS2812B)
    registerBlock('display_neopixel_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NEOPIXEL_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("6"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_COUNT)
                .appendField(new Blockly.FieldNumber(12), "COUNT");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_NEOPIXEL_INIT2_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const count = block.getFieldValue('COUNT');

        reservePin(block, pin, 'OUTPUT');

        // 包含 NeoPixel 驱动库
        arduinoGenerator.addInclude('neopixel_lib', '#include <Adafruit_NeoPixel.h>');
        // 为特定引脚定义独立的 strip 对象，支持多个灯带
        arduinoGenerator.addVariable(`neopixel_def_${pin}`, `Adafruit_NeoPixel strip_${pin}(${count}, ${pin}, NEO_GRB + NEO_KHZ800);`);
        // 在 setup 中开始运行并初始化为全灭状态
        arduinoGenerator.addSetup(`neopixel_init_${pin}`, `strip_${pin}.begin();\n  strip_${pin}.show();`);

        return '';
    });

    // Set Color Block
    registerBlock('display_neopixel_set', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NEOPIXEL_SET);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("6"), "PIN");
            this.appendValueInput("LED")
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
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_NEOPIXEL_SET2_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const led = arduinoGenerator.valueToCode(block, 'LED', Order.ATOMIC) || '0';
        const r = arduinoGenerator.valueToCode(block, 'R', Order.ATOMIC) || '0';
        const g = arduinoGenerator.valueToCode(block, 'G', Order.ATOMIC) || '0';
        const b = arduinoGenerator.valueToCode(block, 'B', Order.ATOMIC) || '0';

        // 设置指定像素的颜色并刷新显示
        return `strip_${pin}.setPixelColor(${led}, strip_${pin}.Color(${r}, ${g}, ${b}));\nstrip_${pin}.show();\n`;
    });

    // 将整个 NeoPixel 灯条填充为统一颜色
    registerBlock('display_neopixel_fill', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NEOPIXEL_FILL);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("6"), "PIN");
            this.appendValueInput("R").setCheck("Number").appendField("R");
            this.appendValueInput("G").setCheck("Number").appendField("G");
            this.appendValueInput("B").setCheck("Number").appendField("B");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_NEOPIXEL_FILL_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const r = arduinoGenerator.valueToCode(block, 'R', Order.ATOMIC) || '0';
        const g = arduinoGenerator.valueToCode(block, 'G', Order.ATOMIC) || '0';
        const b = arduinoGenerator.valueToCode(block, 'B', Order.ATOMIC) || '0';

        // 生成辅助函数，遍历所有像素设置颜色
        const funcName = `neopixel_fill_${pin}`;
        arduinoGenerator.addFunction(funcName, `
void ${funcName}(int r, int g, int b) {
  for(int i=0; i<strip_${pin}.numPixels(); i++) {
    strip_${pin}.setPixelColor(i, strip_${pin}.Color(r, g, b));
  }
  strip_${pin}.show();
}`);
        return `${funcName}(${r}, ${g}, ${b});\n`;
    });

    // 清除 NeoPixel 灯条（关闭所有灯）
    registerBlock('display_neopixel_clear', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NEOPIXEL_CLEAR);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("6"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_NEOPIXEL_CLEAR_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        // 调用 clear() 方法并 show() 以更新物理状态
        return `strip_${pin}.clear();\nstrip_${pin}.show();\n`;
    });

    // 播放彩虹动画效果
    registerBlock('display_neopixel_rainbow', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NEOPIXEL_RAINBOW);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("6"), "PIN");
            this.appendValueInput("WAIT").setCheck("Number").appendField(Blockly.Msg.ARD_DISPLAY_WAIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_NEOPIXEL_RAINBOW_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const wait = arduinoGenerator.valueToCode(block, 'WAIT', Order.ATOMIC) || '20';

        // 使用 HSV 颜色空间生成平滑渐变的彩虹循环
        const funcName = `neopixel_rainbow_${pin}`;
        arduinoGenerator.addFunction(funcName, `
void ${funcName}(int wait) {
  for(long firstPixelHue = 0; firstPixelHue < 5*65536; firstPixelHue += 256) {
    for(int i=0; i<strip_${pin}.numPixels(); i++) {
      int pixelHue = firstPixelHue + (i * 65536L / strip_${pin}.numPixels());
      strip_${pin}.setPixelColor(i, strip_${pin}.gamma32(strip_${pin}.ColorHSV(pixelHue)));
    }
    strip_${pin}.show();
    delay(wait);
  }
}`);
        return `${funcName}(${wait});\n`;
    });

    // 控制 LCD I2C 屏幕的背光开关
    registerBlock('display_lcd_backlight', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_LCD_BACKLIGHT);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([["ON", "backlight"], ["OFF", "noBacklight"]]), "STATE");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_ADDR)
                .appendField(new Blockly.FieldTextInput("0x27"), "ADDR");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_LCD_BACKLIGHT_TOOLTIP);
        }
    }, (block: any) => {
        const state = block.getFieldValue('STATE');
        const addr = block.getFieldValue('ADDR');
        const cleanAddr = addr.replace('0x', '').replace('0X', '');
        const objName = `lcd_${cleanAddr}`;
        return `${objName}.${state}();\n`;
    });
};

export const DisplaysModule: BlockModule = {
    id: 'hardware.displays',
    name: 'Displays & Lights',
    init
};
