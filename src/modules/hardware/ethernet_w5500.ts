// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

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

        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('ethernet_lib', '#include <Ethernet.h>');
        arduinoGenerator.addVariable('eth_mac', `byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };`);

        arduinoGenerator.addSetup('ethernet_init_cs', `Ethernet.init(${cs});`);
        arduinoGenerator.addSetup('ethernet_begin', `
  if (Ethernet.begin(mac) == 0) {
    // Failed to configure Ethernet using DHCP
    // Check for hardware
    if (Ethernet.hardwareStatus() == EthernetNoHardware) {
      // No shield
    }
  }
`);
        return '';
    });

    registerBlock('ethernet_w5500_get_ip', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ETH_IP);
            this.setOutput(true, "String");
            this.setColour(210);
        }
    }, (block: any) => {
        // Ethernet.localIP() returns IPAddress object. String() conversion handles it.
        return [`String(Ethernet.localIP())`, Order.ATOMIC];
    });

};

export const EthernetW5500Module: BlockModule = {
    id: 'hardware.ethernet_w5500',
    name: 'Ethernet (W5500)',
    category: 'Communication',
    init
};
