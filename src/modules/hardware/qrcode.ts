/**
 * ============================================================
 * 二维码模块 (QR Code Generation)
 * ============================================================
 * 
 * 提供二维码生成积木:
 * - qr_create: 创建二维码数据
 * - qr_draw_oled: 在 OLED 上绘制二维码
 * 
 * 使用 qrcode.h 库。
 * 
 * @file src/modules/hardware/qrcode.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 创建二维码数据
    registerBlock('qr_create', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_QR_CREATE);
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_DISPLAY_TEXT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_QR_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '"http://example.com"';

        // 包含 qrcode 库
        arduinoGenerator.addInclude('qrcode_lib', '#include <qrcode.h>');
        // 定义核心二维码对象
        arduinoGenerator.addVariable('qrcode_obj', `QRCode qrcode;`);
        // 定义缓冲区，大小由库函数根据版本自动计算（此处固定为版本 3）
        arduinoGenerator.addVariable('qrcode_buffer', `uint8_t qrcodeData[qrcode_getBufferSize(3)];`);

        // 初始化由指定文本生成的版本 3 二维码
        return `qrcode_initText(&qrcode, qrcodeData, 3, 0, ${text}.c_str());\n`;
    });

    // 在 OLED 屏幕上绘制二维码
    registerBlock('qr_draw_oled', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_QR_DRAW);
            this.appendValueInput("X")
                .setCheck("Number")
                .appendField("X");
            this.appendValueInput("Y")
                .setCheck("Number")
                .appendField("Y");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_QR_DRAW_TOOLTIP);
        }
    }, (block: any) => {
        const x_offset = arduinoGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
        const y_offset = arduinoGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';

        // 遍历二维码的二位数组，并在屏幕上绘制对应像素点
        // 这里为了提高可见性，通常会将一个二维码模块绘制为 2x2 或更大的像素块
        return `
    for (uint8_t y = 0; y < qrcode.size; y++) {
        for (uint8_t x = 0; x < qrcode.size; x++) {
            if (qrcode_getModule(&qrcode, x, y)) {
                // 绘制 2x2 的像素块以放大显示
                display.drawPixel(${x_offset} + x + 2, ${y_offset} + y + 2, WHITE);
                display.drawPixel(${x_offset} + x + 3, ${y_offset} + y + 2, WHITE);
                display.drawPixel(${x_offset} + x + 2, ${y_offset} + y + 3, WHITE);
                display.drawPixel(${x_offset} + x + 3, ${y_offset} + y + 3, WHITE);
            }
        }
    }
\n`;
    });

};

export const QRModule: BlockModule = {
    id: 'hardware.qrcode',
    name: 'QR Code',
    init
};
