/**
 * ============================================================
 * STM32 USB 模块 (USB HID - Keyboard/Mouse)
 * ============================================================
 * 
 * 提供 STM32 USB HID 积木:
 * - stm32_usb_kb_init/print: 键盘初始化/打印
 * - stm32_usb_mouse_init/move: 鼠标初始化/移动
 * 
 * 使用 Keyboard.h 和 Mouse.h 库。
 * 
 * @file src/modules/stm32/usb.ts
 * @module EmbedBlocks/Frontend/Modules/STM32
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {
    // ------------------------------------------------------------------
    // USB 键盘初始化
    // ------------------------------------------------------------------
    registerBlock('stm32_usb_kb_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_USB_KB_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip("初始化 USB HID 键盘模式");
        }
    }, function () {
        // 包含键盘库并初始化
        arduinoGenerator.addInclude('Keyboard', '#include <Keyboard.h>');
        arduinoGenerator.addSetup('kb_begin', 'Keyboard.begin();');
        return '';
    });

    // ------------------------------------------------------------------
    // USB 键盘输入文本
    // ------------------------------------------------------------------
    registerBlock('stm32_usb_kb_print', {
        init: function () {
            this.appendValueInput("TEXT")
                .setCheck(["String", "Number"])
                .appendField(Blockly.Msg.ARD_USB_KB_PRINT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, function (block: any) {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.NONE) || '""';
        return `Keyboard.print(${text});\n`;
    });

    // ------------------------------------------------------------------
    // USB 鼠标初始化
    // ------------------------------------------------------------------
    registerBlock('stm32_usb_mouse_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_USB_MOUSE_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip("初始化 USB HID 鼠标模式");
        }
    }, function () {
        // 包含鼠标库并初始化
        arduinoGenerator.addInclude('Mouse', '#include <Mouse.h>');
        arduinoGenerator.addSetup('mouse_begin', 'Mouse.begin();');
        return '';
    });

    // ------------------------------------------------------------------
    // USB 鼠标移动
    // ------------------------------------------------------------------
    registerBlock('stm32_usb_mouse_move', {
        init: function () {
            this.appendValueInput("X")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_USB_MOUSE_MOVE + " X");
            this.appendValueInput("Y")
                .setCheck("Number")
                .appendField("Y");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, function (block: any) {
        const x = arduinoGenerator.valueToCode(block, 'X', Order.NONE) || '0';
        const y = arduinoGenerator.valueToCode(block, 'Y', Order.NONE) || '0';
        // 调用 Mouse.move 控制光标移动
        return `Mouse.move(${x}, ${y}, 0);\n`;
    });
};

export const STM32USBModule: BlockModule = {
    id: 'stm32.usb',
    name: 'STM32 USB',
    init
};
