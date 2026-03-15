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

    /**
     * 初始化条形码扫描器 (串口通信)
     * @param {String} SERIAL 串口端口 (Serial, Serial1, Serial2, SoftwareSerial)
     * @param {Number} RX RX引脚
     * @param {Number} TX TX引脚
     */
    registerBlock('barcode_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BARCODE_INIT);
            this.appendDummyInput()
                .appendField("Serial Port")
                .appendField(new Blockly.FieldDropdown([
                    ["Serial", "Serial"],
                    ["Serial1", "Serial1"],
                    ["Serial2", "Serial2"],
                    ["SoftwareSerial", "SW_SERIAL"]
                ]), "SERIAL");
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
        const serialPort = block.getFieldValue('SERIAL');
        const rx = block.getFieldValue('RX');
        const tx = block.getFieldValue('TX');

        if (serialPort === 'SW_SERIAL') {
            arduinoGenerator.addInclude('soft_serial', '#include <SoftwareSerial.h>');
            arduinoGenerator.addVariable('barcode_ss', `SoftwareSerial barcodeSerial(${rx}, ${tx});`);
            arduinoGenerator.addSetup('barcode_serial', `barcodeSerial.begin(9600);`);
        } else {
            arduinoGenerator.addSetup('barcode_serial', `
#if defined(ESP32) || defined(ARDUINO_ARCH_STM32)
  ${serialPort}.begin(9600, SERIAL_8N1, ${rx}, ${tx});
#else
  ${serialPort}.begin(9600);
#endif
`);
        }
        return '';
    });

    /**
     * 检查条形码扫描器是否有数据可用
     * @return {Boolean} 是否有数据
     */
    registerBlock('barcode_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BARCODE_AVAIL);
            this.setOutput(true, "Boolean");
            this.setColour(0);
        }
    }, (block: any) => {
        const root = block.getRootBlock();
        const initBlock = root ? root.getDescendants(false).find((b: any) => b.type === 'barcode_init') : null;
        const serialPort = initBlock ? initBlock.getFieldValue('SERIAL') : 'Serial2';
        const portName = serialPort === 'SW_SERIAL' ? 'barcodeSerial' : serialPort;
        return [`${portName}.available() > 0`, Order.ATOMIC];
    });

    /**
     * 读取条形码扫描器中的字符串数据
     * @return {String} 扫描到的条形码内容
     */
    registerBlock('barcode_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_BARCODE_READ);
            this.setOutput(true, "String");
            this.setColour(0);
        }
    }, (block: any) => {
        const root = block.getRootBlock();
        const initBlock = root ? root.getDescendants(false).find((b: any) => b.type === 'barcode_init') : null;
        const serialPort = initBlock ? initBlock.getFieldValue('SERIAL') : 'Serial2';
        const portName = serialPort === 'SW_SERIAL' ? 'barcodeSerial' : serialPort;
        return [`${portName}.readStringUntil('\\n')`, Order.ATOMIC];
    });

};

export const BarcodeModule: BlockModule = {
    id: 'hardware.barcode',
    name: 'Barcode Scanner',
    init
};
