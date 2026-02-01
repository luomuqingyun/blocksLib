/**
 * ============================================================
 * 条形码扫描器模块 (Serial Barcode Scanner)
 * ============================================================
 * 
 * 提供串口条形码扫描器积木:
 * - barcode_init: 初始化 (RX/TX 引脚)
 * - barcode_available: 检查数据可用
 * - barcode_read: 读取条形码字符串
 * 
 * 使用 Serial2 通信。
 * 
 * @file src/modules/hardware/barcode.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('barcode_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BARCODE_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_RX)
                .appendField(new Blockly.FieldTextInput("16"), "RX");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MP3_TX)
                .appendField(new Blockly.FieldTextInput("17"), "TX");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(0);
            this.setTooltip(Blockly.Msg.ARD_BARCODE_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const rx = block.getFieldValue('RX');
        const tx = block.getFieldValue('TX');

        arduinoGenerator.addSetup('barcode_serial', `Serial2.begin(9600, SERIAL_8N1, ${rx}, ${tx});`);
        return '';
    });

    registerBlock('barcode_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BARCODE_AVAIL);
            this.setOutput(true, "Boolean");
            this.setColour(0);
        }
    }, (block: any) => {
        return ['Serial2.available() > 0', Order.ATOMIC];
    });

    registerBlock('barcode_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BARCODE_READ);
            this.setOutput(true, "String");
            this.setColour(0);
        }
    }, (block: any) => {
        return ['Serial2.readStringUntil(\'\\n\')', Order.ATOMIC];
    });

};

export const BarcodeModule: BlockModule = {
    id: 'hardware.barcode',
    name: 'Barcode Scanner',
    category: 'Inputs',
    init
};
