/**
 * ============================================================
 * OLED 显示模块 (OLED Display Module - SSD1306)
 * ============================================================
 * 
 * 提供 OLED SSD1306 显示屏积木 (Adafruit_SSD1306 + Adafruit_GFX):
 * - oled_init: 初始化 (地址, 尺寸)
 * - oled_print: 文本输出 (X, Y, 字号)
 * - oled_clear: 清屏
 * - oled_draw_line/rect/circle: 图形绘制
 * - oled_display: 刷新显示
 * 
 * @file src/modules/hardware/display_oled.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // OLED SSD1306 (Adafruit_SSD1306 + Adafruit_GFX)
    // =========================================================================

    registerBlock('oled_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_WIDTH)
                .appendField(new Blockly.FieldNumber(128), "W");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_HEIGHT)
                .appendField(new Blockly.FieldNumber(64), "H");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADDRESS)
                .appendField(new Blockly.FieldTextInput("0x3C"), "ADDR");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_OLED_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const w = block.getFieldValue('W');
        const h = block.getFieldValue('H');
        const addr = block.getFieldValue('ADDR');

        arduinoGenerator.addInclude('wire_lib', '#include <Wire.h>');
        arduinoGenerator.addInclude('gfx_lib', '#include <Adafruit_GFX.h>');
        arduinoGenerator.addInclude('ssd1306_lib', '#include <Adafruit_SSD1306.h>');

        // Declaration: Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
        arduinoGenerator.addVariable('oled_obj', `Adafruit_SSD1306 display(${w}, ${h}, &Wire, -1);`);

        arduinoGenerator.addSetup('oled_init', `
  if(!display.begin(SSD1306_SWITCHCAPVCC, ${addr})) {
    for(;;); // Don't proceed, loop forever
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.display();`);

        return '';
    });

    registerBlock('oled_print', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_PRINT);
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_DISPLAY_TEXT);
            this.appendValueInput("X")
                .setCheck("Number")
                .appendField("X");
            this.appendValueInput("Y")
                .setCheck("Number")
                .appendField("Y");
            this.appendValueInput("SIZE")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_OLED_SIZE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_OLED_PRINT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
        const x = arduinoGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
        const y = arduinoGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
        const size = arduinoGenerator.valueToCode(block, 'SIZE', Order.ATOMIC) || '1';

        return `
display.setTextSize(${size});
display.setCursor(${x}, ${y});
display.print(${text});
display.display();
`;
    });

    registerBlock('oled_clear', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_CLEAR);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_OLED_CLEAR_TOOLTIP);
        }
    }, (block: any) => {
        return `display.clearDisplay();\ndisplay.display();\n`;
    });

    registerBlock('oled_draw_line', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_DRAW_LINE);
            this.appendValueInput("X1").setCheck("Number").appendField("X1");
            this.appendValueInput("Y1").setCheck("Number").appendField("Y1");
            this.appendValueInput("X2").setCheck("Number").appendField("X2");
            this.appendValueInput("Y2").setCheck("Number").appendField("Y2");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_OLED_LINE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const x1 = arduinoGenerator.valueToCode(block, 'X1', Order.ATOMIC) || '0';
        const y1 = arduinoGenerator.valueToCode(block, 'Y1', Order.ATOMIC) || '0';
        const x2 = arduinoGenerator.valueToCode(block, 'X2', Order.ATOMIC) || '10';
        const y2 = arduinoGenerator.valueToCode(block, 'Y2', Order.ATOMIC) || '10';
        return `display.drawLine(${x1}, ${y1}, ${x2}, ${y2}, SSD1306_WHITE);\n`;
    });

    registerBlock('oled_draw_rect', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_DRAW_RECT);
            this.appendValueInput("X").setCheck("Number").appendField("X");
            this.appendValueInput("Y").setCheck("Number").appendField("Y");
            this.appendValueInput("W").setCheck("Number").appendField("W");
            this.appendValueInput("H").setCheck("Number").appendField("H");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_FILL)
                .appendField(new Blockly.FieldCheckbox("FALSE"), "FILL");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_OLED_RECT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const x = arduinoGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
        const y = arduinoGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
        const w = arduinoGenerator.valueToCode(block, 'W', Order.ATOMIC) || '10';
        const h = arduinoGenerator.valueToCode(block, 'H', Order.ATOMIC) || '10';
        const fill = block.getFieldValue('FILL') === 'TRUE';
        if (fill) {
            return `display.fillRect(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
        }
        return `display.drawRect(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
    });

    registerBlock('oled_draw_circle', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_DRAW_CIRCLE);
            this.appendValueInput("X").setCheck("Number").appendField("X");
            this.appendValueInput("Y").setCheck("Number").appendField("Y");
            this.appendValueInput("R").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_RADIUS);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_FILL)
                .appendField(new Blockly.FieldCheckbox("FALSE"), "FILL");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_OLED_CIRCLE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const x = arduinoGenerator.valueToCode(block, 'X', Order.ATOMIC) || '10';
        const y = arduinoGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '10';
        const r = arduinoGenerator.valueToCode(block, 'R', Order.ATOMIC) || '5';
        const fill = block.getFieldValue('FILL') === 'TRUE';
        if (fill) {
            return `display.fillCircle(${x}, ${y}, ${r}, SSD1306_WHITE);\n`;
        }
        return `display.drawCircle(${x}, ${y}, ${r}, SSD1306_WHITE);\n`;
    });

    registerBlock('oled_display', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_UPDATE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_OLED_UPDATE_TOOLTIP);
        }
    }, (block: any) => {
        return `display.display();\n`;
    });
};

export const OLEDModule: BlockModule = {
    id: 'hardware.display_oled',
    name: 'OLED Display',
    category: 'OLED',
    init
};
