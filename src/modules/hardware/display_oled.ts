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


/**
 * 模块初始化函数
 * 注册与 OLED 显示屏（主要基于 SSD1306 驱动）相关的积木块。
 * 核心逻辑：封装 Adafruit_SSD1306 和 Adafruit_GFX 库，实现文本和图形显示。
 */
const init = () => {

    // =========================================================================
    // OLED SSD1306 (I2C 接口)
    // =========================================================================

    /** 初始化屏幕 */
    registerBlock('oled_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_INIT); // 初始化 OLED
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_W)
                .appendField(new Blockly.FieldNumber(128), "W"); // 宽度 (px)
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_H)
                .appendField(new Blockly.FieldNumber(64), "H"); // 高度 (px)
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADDRESS)
                .appendField(new Blockly.FieldTextInput("0x3C"), "ADDR"); // I2C 地址，默认 0x3C
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60); // 显示类积木使用亮黄色/橙色调
            this.setTooltip(Blockly.Msg.ARD_OLED_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const w = block.getFieldValue('W');
        const h = block.getFieldValue('H');
        const addr = block.getFieldValue('ADDR');
        // 清理地址格式以用作变量名 (0x3C -> 3C)
        const cleanAddr = addr.replace('0x', '').replace('0X', '');
        const objName = `display_${cleanAddr}`;

        // 注入驱动库头文件
        arduinoGenerator.addInclude('wire_lib', '#include <Wire.h>');
        arduinoGenerator.addInclude('gfx_lib', '#include <Adafruit_GFX.h>');
        arduinoGenerator.addInclude('ssd1306_lib', '#include <Adafruit_SSD1306.h>');

        // 定义全局显示对象 (唯一化)
        arduinoGenerator.addVariable(`oled_obj_${cleanAddr}`, `Adafruit_SSD1306 ${objName}(${w}, ${h}, &Wire, -1);`);

        // 在 setup() 中尝试启动 I2C 通信
        arduinoGenerator.addSetup(`oled_init_${cleanAddr}`, `
  // 如果启动失败，则进入死循环（防止后续非法显存操作）
  if(!${objName}.begin(SSD1306_SWITCHCAPVCC, ${addr})) {
    for(;;); 
  }
  ${objName}.clearDisplay();
  ${objName}.setTextColor(SSD1306_WHITE); // 设置默认画笔颜色为白色
  ${objName}.display();`);

        return '';
    });

    /** 打印文本 */
    registerBlock('oled_print', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_PRINT); // 显示文本
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_DISPLAY_TEXT); // 内容
            this.appendValueInput("X")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_OLED_X); // 起始横坐标
            this.appendValueInput("Y")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_OLED_Y); // 起始纵坐标
            this.appendValueInput("SIZE")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_OLED_SIZE); // 字号
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADDRESS)
                .appendField(new Blockly.FieldTextInput("0x3C"), "ADDR");
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
        const addr = block.getFieldValue('ADDR');
        const cleanAddr = addr.replace('0x', '').replace('0X', '');
        const objName = `display_${cleanAddr}`;

        // 顺序设置属性并打印。
        return `
${objName}.setTextSize(${size});
${objName}.setCursor(${x}, ${y});
${objName}.print(${text});
${objName}.display();
`;
    });

    /** 清空屏幕 */
    registerBlock('oled_clear', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_CLEAR); // 清屏
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADDRESS)
                .appendField(new Blockly.FieldTextInput("0x3C"), "ADDR");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_OLED_CLEAR_TOOLTIP);
        }
    }, (block: any) => {
        const addr = block.getFieldValue('ADDR');
        const cleanAddr = addr.replace('0x', '').replace('0X', '');
        const objName = `display_${cleanAddr}`;
        return `${objName}.clearDisplay();\n${objName}.display();\n`;
    });

    /** 绘制直线 */
    registerBlock('oled_draw_line', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_DRAW_LINE); // 绘制直线
            this.appendValueInput("X1").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_START_X);
            this.appendValueInput("Y1").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_START_Y);
            this.appendValueInput("X2").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_END_X);
            this.appendValueInput("Y2").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_END_Y);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADDRESS)
                .appendField(new Blockly.FieldTextInput("0x3C"), "ADDR");
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
        const addr = block.getFieldValue('ADDR');
        const cleanAddr = addr.replace('0x', '').replace('0X', '');
        const objName = `display_${cleanAddr}`;
        return `${objName}.drawLine(${x1}, ${y1}, ${x2}, ${y2}, SSD1306_WHITE);\n`;
    });

    /** 绘制矩形 (支持填充) */
    registerBlock('oled_draw_rect', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_DRAW_RECT); // 绘制矩形
            this.appendValueInput("X").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_X);
            this.appendValueInput("Y").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_Y);
            this.appendValueInput("W").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_W);
            this.appendValueInput("H").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_H);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_FILL)
                .appendField(new Blockly.FieldCheckbox("FALSE"), "FILL");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADDRESS)
                .appendField(new Blockly.FieldTextInput("0x3C"), "ADDR");
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
        const addr = block.getFieldValue('ADDR');
        const cleanAddr = addr.replace('0x', '').replace('0X', '');
        const objName = `display_${cleanAddr}`;
        // 根据复选框状态选择描边 (drawRect) 或填充 (fillRect)
        if (fill) {
            return `${objName}.fillRect(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
        }
        return `${objName}.drawRect(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
    });

    /** 绘制圆 (支持填充) */
    registerBlock('oled_draw_circle', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_DRAW_CIRCLE); // 绘制圆形
            this.appendValueInput("X").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_CENTER_X);
            this.appendValueInput("Y").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_CENTER_Y);
            this.appendValueInput("R").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_RADIUS); // 半径
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_FILL)
                .appendField(new Blockly.FieldCheckbox("FALSE"), "FILL");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADDRESS)
                .appendField(new Blockly.FieldTextInput("0x3C"), "ADDR");
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
        const addr = block.getFieldValue('ADDR');
        const cleanAddr = addr.replace('0x', '').replace('0X', '');
        const objName = `display_${cleanAddr}`;
        if (fill) {
            return `${objName}.fillCircle(${x}, ${y}, ${r}, SSD1306_WHITE);\n`;
        }
        return `${objName}.drawCircle(${x}, ${y}, ${r}, SSD1306_WHITE);\n`;
    });

    /** 手动刷新屏幕 (Display) */
    registerBlock('oled_display', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OLED_UPDATE); // 立即更新 OLED 显示
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ADDRESS)
                .appendField(new Blockly.FieldTextInput("0x3C"), "ADDR");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_OLED_UPDATE_TOOLTIP);
        }
    }, (block: any) => {
        const addr = block.getFieldValue('ADDR');
        const cleanAddr = addr.replace('0x', '').replace('0X', '');
        const objName = `display_${cleanAddr}`;
        // 这是将缓冲区中所有绘制的图形一次性刷新到物理屏幕的最有效方式。
        return `${objName}.display();\n`;
    });
};

/**
 * OLED 显示模块定义
 * 基于 I2C 总线，适用于展示文字、交互菜单或简易传感器波形。
 */
export const OLEDModule: BlockModule = {
    id: 'hardware.display_oled',
    name: 'OLED Display',
    init
};
