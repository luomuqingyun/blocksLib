/**
 * ============================================================
 * 433MHz 无线电模块 (RF433 Radio - RCSwitch)
 * ============================================================
 * 
 * 提供 433MHz 无线电发射/接收积木:
 * - radio_tx_init/send: 发射端初始化/发送
 * - radio_rx_init/available/get/reset/info: 接收端
 * 
 * 使用 RCSwitch.h 库。
 * 适用于遥控开关、无线门铃等应用。
 * 
 * @file src/modules/protocols/radio.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // RCSwitch (RCSwitch.h) - 433MHz
    // =========================================================================

    // 初始化红外/射频发射端
    registerBlock('radio_tx_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_TX_INIT);
            this.appendDummyInput()
                .appendField("引脚")
                .appendField(new Blockly.FieldTextInput("10"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_TX_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'OUTPUT');

        // 包含 RCSwitch 库
        arduinoGenerator.addInclude('rcswitch_lib', '#include <RCSwitch.h>');
        // 定义 mySwitch 对象
        arduinoGenerator.addVariable('rcswitch_obj', `RCSwitch mySwitch = RCSwitch();`);
        // 在 setup 中启用指定引脚的发射功能
        arduinoGenerator.addSetup('rcswitch_tx_init', `mySwitch.enableTransmit(${pin});`);

        return '';
    });

    // 发送 433MHz 无线信号
    registerBlock('radio_tx_send', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_TX_SEND);
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField("数值");
            this.appendValueInput("LEN")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_RADIO_LEN);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_TX_SEND_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        const len = arduinoGenerator.valueToCode(block, 'LEN', Order.ATOMIC) || '24';
        // 发送特定位长度的数值信号
        return `mySwitch.send(${val}, ${len});\n`;
    });

    // 初始化接收端（使用中断引脚）
    registerBlock('radio_rx_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_RX_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_IRQ_PIN)
                .appendField(new Blockly.FieldTextInput("0"), "PIN"); // 0 通常对应 Uno 的 2 号引脚
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_RX_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');

        arduinoGenerator.addInclude('rcswitch_lib', '#include <RCSwitch.h>');
        arduinoGenerator.addVariable('rcswitch_obj', `RCSwitch mySwitch = RCSwitch();`);
        // 开启指定中断号的接收功能
        arduinoGenerator.addSetup('rcswitch_rx_init', `mySwitch.enableReceive(${pin});`);

        return '';
    });

    // 检查是否有可用的无线信号
    registerBlock('radio_rx_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_AVAIL);
            this.setOutput(true, "Boolean");
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_RX_AVAIL_TOOLTIP);
        }
    }, (block: any) => {
        return ['mySwitch.available()', Order.ATOMIC];
    });

    /**
     * 获取最近一次接收到的 433MHz 无线信号数值
     * @return {Number} 接收到的解码值
     */
    registerBlock('radio_rx_get', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_GET);
            this.setOutput(true, "Number");
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_RX_GET_TOOLTIP);
        }
    }, (block: any) => {
        return ['mySwitch.getReceivedValue()', Order.ATOMIC];
    });

    // 重置接收状态
    registerBlock('radio_rx_reset', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_RESET);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_RX_RESET_TOOLTIP);
        }
    }, (block: any) => {
        // 解码完成后必续重置以允许接收新信号
        return `mySwitch.resetAvailable();\n`;
    });

    /**
     * 获取当前接收到的无线信号详细信息
     * @param {String} INFO 信息类型 (Bitlength/Protocol/Delay)
     * @return {Number} 对应的信息数值
     */
    registerBlock('radio_rx_info', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RADIO_INFO)
                .appendField(new Blockly.FieldDropdown([
                    [Blockly.Msg.ARD_RADIO_INFO_LEN, "getReceivedBitlength()"],
                    [Blockly.Msg.ARD_RADIO_INFO_PROTO, "getReceivedProtocol()"],
                    [Blockly.Msg.ARD_RADIO_INFO_DELAY, "getReceivedDelay()"]
                ]), "INFO");
            this.setOutput(true, "Number");
            this.setColour(90);
            this.setTooltip(Blockly.Msg.ARD_RADIO_RX_INFO_TOOLTIP);
        }
    }, (block: any) => {
        const info = block.getFieldValue('INFO');
        return [`mySwitch.${info}`, Order.ATOMIC];
    });

};

export const RadioModule: BlockModule = {
    id: 'protocols.radio',
    name: 'Radio (RF433)',
    init
};
