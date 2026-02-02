/**
 * ============================================================
 * STM32 网络模块 (Ethernet - W5500/LAN8720)
 * ============================================================
 * 
 * 提供 STM32 以太网积木:
 * - stm32_ethernet_init: 初始化 (MAC/CS)
 * - stm32_ethernet_ip: 获取本地 IP
 * 
 * 使用 Ethernet.h 库。
 * 
 * @file src/modules/stm32/network.ts
 * @module EmbedBlocks/Frontend/Modules/STM32
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {
    // ------------------------------------------------------------------
    // 以太网初始化 (默认为 W5500)
    // ------------------------------------------------------------------
    registerBlock('stm32_ethernet_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_ETH_INIT);
            this.appendDummyInput()
                .appendField("MAC 地址")
                .appendField(new Blockly.FieldTextInput("DE:AD:BE:EF:FE:ED"), "MAC");
            this.appendDummyInput()
                .appendField("片选引脚 (CS)")
                .appendField(new Blockly.FieldDropdown([
                    ["PA4 (SPI1)", "PA4"],
                    ["PB12 (SPI2)", "PB12"],
                    ["默认 (Pin 10)", "10"] // Arduino 默认
                ]), "CS");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(150);
            this.setTooltip("初始化以太网控制器 (如 W5500)");
        }
    }, function (block: any) {
        const mac = block.getFieldValue('MAC');
        const cs = block.getFieldValue('CS');

        // 将 MAC 地址字符串转换为字节数组格式
        const macBytes = mac.split(':').map((h: string) => '0x' + h).join(', ');

        // 引入 SPI 和 Ethernet 库
        arduinoGenerator.addInclude('SPI', '#include <SPI.h>');
        arduinoGenerator.addInclude('Ethernet', '#include <Ethernet.h>');

        // 定义 MAC 地址变量
        arduinoGenerator.addVariable('mac_addr', `byte mac[] = { ${macBytes} };`);

        // 如果 CS 引脚不是默认值，则调用 Ethernet.init
        if (cs !== '10') {
            arduinoGenerator.addSetup('eth_cs', `Ethernet.init(${cs});`);
        }
        // 在 setup 中尝试通过 DHCP 获取 IP 并初始化
        arduinoGenerator.addSetup('eth_begin', `if(Ethernet.begin(mac) == 0) { Serial.println("Failed to configure Ethernet using DHCP"); }`);

        return '';
    });

    // ------------------------------------------------------------------
    // 获取以太网 IP 地址
    // ------------------------------------------------------------------
    registerBlock('stm32_ethernet_ip', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_NET_ETH_IP);
            this.setOutput(true, "String");
            this.setColour(150);
        }
    }, function () {
        // 调用 Ethernet.localIP() 并转换为字符串
        return ['Ethernet.localIP().toString()', Order.ATOMIC];
    });
};

export const STM32NetworkModule: BlockModule = {
    id: 'stm32.network',
    name: 'STM32 Network',
    init
};
