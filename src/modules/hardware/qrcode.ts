// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

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

        arduinoGenerator.addInclude('qrcode_lib', '#include <qrcode.h>');
        arduinoGenerator.addVariable('qrcode_obj', `QRCode qrcode;`);
        arduinoGenerator.addVariable('qrcode_buffer', `uint8_t qrcodeData[qrcode_getBufferSize(3)];`); // Assuming version 3 as per original code, snippet had ${version}

        // Version 3 is standard size (29x29)
        return `qrcode_initText(&qrcode, qrcodeData, 3, 0, ${text}.c_str());\n`;
    });

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
        const x = arduinoGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
        const y = arduinoGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';

        return `
    for (uint8_t y = 0; y < qrcode.size; y++) {
        for (uint8_t x = 0; x < qrcode.size; x++) {
            if (qrcode_getModule(&qrcode, x, y)) {
                display.drawPixel(${x} + x + 2, ${y} + y + 2, WHITE); // +2 for scaling/padding?
                // Double size for readability?
                display.drawPixel(${x} + x + 3, ${y} + y + 2, WHITE);
                display.drawPixel(${x} + x + 2, ${y} + y + 3, WHITE);
                display.drawPixel(${x} + x + 3, ${y} + y + 3, WHITE);
            }
        }
    }
\n`;
    });

};

export const QRModule: BlockModule = {
    id: 'hardware.qrcode',
    name: 'QR Code',
    category: 'Displays',
    init
};
