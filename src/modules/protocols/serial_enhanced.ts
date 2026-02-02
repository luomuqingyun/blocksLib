/**
 * ============================================================
 * 增强串口模块 (Enhanced Serial Communication)
 * ============================================================
 * 
 * 提供高级串口通信积木:
 * - serial_setup: 初始化 (波特率)
 * - serial_print: 打印 (可选换行)
 * - serial_available_check: 检查数据可用
 * - serial_read_string/char: 读取数据
 * - serial_write: 写入原始字节
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';
import { BoardRegistry } from '../../registries/BoardRegistry';


const generateSerialOptions = (): [string, string][] => {
    const board = BoardRegistry.getCurrentBoard();
    const uartData = board?.pinout?.UART;
    const options: [string, string][] = [["主串口 (Serial Default)", "Serial"]];

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
                options.push([`硬件串口 ${num} (${key})`, `Serial${num}`]);
            }
        });
    }
    return options;
};

const init = () => {
    // 增强版串口初始化（可选手波特率）
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
        // 在 setup 中根据选定波特率初始化串口
        arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(${baud});`);
        return '';
    });

    // 串口打印内容
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

        // 如果用户忘记放 setup 积木，则默认以 9600 波特率初始化
        if (!arduinoGenerator.setups_[`serial_begin_${serialId}`]) {
            arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(9600);`);
        }

        return newLine ? `${serialId}.println(${content});\n` : `${serialId}.print(${content});\n`;
    });

    // 检查串口缓冲区是否有数据
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
        // 返回 buffer 中字节数大于 0 的布尔结果
        return [`${serialId}.available() > 0`, Order.ATOMIC];
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
        if (!arduinoGenerator.setups_[`serial_begin_${serialId}`]) {
            arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(9600);`);
        }
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
        if (!arduinoGenerator.setups_[`serial_begin_${serialId}`]) {
            arduinoGenerator.addSetup(`serial_begin_${serialId}`, `${serialId}.begin(9600);`);
        }
        return [`${serialId}.read()`, Order.ATOMIC];
    });

    // 向串口写入原始字节 (Byte)
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
    init
};
