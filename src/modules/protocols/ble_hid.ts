/**
 * ============================================================
 * 蓝牙 HID 模块 (Bluetooth HID Module)
 * ============================================================
 * 
 * 提供 ESP32 蓝牙 HID 设备积木:
 * - BLE 键盘: 初始化、打字、按键
 * - BLE 鼠标: 初始化、移动、点击
 * 
 * 使用 BleKeyboard.h / BleMouse.h 库。
 * 设备可模拟为蓝牙键盘或鼠标连接到 PC/手机。
 * 
 * @file src/modules/protocols/ble_hid.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // ===================================
    // BLE Keyboard
    // ===================================
    registerBlock('ble_keyboard_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BLE_KB_BEGIN);
            this.appendValueInput("NAME")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_BLE_NAME);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLE_KB_BEGIN_TOOLTIP);
        }
    }, (block: any) => {
        const name = arduinoGenerator.valueToCode(block, 'NAME', Order.ATOMIC) || '"ESP32 Keyboard"';
        arduinoGenerator.addInclude('ble_kb_lib', '#include <BleKeyboard.h>');
        arduinoGenerator.addVariable('ble_kb_obj', `BleKeyboard bleKeyboard(${name});`);
        arduinoGenerator.addSetup('ble_kb_begin', `bleKeyboard.begin();`);
        return '';
    });

    registerBlock('ble_keyboard_print', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BLE_KB_TYPE);
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_BLE_KB_TEXT || "Text");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLE_KB_TYPE_TOOLTIP);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
        // Check connection to avoid crash/lag
        return `if(bleKeyboard.isConnected()) { bleKeyboard.print(${text}); }\n`;
    });

    registerBlock('ble_keyboard_press', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BLE_KB_PRESS)
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
            this.setTooltip(Blockly.Msg.ARD_BLE_KB_PRESS_TOOLTIP);
        }
    }, (block: any) => {
        const key = block.getFieldValue('KEY');
        return `
    if(bleKeyboard.isConnected()) {
        bleKeyboard.write(${key});
    }\n`;
    });


    // ===================================
    // BLE Mouse
    // ===================================
    registerBlock('ble_mouse_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BLE_MOUSE_BEGIN);
            this.appendValueInput("NAME")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_BLE_NAME);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLE_MOUSE_BEGIN_TOOLTIP);
        }
    }, (block: any) => {
        const name = arduinoGenerator.valueToCode(block, 'NAME', Order.ATOMIC) || '"ESP32 Mouse"';
        arduinoGenerator.addInclude('ble_mouse_lib', '#include <BleMouse.h>');
        arduinoGenerator.addVariable('ble_mouse_obj', `BleMouse bleMouse(${name});`);
        arduinoGenerator.addSetup('ble_mouse_begin', `bleMouse.begin();`);
        return '';
    });

    registerBlock('ble_mouse_move', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BLE_MOUSE_MOVE);
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
        return `if(bleMouse.isConnected()) { bleMouse.move(${x}, ${y}); }\n`;
    });

    registerBlock('ble_mouse_click', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BLE_MOUSE_CLICK)
                .appendField(new Blockly.FieldDropdown([
                    [Blockly.Msg.ARD_MOUSE_LEFT, "MOUSE_LEFT"],
                    [Blockly.Msg.ARD_MOUSE_RIGHT, "MOUSE_RIGHT"],
                    [Blockly.Msg.ARD_MOUSE_MIDDLE, "MOUSE_MIDDLE"]
                ]), "BTN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, (block: any) => {
        const btn = block.getFieldValue('BTN');
        return `if(bleMouse.isConnected()) { bleMouse.click(${btn}); }\n`;
    });

};

export const BleHidModule: BlockModule = {
    id: 'protocols.ble_hid',
    name: 'Bluetooth HID',
    category: 'Communication', // Or 'Human Input'
    init
};
