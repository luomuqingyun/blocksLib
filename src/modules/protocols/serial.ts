import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';
import { BoardRegistry } from '../../registries/BoardRegistry';

// ============================================================
// 动态生成串口选项 (Generate Serial Options)
// ============================================================
// 根据当前选定开发板的 Pinout 定义，动态列出可用的硬件串口。
// 1. "Serial (Default)" (默认):
//    - 生成代码: Serial.begin(...)
//    - 含义: 逻辑主串口。在 USB CDC 模式下可能指向虚拟串口，在普通模式下通常指 Serial1 (PA9/PA10)。
//    - 场景: 推荐用于打印调试日志 (Print)，具有最佳的可移植性。
// 2. "SerialX (USARTx)" (指定硬件串口):
//    - 生成代码: SerialX.begin(...)
//    - 含义: 强制绑定到特定的硬件外设 (如 USART1, USART2)。
//    - 场景: 推荐用于连接外部模块 (蓝牙、GPS、舵机驱动等)，避免因 USB 设置改变导致引脚变动。
const generateSerialOptions = (): [string, string][] => {
    const board = BoardRegistry.getCurrentBoard();
    const uartData = board?.pinout?.UART;
    const options: [string, string][] = [["Serial (Default)", "Serial"]];

    if (uartData) {
        // 对串口号进行数值排序 (Sort keys numerically)
        // 确保顺序为 Serial1 < Serial2 < Serial3 ... 而不是按字母序 (UART4 < USART1)
        const sortedKeys = Object.keys(uartData).sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)![0] || "0");
            const numB = parseInt(b.match(/\d+/)![0] || "0");
            return numA - numB;
        });

        sortedKeys.forEach(key => {
            const match = key.match(/U(?:S)?ART(\d+)/);
            if (match) {
                const num = match[1];
                options.push([`Serial${num} (${key})`, `Serial${num}`]);
            }
        });
    }
    return options;
};

const init = () => {
    registerBlock('arduino_serial_print', {
        init: function () {
            this.appendValueInput("CONTENT")
                .appendField(Blockly.Msg.ARD_SERIAL_PRINT)
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "NEW_LINE")
                .appendField(Blockly.Msg.ARD_SERIAL_NEWLINE);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(160);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        const content = arduinoGenerator.valueToCode(block, 'CONTENT', Order.NONE) || '""';
        const newLine = block.getFieldValue('NEW_LINE') === 'TRUE';

        arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(115200);`);
        return newLine ? `${serialId}.println(${content});\n` : `${serialId}.print(${content});\n`;
    });

    registerBlock('arduino_serial_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERIAL_AVAILABLE)
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID");
            this.setOutput(true, "Boolean");
            this.setColour(160);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(115200);`);
        return [`${serialId}.available()`, Order.ATOMIC];
    });

    registerBlock('arduino_serial_read_string', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERIAL_READ_STRING)
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID");
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_SERIAL_READ_STRING_TOOLTIP);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(115200);`);
        return [`${serialId}.readString()`, Order.ATOMIC];
    });

    registerBlock('arduino_serial_read_char', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERIAL_READ_CHAR)
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID");
            this.setOutput(true, "Number");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_SERIAL_READ_CHAR_TOOLTIP);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(115200);`);
        return [`${serialId}.read()`, Order.ATOMIC];
    });
};

export const SerialModule: BlockModule = {
    id: 'protocols.serial',
    name: 'Serial Basic',
    category: 'Serial',
    init
};