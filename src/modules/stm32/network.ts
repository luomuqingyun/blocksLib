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
    // Ethernet Init (W5500 default)
    // ------------------------------------------------------------------
    registerBlock('stm32_ethernet_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_ETH_INIT);
            this.appendDummyInput()
                .appendField("MAC")
                .appendField(new Blockly.FieldTextInput("DE:AD:BE:EF:FE:ED"), "MAC");
            this.appendDummyInput()
                .appendField("CS Pin")
                .appendField(new Blockly.FieldDropdown([
                    ["PA4 (SPI1)", "PA4"],
                    ["PB12 (SPI2)", "PB12"],
                    ["Default", "10"] // Arduino Default
                ]), "CS");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(150);
            this.setTooltip("Initialize Ethernet (W5500)");
        }
    }, function (block: any) {
        const mac = block.getFieldValue('MAC');
        const cs = block.getFieldValue('CS');

        // Parse MAC to bytes
        const macBytes = mac.split(':').map((h: string) => '0x' + h).join(', ');

        arduinoGenerator.addInclude('SPI', '#include <SPI.h>');
        arduinoGenerator.addInclude('Ethernet', '#include <Ethernet.h>');

        arduinoGenerator.addVariable('mac_addr', `byte mac[] = { ${macBytes} };`);

        if (cs !== '10') {
            arduinoGenerator.addSetup('eth_cs', `Ethernet.init(${cs});`);
        }
        arduinoGenerator.addSetup('eth_begin', `if(Ethernet.begin(mac) == 0) { Serial.println("Failed to configure Ethernet using DHCP"); }`);

        return '';
    });

    // ------------------------------------------------------------------
    // Ethernet Get IP
    // ------------------------------------------------------------------
    registerBlock('stm32_ethernet_ip', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_NET_ETH_IP);
            this.setOutput(true, "String");
            this.setColour(150);
        }
    }, function () {
        return ['Ethernet.localIP().toString()', Order.ATOMIC];
    });
};

export const STM32NetworkModule: BlockModule = {
    id: 'stm32.network',
    name: 'STM32 Network',
    category: 'Communication',
    init
};
