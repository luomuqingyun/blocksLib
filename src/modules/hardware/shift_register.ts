/**
 * ============================================================
 * 移位寄存器模块 (74HC595/74HC165 Shift Register)
 * ============================================================
 * 
 * 提供移位寄存器积木:
 * - shift_out_74hc595: 串行输出 (扩展输出)
 * - shift_in_74hc165: 串行输入 (扩展输入)
 * 
 * 使用 shiftOut()/shiftIn() 函数。
 * 可用于扩展 GPIO 或驱动 LED 等。
 * 
 * @file src/modules/hardware/shift_register.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 使用 74HC595 移位寄存器扩展输出 (串转并)
    registerBlock('shift_out_74hc595', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHIFT_OUT);
            this.appendValueInput("DATA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IO_DATA_BYTE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DATA_PIN)
                .appendField(new Blockly.FieldTextInput("11"), "DATA_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_CLOCK_PIN)
                .appendField(new Blockly.FieldTextInput("12"), "CLOCK_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHIFT_LATCH)
                .appendField(new Blockly.FieldTextInput("8"), "LATCH_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ORDER)
                .appendField(new Blockly.FieldDropdown([["MSBFIRST", "MSBFIRST"], ["LSBFIRST", "LSBFIRST"]]), "ORDER");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_SHIFT_WRITE_TOOLTIP);
        }
    }, (block: any) => {
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '0';
        const dPin = block.getFieldValue('DATA_PIN');
        const cPin = block.getFieldValue('CLOCK_PIN');
        const lPin = block.getFieldValue('LATCH_PIN');
        const order = block.getFieldValue('ORDER');

        reservePin(block, dPin, 'OUTPUT');
        reservePin(block, cPin, 'OUTPUT');
        reservePin(block, lPin, 'OUTPUT');

        // 在 setup 中将三个控制引脚设为输出模式
        arduinoGenerator.addSetup(`shift_pins_${dPin}_${cPin}_${lPin}`, `
  pinMode(${lPin}, OUTPUT);
  pinMode(${cPin}, OUTPUT);
  pinMode(${dPin}, OUTPUT);
`);

        // 74HC595 通信序列：
        // 1. LATCH 引脚拉低开启移位
        // 2. 使用内置 shiftOut 函数推送 8 位数据
        // 3. LATCH 引脚拉高将数据更新至输出锁存器
        return `
  digitalWrite(${lPin}, LOW);
  shiftOut(${dPin}, ${cPin}, ${order}, ${data});
  digitalWrite(${lPin}, HIGH);
\n`;
    });

    // 从 74HC165 移位寄存器读取 8 位并行输入数据
    registerBlock('shift_in_74hc165', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHIFT_IN);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DATA_PIN) // 数据引脚 (QH)
                .appendField(new Blockly.FieldTextInput("12"), "DATA_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_CLOCK_PIN) // 时钟引脚 (CLK)
                .appendField(new Blockly.FieldTextInput("11"), "CLOCK_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHIFT_LOAD) // 锁存/加载引脚 (SH/LD)
                .appendField(new Blockly.FieldTextInput("8"), "LATCH_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHIFT_CE) // 时钟允许引脚 (CLK INH)
                .appendField(new Blockly.FieldTextInput("9"), "CE_PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ORDER) // 位序 (高位在前或低位在前)
                .appendField(new Blockly.FieldDropdown([["MSBFIRST", "MSBFIRST"], ["LSBFIRST", "LSBFIRST"]]), "ORDER");
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_SHIFT_READ_TOOLTIP);
        }
    }, (block: any) => {
        const dPin = block.getFieldValue('DATA_PIN');
        const cPin = block.getFieldValue('CLOCK_PIN');
        const lPin = block.getFieldValue('LATCH_PIN');
        const cePin = block.getFieldValue('CE_PIN');
        const order = block.getFieldValue('ORDER');

        reservePin(block, dPin, 'INPUT');
        reservePin(block, cPin, 'OUTPUT');
        reservePin(block, lPin, 'OUTPUT');
        reservePin(block, cePin, 'OUTPUT');

        // 在 setup 中配置引脚模式
        arduinoGenerator.addSetup(`shift_in_pins_${dPin}_${cPin}_${lPin}`, `
  pinMode(${lPin}, OUTPUT);
  pinMode(${cePin}, OUTPUT);
  pinMode(${cPin}, OUTPUT);
  pinMode(${dPin}, INPUT);
  digitalWrite(${cPin}, HIGH);
  digitalWrite(${cePin}, HIGH);
`);

        // 74HC165 读取时序说明:
        // 1. 将 LATCH 引脚拉低，将外部 8 位并行数据加载到寄存器内部。
        // 2. 将 LATCH 引脚拉高，进入移位模式。
        // 3. 将 CE (Clock Enable) 引脚拉低，使能时钟开始移位。
        // 4. 调用标准的 shiftIn 函数串行读入 8 位数据。
        // 5. 将 CE 引脚拉高，禁用时钟。

        // 封装为辅助函数以保持代码整洁
        const funcName = `readShiftIn_${dPin}_${cPin}`;
        arduinoGenerator.functions_[funcName] = `
byte ${funcName}() {
  digitalWrite(${lPin}, LOW);
  delayMicroseconds(5);
  digitalWrite(${lPin}, HIGH);
  digitalWrite(${cePin}, LOW);
  byte val = shiftIn(${dPin}, ${cPin}, ${order});
  digitalWrite(${cePin}, HIGH);
  return val;
}`;

        return [`${funcName}()`, Order.ATOMIC];
    });

};

/**
 * 移位寄存器模块 (74HC595 / 74HC165)
 * 提供 74HC595 (串行输入转并行输出) 和 74HC165 (并行输入转串行输出) 的硬件驱动积木。
 */
export const ShiftRegisterModule: BlockModule = {
    id: 'hardware.shift_register',
    name: 'Shift Registers',
    init
};
