// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('usb_keyboard_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_USB_KB_BEGIN);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_USB_KB_BEGIN_TOOLTIP);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('usb_lib', '#include "USB.h"');
        arduinoGenerator.addInclude('usb_kb_lib', '#include <Keyboard.h>');
        arduinoGenerator.addVariable('usb_kb_init', `bool usb_kb_initialized = false;`);

        arduinoGenerator.addSetup('usb_kb_begin', `Keyboard.begin();\n  USB.begin();`);
        return '';
    });

    registerBlock('usb_keyboard_print', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_USB_KB_TYPE);
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_USB_KB_TEXT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
        return `Keyboard.print(${text});\n`;
    });

    registerBlock('usb_keyboard_press', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_USB_KB_PRESS)
                .appendField(new Blockly.FieldDropdown([
                    [Blockly.Msg.ARD_KEY_ENTER, "KEY_RETURN"],
                    [Blockly.Msg.ARD_KEY_TAB, "KEY_TAB"],
                    [Blockly.Msg.ARD_KEY_ESC, "KEY_ESC"],
                    [Blockly.Msg.ARD_KEY_BACKSPACE, "KEY_BACKSPACE"],
                    [Blockly.Msg.ARD_KEY_SPACE, "' '"]
                ]), "KEY");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, (block: any) => {
        const key = block.getFieldValue('KEY');
        return `Keyboard.write(${key});\n`;
    });

    registerBlock('usb_mouse_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_USB_MOUSE_BEGIN);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_USB_MOUSE_BEGIN_TOOLTIP);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('usb_lib', '#include "USB.h"');
        arduinoGenerator.addInclude('usb_mouse_lib', '#include <Mouse.h>');
        arduinoGenerator.addVariable('usb_mouse_init', `bool usb_mouse_initialized = false;`);

        arduinoGenerator.addSetup('usb_mouse_begin', `Mouse.begin();\n  USB.begin();`);
        return '';
    });

    registerBlock('usb_mouse_move', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_USB_MOUSE_MOVE);
            this.appendValueInput("X")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_AXIS_X || "X");
            this.appendValueInput("Y")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_AXIS_Y || "Y");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const x = arduinoGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
        const y = arduinoGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
        return `Mouse.move(${x}, ${y});\n`;
    });

    registerBlock('usb_mouse_click', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_USB_MOUSE_CLICK)
                .appendField(new Blockly.FieldDropdown([[Blockly.Msg.ARD_MOUSE_LEFT, "MOUSE_LEFT"], [Blockly.Msg.ARD_MOUSE_RIGHT, "MOUSE_RIGHT"]]), "BTN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, (block: any) => {
        const btn = block.getFieldValue('BTN');
        return `Mouse.click(${btn});\n`;
    });

};

export const USBHidModule: BlockModule = {
    id: 'protocols.usb_hid',
    name: 'USB HID',
    category: 'Communication',
    init
};
