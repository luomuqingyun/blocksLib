// ============================================================
// STM32 CAN Protocol Module
// ============================================================
// Supports STM32 internal CAN controller via HardwareCAN library.
// Blocks: Init, Write, Read.

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {
    // ------------------------------------------------------------------
    // CAN Init
    // ------------------------------------------------------------------
    registerBlock('stm32_can_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_CAN_INIT);
            this.appendDummyInput()
                .appendField("Speed")
                .appendField(new Blockly.FieldDropdown([
                    ["125 kbps", "CAN_SPEED_125KBPS"],
                    ["250 kbps", "CAN_SPEED_250KBPS"],
                    ["500 kbps", "CAN_SPEED_500KBPS"],
                    ["1000 kbps", "CAN_SPEED_1000KBPS"]
                ]), "SPEED");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip("Initialize STM32 CAN Bus");
        }
    }, function (block: any) {
        const speed = block.getFieldValue('SPEED');
        arduinoGenerator.addInclude('HardwareCAN', '#include <HardwareCAN.h>');
        arduinoGenerator.addSetup('can_init', `CAN.begin(${speed});`);
        return '';
    });

    // ------------------------------------------------------------------
    // CAN Send
    // ------------------------------------------------------------------
    registerBlock('stm32_can_send', {
        init: function () {
            this.appendValueInput("ID")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_CAN_SEND + " ID");
            this.appendValueInput("DATA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_I2C_DATA); // Reuse I2C Data label
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip("Send a single byte via CAN");
        }
    }, function (block: any) {
        const id = arduinoGenerator.valueToCode(block, 'ID', Order.NONE) || '0x100';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.NONE) || '0';

        // Simple helper for sending 1 byte. Real usage might need arrays.
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
    // CAN Available
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
    // CAN Read
    // ------------------------------------------------------------------
    registerBlock('stm32_can_read', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CAN_READ);
            this.setOutput(true, "Number");
            this.setColour(180);
        }
    }, function () {
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
    category: 'Communication', // or STM32
    init
};
