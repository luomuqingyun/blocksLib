/**
 * ============================================================
 * 工业自动化模块 (Industrial Automation - Modbus/CAN)
 * ============================================================
 * 
 * 提供工业通信协议积木:
 * - Modbus RTU: 初始化/读取寄存器/获取缓冲区
 * - CAN Bus (ESP32 TWAI): 初始化/发送消息
 * 
 * Modbus 使用 ModbusMaster.h 库。
 * CAN 使用 ESP32 原生 TWAI 驱动。
 * 
 * @file src/modules/protocols/automation.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // ===================================
    // Modbus Master (ModbusMaster Lib)
    // ===================================
    // Modbus 主机初始化
    registerBlock('modbus_init', {
        init: function () {
            this.appendDummyInput()
                .appendField("Modbus 主机初始化");
            this.appendDummyInput()
                .appendField("波特率")
                .appendField(new Blockly.FieldDropdown([["9600", "9600"], ["19200", "19200"], ["115200", "115200"]]), "BAUD");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_MODBUS_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const baud = block.getFieldValue('BAUD');

        // 包含 ModbusMaster 库
        arduinoGenerator.addInclude('modbus_lib', '#include <ModbusMaster.h>');
        // 定义 ModbusMaster 节点对象
        arduinoGenerator.addVariable('modbus_obj', `ModbusMaster node;`);

        // 初始化串口并绑定到从机 ID 1（默认）
        arduinoGenerator.addSetup('modbus_config', `Serial.begin(${baud});\n  node.begin(1, Serial); // 默认从机 ID 为 1`);

        return '';
    });

    // 读取保持寄存器
    registerBlock('modbus_read_regs', {
        init: function () {
            this.appendDummyInput()
                .appendField("Modbus 读取保持寄存器");
            this.appendValueInput("ADDR")
                .setCheck("Number")
                .appendField("地址");
            this.appendValueInput("COUNT")
                .setCheck("Number")
                .appendField("数量");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_MODBUS_READ_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const addr = arduinoGenerator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0';
        const count = arduinoGenerator.valueToCode(block, 'COUNT', Order.ATOMIC) || '1';
        // 调用 readHoldingRegisters 发起读取请求，结果将存入响应缓冲区
        return `node.readHoldingRegisters(${addr}, ${count});\n`;
    });

    // 从响应缓冲区中获取指定索引的数据
    registerBlock('modbus_get_buffer', {
        init: function () {
            this.appendDummyInput()
                .appendField("Modbus 获取缓冲区索引");
            this.appendValueInput("INDEX")
                .setCheck("Number");
            this.setOutput(true, "Number");
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_MODBUS_GET_TOOLTIP);
        }
    }, (block: any) => {
        const index = arduinoGenerator.valueToCode(block, 'INDEX', Order.ATOMIC) || '0';
        return [`node.getResponseBuffer(${index})`, Order.ATOMIC];
    });

    // ===================================
    // CAN Bus (ESP32 TWAI)
    // ===================================
    // CAN 总线 (ESP32 TWAI) 初始化
    registerBlock('can_init', {
        init: function () {
            this.appendDummyInput()
                .appendField("ESP32 CAN (TWAI) 初始化");
            this.appendDummyInput()
                .appendField("发送引脚 (TX)")
                .appendField(new Blockly.FieldTextInput("26"), "TX");
            this.appendDummyInput()
                .appendField("接收引脚 (RX)")
                .appendField(new Blockly.FieldTextInput("27"), "RX");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_CAN_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const tx = block.getFieldValue('TX');
        const rx = block.getFieldValue('RX');

        // 包含 ESP32 TWAI 驱动头文件
        arduinoGenerator.addInclude('can_lib', '#include "driver/twai.h"');

        // 定义 CAN 设置辅助函数
        arduinoGenerator.functions_['can_setup_func'] = `
void setupCAN() {
    // 通用配置：正常模式
    twai_general_config_t g_config = TWAI_GENERAL_CONFIG_DEFAULT((gpio_num_t)${tx}, (gpio_num_t)${rx}, TWAI_MODE_NORMAL);
    // 速度配置：500kbps
    twai_timing_config_t t_config = TWAI_TIMING_CONFIG_500KBITS();
    // 过滤器配置：接收所有消息
    twai_filter_config_t f_config = TWAI_FILTER_CONFIG_ACCEPT_ALL();
    // 安装并开启驱动
    if (twai_driver_install(&g_config, &t_config, &f_config) == ESP_OK) {
        twai_start();
    }
}`;

        // 在 setup 中调用初始化函数
        arduinoGenerator.addSetup('can_init', `setupCAN();`);
        return '';
    });

    // 发送 CAN 消息
    registerBlock('can_send', {
        init: function () {
            this.appendDummyInput()
                .appendField("CAN 发送");
            this.appendValueInput("ID")
                .setCheck("Number")
                .appendField("标识符 (ID)");
            this.appendValueInput("DATA")
                .setCheck("Number") // 单个字节数据
                .appendField("字节数据");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, (block: any) => {
        const id = arduinoGenerator.valueToCode(block, 'ID', Order.ATOMIC) || '0x100';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '0';

        // 构建并发送单字节消息
        return `
    twai_message_t message;
        message.identifier = ${id};
        message.extd = 0;
        message.data_length_code = 1;
        message.data[0] = ${data};
        twai_transmit(& message, pdMS_TO_TICKS(100));
\n`;
    });

};

export const AutomationModule: BlockModule = {
    id: 'protocols.automation',
    name: 'Industrial (CAN/Modbus)',
    init
};
