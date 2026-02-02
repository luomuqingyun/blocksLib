/**
 * ============================================================
 * 红外遥控模块 (Infrared Remote Module)
 * ============================================================
 * 
 * 提供红外线收发积木 (IRremote.h):
 * - ir_recv_setup: 初始化接收器
 * - ir_recv_available: 检测信号
 * - ir_recv_get_hex: 获取编码 (十六进制)
 * - ir_recv_resume: 继续接收
 * - ir_send_nec: 发送 NEC 编码
 * 
 * @file src/modules/protocols/ir_remote.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化红外接收器
    registerBlock('ir_recv_setup', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IR_RECV_INIT);
            this.appendDummyInput()
                .appendField("引脚")
                .appendField(new Blockly.FieldTextInput("11"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_IR_RECV_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'INPUT');

        // 包含 IRremote 库内容
        arduinoGenerator.addInclude('ir_lib', '#include <IRremote.h>');
        // 定义接收器对象和解码结果存储对象
        arduinoGenerator.addVariable('ir_recv_obj', `IRrecv irrecv(${pin});\ndecode_results results;`);

        // 在 setup 中开启红外接收功能
        arduinoGenerator.addSetup('ir_recv_begin', `irrecv.enableIRIn();`);

        return '';
    });

    // 检测是否接收到红外信号并尝试解码
    registerBlock('ir_recv_available', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IR_CODE_RECV);
            this.setOutput(true, "Boolean");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_IR_CHECK_TOOLTIP);
        }
    }, (block: any) => {
        // 返回解码结果的布尔值，同时将数据存入 results 对象
        return ['irrecv.decode(&results)', Order.ATOMIC];
    });

    // 继续接收下一个信号
    registerBlock('ir_recv_resume', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IR_RESUME);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_IR_RESUME_TOOLTIP);
        }
    }, (block: any) => {
        // 每次读取完信号后必续调用此函数以重置状态机
        return `irrecv.resume();\n`;
    });

    registerBlock('ir_recv_get_hex', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IR_GET_HEX);
            this.setOutput(true, "String");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_IR_GET_HEX_TOOLTIP);
        }
    }, (block: any) => {
        // v3/v4 might use decodedIRData.decodedRawData or value
        // Assuming v2/v3 compatible logic for simplicity or results.value
        // Using String(results.value, HEX) is standard Arduino
        return ['String(results.value, HEX)', Order.ATOMIC];
    });

    // 发送 NEC 协议的红外编码
    registerBlock('ir_send_nec', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IR_SEND_NEC);
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IR_VAL);
            this.appendValueInput("BITS")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IR_BITS);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_IR_SEND_TOOLTIP);
        }
    }, (block: any) => {
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        const bits = arduinoGenerator.valueToCode(block, 'BITS', Order.ATOMIC) || '32';

        arduinoGenerator.addInclude('ir_lib', '#include <IRremote.h>');
        // 定义发送器对象
        arduinoGenerator.addVariable('ir_send_obj', `IRsend irsend;`);

        // 调用发送 NEC 编码的方法
        return `irsend.sendNEC(${val}, ${bits});\n`;
    });

};

export const IRRemoteModule: BlockModule = {
    id: 'protocols.ir_remote',
    name: 'IR Remote',
    init
};
