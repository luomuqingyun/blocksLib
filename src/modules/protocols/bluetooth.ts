/**
 * ============================================================
 * 蓝牙串口模块 (Bluetooth Serial Module)
 * ============================================================
 * 
 * 提供 ESP32 蓝牙经典串口 (SPP) 积木:
 * - bt_serial_init: 初始化并设置设备名称
 * - bt_serial_available: 检查是否有数据
 * - bt_serial_read: 读取字符串
 * - bt_serial_print: 发送数据
 * 
 * 使用 BluetoothSerial 库 (ESP32 专用)。
 * 
 * @file src/modules/protocols/bluetooth.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化蓝牙串口并设置设备名称
    registerBlock('bt_serial_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BT_SERIAL_INIT);
            this.appendValueInput("NAME")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_BT_NAME);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_BT_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const name = arduinoGenerator.valueToCode(block, 'NAME', Order.ATOMIC) || '"ESP32_BT"';

        // 包含 BluetoothSerial 库
        arduinoGenerator.addInclude('bt_lib', '#include <BluetoothSerial.h>');
        // 定义蓝牙串口对象
        arduinoGenerator.addVariable('bt_obj', `BluetoothSerial SerialBT;`);
        // 在 setup 中根据给定名称开启服务
        arduinoGenerator.addSetup('bt_begin', `SerialBT.begin(${name});`);

        return '';
    });

    // 检查蓝牙串口是否有可用数据
    registerBlock('bt_serial_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BT_AVAILABLE);
            this.setOutput(true, "Boolean");
            this.setColour(160);
        }
    }, (block: any) => {
        return ['SerialBT.available()', Order.ATOMIC];
    });

    // 从蓝牙串口读取字符串
    registerBlock('bt_serial_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BT_READ_STR);
            this.setOutput(true, "String");
            this.setColour(160);
        }
    }, (block: any) => {
        return ['SerialBT.readString()', Order.ATOMIC];
    });

    // 通过蓝牙串口发送数据（带换行符）
    registerBlock('bt_serial_print', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BT_PRINT);
            this.appendValueInput("TEXT")
                .appendField(Blockly.Msg.ARD_TEXT_TEXT || "Text");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
        return `SerialBT.println(${text});\n`;
    });

};

export const BluetoothModule: BlockModule = {
    id: 'protocols.bluetooth',
    name: 'Bluetooth Serial',
    init
};
