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
    // BLE 蓝牙键盘
    // ===================================
    // 初始化 BLE 键盘，设置设备名称
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
        // 包含 BleKeyboard 库
        arduinoGenerator.addInclude('ble_kb_lib', '#include <BleKeyboard.h>');
        // 定义蓝牙键盘对象并传入设备名称
        arduinoGenerator.addVariable('ble_kb_obj', `BleKeyboard bleKeyboard(${name});`);
        // 在 setup 中开启蓝牙键盘服务
        arduinoGenerator.addSetup('ble_kb_begin', `bleKeyboard.begin();`);
        return '';
    });

    // 通过蓝牙键盘发送字符串
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
        // 只有在已连接到主机时才发送数据，防止阻塞
        return `if(bleKeyboard.isConnected()) { bleKeyboard.print(${text}); }\n`;
    });

    // 通过蓝牙键盘模拟按键按下
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
        // 在已连接状态下模拟按键
        return `
    if(bleKeyboard.isConnected()) {
        bleKeyboard.write(${key});
    }\n`;
    });


    // ===================================
    // BLE 蓝牙鼠标
    // ===================================
    // 初始化 BLE 鼠标，设置设备名称
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
        // 包含 BleMouse 库
        arduinoGenerator.addInclude('ble_mouse_lib', '#include <BleMouse.h>');
        // 定义蓝牙鼠标对象并传入设备名称
        arduinoGenerator.addVariable('ble_mouse_obj', `BleMouse bleMouse(${name});`);
        // 在 setup 中开启蓝牙鼠标服务
        arduinoGenerator.addSetup('ble_mouse_begin', `bleMouse.begin();`);
        return '';
    });

    // 通过蓝牙模拟鼠标移动
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
        // 在已连接状态下模拟光标相对位移
        return `if(bleMouse.isConnected()) { bleMouse.move(${x}, ${y}); }\n`;
    });

    // 通过蓝牙模拟鼠标点击
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
        // 在已连接状态下模拟按键点击
        return `if(bleMouse.isConnected()) { bleMouse.click(${btn}); }\n`;
    });

};

export const BleHidModule: BlockModule = {
    id: 'protocols.ble_hid',
    name: 'Bluetooth HID',
    init
};
