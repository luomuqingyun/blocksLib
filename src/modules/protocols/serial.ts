/**
 * ============================================================
 * 串口通信模块 (Serial Communication Module)
 * ============================================================
 * 
 * 提供基础串口通信积木:
 * - serial_begin: 初始化串口 (波特率)
 * - serial_print: 打印数据
 * - serial_available: 检查数据可用
 * - serial_read: 读取数据
 * 
 * 支持动态选择硬件串口 (根据开发板配置)。
 * 
 * @file src/modules/protocols/serial.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';
import { BoardRegistry } from '../../registries/BoardRegistry';


/**
 * 动态生成串口选项 (Generate Serial Options)
 * ============================================================
 * 根据当前选定开发板的 Pinout (引脚映射) 定义，动态列出所有可用的硬件串口。
 * 
 * 1. "Serial (Default)" (默认):
 *    - 生成代码: Serial.begin(...)
 *    - 含义: 逻辑主串口。在 USB CDC 模式下可能指向虚拟串口，在普通模式下通常指 Serial1。
 *    - 场景: 推荐用于通过电脑 USB 进行打印调试日志。
 * 
 * 2. "SerialX (USARTx)" (指定硬件串口):
 *    - 生成代码: SerialX.begin(...)
 *    - 含义: 强制绑定到物理引脚上的特定硬件外设 (如 UART2)。
 *    - 场景: 推荐用于连接外部通信模块（如 GPS、蓝牙、ESP-NOW 网关等）。
 */
/**
 * 动态生成串口选项 (Generate Serial Options)
 * 从当前开发板配置中提取所有可用的 UART 硬件外设。
 */
const generateSerialOptions = (): [string, string][] => {
    const board = BoardRegistry.getCurrentBoard();
    const uartData = board?.pinout?.UART;
    const options: [string, string][] = [["主串口 (Serial Default)", "Serial"]];

    if (uartData) {
        // 进行数值排序，确保 Serial1, Serial2 顺序正确
        const sortedKeys = Object.keys(uartData).sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)![0] || "0");
            const numB = parseInt(b.match(/\d+/)![0] || "0");
            return numA - numB;
        });

        sortedKeys.forEach(key => {
            // 匹配 USART/UART 后的数字标识
            const match = key.match(/U(?:S)?ART(\d+)/);
            if (match) {
                const num = match[1];
                // 如果是物理硬件串口，显示其具体的 UART 编号
                options.push([`硬件串口 ${num} (${key})`, `Serial${num}`]);
            }
        });
    }
    return options;
};

/**
 * 模块初始化函数
 * 注册基础串口通信相关的积木块。
 */
const init = () => {

    /**
     * 串口打印数据 (Serial Print)
     * @param {Any} CONTENT 要打印的内容
     * @param {String} SERIAL_ID 串口标识符 (如 Serial, Serial1)
     * @param {Boolean} NEW_LINE 是否换行
     */
    registerBlock('arduino_serial_print', {
        init: function () {
            this.appendValueInput("CONTENT")
                .appendField(Blockly.Msg.ARD_SERIAL_PRINT) // 串口
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID") // 动态下拉菜单
                .appendField(new Blockly.FieldCheckbox("TRUE"), "NEW_LINE") // 换行复选框
                .appendField(Blockly.Msg.ARD_SERIAL_NEWLINE);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(160); // 通信协议类积木通常使用青蓝色
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        const content = arduinoGenerator.valueToCode(block, 'CONTENT', Order.NONE) || '""';
        const newLine = block.getFieldValue('NEW_LINE') === 'TRUE';

        // 自动注入初始化代码，默认波特率为 115200。
        // 代码生成器会自动通过键值 serial_begin_${serialId} 去重，确保每个串口只初始化一次。
        arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(115200);`);

        return newLine ? `${serialId}.println(${content});\n` : `${serialId}.print(${content});\n`;
    });

    /**
     * 检查串口是否有数据可读 (Serial Available)
     * @param {String} SERIAL_ID 串口标识符
     * @return {Boolean} 是否有可用数据
     */
    registerBlock('arduino_serial_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERIAL_AVAILABLE) // 串口有数据可读?
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID");
            this.setOutput(true, "Boolean");
            this.setColour(160);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(115200);`);
        return [`${serialId}.available()`, Order.ATOMIC];
    });

    /**
     * 从串口读取整段字符串
     * @param {String} SERIAL_ID 串口标识符
     * @return {String} 读取到的文本
     */
    registerBlock('arduino_serial_read_string', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERIAL_READ_STRING) // 串口读取整个字符串
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID");
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_SERIAL_READ_STRING_TOOLTIP);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(115200);`);
        // 注意：readString() 是阻塞式的，直到超时或没有新数据，返回值是 String 对象。
        return [`${serialId}.readString()`, Order.ATOMIC];
    });

    /**
     * 从串口读取单个字符
     * @param {String} SERIAL_ID 串口标识符
     * @return {Number} 字符的 ASCII 码 (若无数据返回 -1)
     */
    registerBlock('arduino_serial_read_char', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERIAL_READ_CHAR) // 串口读取单个字符
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID");
            this.setOutput(true, "Number");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_SERIAL_READ_CHAR_TOOLTIP);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(115200);`);
        // 读取缓冲区中的第一个字节，如果没有数据则返回 -1。
        return [`${serialId}.read()`, Order.ATOMIC];
    });
};

/**
 * 基础串口模块定义
 * 提供了对硬件 UART 全双工异步通信的核心支持。
 */
export const SerialModule: BlockModule = {
    id: 'protocols.serial',
    name: 'Serial Basic',
    init
};
