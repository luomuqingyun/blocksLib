// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';
import { BoardRegistry } from '../../registries/BoardRegistry';

// ============================================================
// 动态生成串口选项 (Generate Serial Options)
// ============================================================
// 详见 serial.ts 中的注释。此函数为高级串口模块提供相同的动态选择功能。
const generateSerialOptions = (): [string, string][] => {
    const board = BoardRegistry.getCurrentBoard();
    const uartData = board?.pinout?.UART;
    const options: [string, string][] = [["Serial (Default)", "Serial"]];

    if (uartData) {
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
    // -------------------------------------------------------------
    // 1. Serial Setup (串口初始化)
    // 允许用户配置波特率，并隐式初始化 Serial.begin
    // -------------------------------------------------------------
    registerBlock('arduino_serial_setup', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERIAL_SETUP)
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID")
                .appendField(Blockly.Msg.ARD_SERIAL_BAUD)
                .appendField(new Blockly.FieldDropdown([
                    ["9600", "9600"],
                    ["115200", "115200"],
                    ["57600", "57600"],
                    ["38400", "38400"]
                ]), "BAUD");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_SERIAL_SETUP_TOOLTIP);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        const baud = block.getFieldValue('BAUD');
        arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(${baud});`);
        return '';
    });

    // -------------------------------------------------------------
    // 2. Serial Print Consolidated (串口打印 - 整合版)
    // 整合了 Print 和 Println，支持自动初始化 Serial
    // -------------------------------------------------------------
    registerBlock('arduino_serial_print', {
        init: function () {
            this.appendValueInput("CONTENT")
                .setCheck(null)
                .appendField(Blockly.Msg.ARD_SERIAL_PRINT);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "NEW_LINE")
                .appendField(Blockly.Msg.ARD_SERIAL_NEWLINE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setInputsInline(true);
            this.setTooltip(Blockly.Msg.ARD_SERIAL_PRINT_TOOLTIP);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        const content = arduinoGenerator.valueToCode(block, 'CONTENT', Order.NONE) || '""';
        const newLine = block.getFieldValue('NEW_LINE') === 'TRUE';

        // Auto-setup if not present (fallback)
        if (!arduinoGenerator.setups_[`serial_begin_${serialId}`]) {
            arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(9600);`);
        }

        return newLine ? `${serialId}.println(${content});\n` : `${serialId}.print(${content});\n`;
    });

    // -------------------------------------------------------------
    // 3. Serial Available (检查串口是否有数据)
    // 对应 Serial.available() > 0
    // -------------------------------------------------------------
    registerBlock('arduino_serial_available_check', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERIAL_AVAILABLE_CHECK)
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID");
            this.setOutput(true, "Boolean");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_SERIAL_AVAILABLE_CHECK_TOOLTIP);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        if (!arduinoGenerator.setups_[`serial_begin_${serialId}`]) {
            arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(9600);`);
        }
        return [`${serialId}.available() > 0`, Order.ATOMIC];
    });

    // -------------------------------------------------------------
    // 4. Serial Read String (读取字符串)
    // 对应 Serial.readString()
    // -------------------------------------------------------------
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
        if (!arduinoGenerator.setups_[`serial_begin_${serialId}`]) {
            arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(9600);`);
        }
        return [`${serialId}.readString()`, Order.ATOMIC];
    });

    // -------------------------------------------------------------
    // 5. Serial Read Char (读取单个字符)
    // 对应 Serial.read()，返回 ASCII 码 (int)
    // -------------------------------------------------------------
    registerBlock('arduino_serial_read_char', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SERIAL_READ_CHAR)
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID");
            this.setOutput(true, "Number"); // Returns int (ASCII)
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_SERIAL_READ_CHAR_TOOLTIP);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        if (!arduinoGenerator.setups_[`serial_begin_${serialId}`]) {
            arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(9600);`);
        }
        return [`${serialId}.read()`, Order.ATOMIC];
    });

    // -------------------------------------------------------------
    // 6. Serial Write (写入原始字节)
    // 对应 Serial.write()
    // -------------------------------------------------------------
    registerBlock('arduino_serial_write', {
        init: function () {
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SERIAL_WRITE);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown(generateSerialOptions), "SERIAL_ID");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_SERIAL_WRITE_TOOLTIP);
        }
    }, function (block: any) {
        const serialId = block.getFieldValue('SERIAL_ID');
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.NONE) || '0';
        if (!arduinoGenerator.setups_[`serial_begin_${serialId}`]) {
            arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(9600);`);
        }
        return `${serialId}.write(${val});\n`;
    });
};

export const SerialEnhancedModule: BlockModule = {
    id: 'protocols.serial_enhanced',
    name: 'Serial Enhanced',
    category: 'Serial',
    init
};
