/**
 * ============================================================
 * STM32 CAN 总线模块 (CAN Bus Protocol)
 * ============================================================
 * 
 * 提供 STM32 内置 CAN 控制器积木:
 * - stm32_can_init: 初始化 (速度)
 * - stm32_can_send: 发送数据
 * - stm32_can_available: 检查数据可用
 * - stm32_can_read: 读取数据
 * 
 * 使用 HardwareCAN.h 库。
 * 
 * @file src/modules/stm32/can.ts
 * @module EmbedBlocks/Frontend/Modules/STM32
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {
    // ------------------------------------------------------------------
    // CAN 初始化
    // ------------------------------------------------------------------
    registerBlock('stm32_can_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAN_INIT);
            this.appendDummyInput()
                .appendField("速度")
                .appendField(new Blockly.FieldDropdown([
                    ["125 kbps", "CAN_SPEED_125KBPS"],
                    ["250 kbps", "CAN_SPEED_250KBPS"],
                    ["500 kbps", "CAN_SPEED_500KBPS"],
                    ["1000 kbps", "CAN_SPEED_1000KBPS"]
                ]), "SPEED");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip("初始化 STM32 CAN 总线");
        }
    }, function (block: any) {
        const speed = block.getFieldValue('SPEED');
        // 包含硬件 CAN 库头文件
        arduinoGenerator.addInclude('HardwareCAN', '#include <HardwareCAN.h>');
        // 在 setup 中初始化速度
        arduinoGenerator.addSetup('can_init', `CAN.begin(${speed});`);
        return '';
    });

    // ------------------------------------------------------------------
    // CAN 发送数据
    // ------------------------------------------------------------------
    registerBlock('stm32_can_send', {
        init: function () {
            this.appendValueInput("ID")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_CAN_SEND + " ID");
            this.appendValueInput("DATA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_I2C_DATA); // 复用 I2C 数据标签
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip("通过 CAN 发送单个字节");
        }
    }, function (block: any) {
        const id = arduinoGenerator.valueToCode(block, 'ID', Order.NONE) || '0x100';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.NONE) || '0';

        // 发送单个字节的辅助函数。实际使用可能需要数组。
        const sendFunc = arduinoGenerator.addFunction('canSendByte', `
void canSendByte(uint32_t id, uint8_t data) {
  CAN_message_t msg;
  msg.id = id;
  msg.len = 1;
  msg.buf[0] = data;
  CAN.write(msg);
}`);
        return `${sendFunc}(${id}, ${data});\n`;
    });

    // ------------------------------------------------------------------
    // CAN 检查数据可用性
    // ------------------------------------------------------------------
    registerBlock('stm32_can_available', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CAN_AVAIL);
            this.setOutput(true, "Boolean");
            this.setColour(180);
        }
    }, function () {
        return ['CAN.available()', Order.ATOMIC];
    });

    // ------------------------------------------------------------------
    // CAN 读取数据
    // ------------------------------------------------------------------
    registerBlock('stm32_can_read', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CAN_READ);
            this.setOutput(true, "Number");
            this.setColour(180);
        }
    }, function () {
        // 构建读取单个字节的辅助函数
        const readFunc = arduinoGenerator.addFunction('canReadByte', `
uint8_t canReadByte() {
  CAN_message_t msg;
  if(CAN.read(msg)) {
    return msg.buf[0];
  }
  return 0;
}`);
        return [`${readFunc}()`, Order.ATOMIC];
    });
};

export const STM32CANModule: BlockModule = {
    id: 'stm32.can',
    name: 'STM32 CAN',
    init
};
