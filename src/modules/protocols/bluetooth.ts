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

        arduinoGenerator.addInclude('bt_lib', '#include <BluetoothSerial.h>');
        arduinoGenerator.addVariable('bt_obj', `BluetoothSerial SerialBT;`);
        arduinoGenerator.addSetup('bt_begin', `SerialBT.begin(${name});`);

        return '';
    });

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
    category: 'Communication',
    init
};
