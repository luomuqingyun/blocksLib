/**
 * ============================================================
 * Nextion 触摸屏模块 (HMI Display)
 * ============================================================
 * 
 * 提供 Nextion 串口 HMI 显示屏积木:
 * - nextion_init: 初始化 (RX/TX/波特率)
 * - nextion_set_text: 设置文本控件
 * - nextion_set_val: 设置数值控件
 * - nextion_page: 切换页面
 * 
 * 使用 Serial2 通信。
 * 
 * @file src/modules/hardware/nextion.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    /**
     * 初始化 Nextion 显示屏
     * @param {String} SERIAL 串口端口 (Serial, Serial1, Serial2, SoftwareSerial)
     * @param {Number} RX RX引脚
     * @param {Number} TX TX引脚
     * @param {Number} BAUD 波特率
     */
    registerBlock('nextion_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEXTION_INIT);
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
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEXTION_BAUD)
                .appendField(new Blockly.FieldDropdown([["9600", "9600"], ["115200", "115200"]]), "BAUD");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_NEXTION_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const serialPort = block.getFieldValue('SERIAL');
        const rx = block.getFieldValue('RX');
        const tx = block.getFieldValue('TX');
        const baud = block.getFieldValue('BAUD');

        reservePin(block, rx, 'INPUT');
        reservePin(block, tx, 'OUTPUT');

        if (serialPort === 'SW_SERIAL') {
            arduinoGenerator.addInclude('soft_serial', '#include <SoftwareSerial.h>');
            arduinoGenerator.addVariable('nextion_ss', `SoftwareSerial nextionSerial(${rx}, ${tx});`);
            arduinoGenerator.addSetup('nextion_setup', `nextionSerial.begin(${baud});`);
        } else {
            arduinoGenerator.addSetup('nextion_setup', `
#if defined(ESP32) || defined(ARDUINO_ARCH_STM32)
  ${serialPort}.begin(${baud}, SERIAL_8N1, ${rx}, ${tx});
#else
  ${serialPort}.begin(${baud});
#endif
`);
        }
        return '';
    });

    /**
     * 设置 Nextion 屏幕上特定组件的文本内容
     * @param {String} OBJ 组件名称 (如 "t0")
     * @param {String} TEXT 要显示的文本内容
     */
    registerBlock('nextion_set_text', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEXTION_SET_TEXT);
            this.appendValueInput("OBJ")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NEXTION_OBJ); // 组件名称，如 "t0"
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_DISPLAY_TEXT); // 要显示的文本内容
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
        }
    }, (block: any) => {
        const obj = arduinoGenerator.valueToCode(block, 'OBJ', Order.ATOMIC) || '"t0"';
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';

        const root = block.getRootBlock();
        const initBlock = root ? root.getDescendants(false).find((b: any) => b.type === 'nextion_init') : null;
        const serialPort = initBlock ? initBlock.getFieldValue('SERIAL') : 'Serial2';
        const portName = serialPort === 'SW_SERIAL' ? 'nextionSerial' : serialPort;

        // Nextion 指令格式: obj.txt="text" 加三个结尾字节 0xFF
        return `
  ${portName}.print(${obj});
  ${portName}.print(".txt=\\"");
  ${portName}.print(${text});
  ${portName}.print("\\"");
  ${portName}.write(0xFF); ${portName}.write(0xFF); ${portName}.write(0xFF);
\n`;
    });

    /**
     * 设置 Nextion 屏幕上特定组件的数值
     * @param {String} OBJ 组件名称 (如 "n0")
     * @param {Number} VAL 要设置的数值
     */
    registerBlock('nextion_set_val', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEXTION_SET_NUM);
            this.appendValueInput("OBJ")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NEXTION_OBJ_NUM); // 组件名称，如 "n0"
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PREF_VALUE); // 要设置的数值
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
        }
    }, (block: any) => {
        const obj = arduinoGenerator.valueToCode(block, 'OBJ', Order.ATOMIC) || '"n0"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';

        const root = block.getRootBlock();
        const initBlock = root ? root.getDescendants(false).find((b: any) => b.type === 'nextion_init') : null;
        const serialPort = initBlock ? initBlock.getFieldValue('SERIAL') : 'Serial2';
        const portName = serialPort === 'SW_SERIAL' ? 'nextionSerial' : serialPort;

        // Nextion 指令格式: obj.val=value 加三个结尾字节 0xFF
        return `
  ${portName}.print(${obj});
  ${portName}.print(".val=");
  ${portName}.print(${val});
  ${portName}.write(0xFF); ${portName}.write(0xFF); ${portName}.write(0xFF);
\n`;
    });

    /**
     * 切换 Nextion 屏幕显示的页面
     * @param {Any} PAGE 页面 ID 或名称
     */
    registerBlock('nextion_page', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NEXTION_PAGE);
            this.appendValueInput("PAGE")
                .setCheck(null)
                .appendField(Blockly.Msg.ARD_NEXTION_PAGE_ID); // 页面 ID 或名称
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
        }
    }, (block: any) => {
        const page = arduinoGenerator.valueToCode(block, 'PAGE', Order.ATOMIC) || '0';

        const root = block.getRootBlock();
        const initBlock = root ? root.getDescendants(false).find((b: any) => b.type === 'nextion_init') : null;
        const serialPort = initBlock ? initBlock.getFieldValue('SERIAL') : 'Serial2';
        const portName = serialPort === 'SW_SERIAL' ? 'nextionSerial' : serialPort;

        // Nextion 指令格式: page ID 加三个结尾字节 0xFF
        return `
  ${portName}.print("page ");
  ${portName}.print(${page});
  ${portName}.write(0xFF); ${portName}.write(0xFF); ${portName}.write(0xFF);
\n`;
    });

};

/**
 * Nextion 串口屏模块定义
 * 基于串口协议 (Serial2) 与 Nextion HMI 屏幕交互。
 */
export const NextionModule: BlockModule = {
    id: 'hardware.nextion',
    name: 'Nextion Display',
    init
};
