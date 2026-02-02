/**
 * ============================================================
 * 以太网模块 (W5500 Ethernet Shield)
 * ============================================================
 * 
 * 提供 W5500 有线网络积木:
 * - ethernet_w5500_init: 初始化 (MAC/CS 引脚)
 * - ethernet_w5500_get_ip: 获取本地 IP 地址
 * 
 * 使用 Ethernet.h 库。支持 DHCP。
 * 
 * @file src/modules/hardware/ethernet_w5500.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化 W5500 以太网
    registerBlock('ethernet_w5500_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ETH_INIT);
            this.appendValueInput("MAC")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_ETH_MAC);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ETH_CS)
                .appendField(new Blockly.FieldTextInput("5"), "CS");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_ETHERNET_W5500_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const mac = arduinoGenerator.valueToCode(block, 'MAC', Order.ATOMIC) || '{0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED}';
        const cs = block.getFieldValue('CS');
        reservePin(block, cs, 'OUTPUT');

        // 包含核心库
        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('ethernet_lib', '#include <Ethernet.h>');
        // 定义 MAC 地址变量
        arduinoGenerator.addVariable('eth_mac', `byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };`);

        // 设置 W5500 的片选引脚并尝试通过 DHCP 获取 IP
        arduinoGenerator.addSetup('ethernet_init_cs', `Ethernet.init(${cs});`);
        arduinoGenerator.addSetup('ethernet_begin', `
  if (Ethernet.begin(mac) == 0) {
    // 无法通过 DHCP 配置以太网，检查硬件连接状态
    if (Ethernet.hardwareStatus() == EthernetNoHardware) {
      // 未检测到以太网扩展板
    }
  }
`);
        return '';
    });

    // 获取当前以太网模块分配到的本地 IP 地址
    registerBlock('ethernet_w5500_get_ip', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ETH_IP);
            this.setOutput(true, "String");
            this.setColour(210);
        }
    }, (block: any) => {
        // Ethernet.localIP() 返回 IPAddress 对象，通过 String() 封装转换为可打印字符串。
        return [`String(Ethernet.localIP())`, Order.ATOMIC];
    });

};

/**
 * W5500 以太网模块控制
 * 基于 SPI 接口，提供有线网络连接初始化及 IP 获取功能。
 */
export const EthernetW5500Module: BlockModule = {
    id: 'hardware.ethernet_w5500',
    name: 'Ethernet (W5500)',
    init
};
