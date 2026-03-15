/**
 * ============================================================
 * 网络模块 (Network Module - Ethernet/WiFi)
 * ============================================================
 * 
 * 提供网络通信相关积木:
 * - Ethernet: DHCP 初始化、获取 IP
 * - WiFi: 连接 AP、开启 SoftAP、状态检测
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 以太网 (Ethernet) DHCP 初始化
    registerBlock('net_ethernet_begin', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_ETHERNET_BEGIN);
            this.appendValueInput("MAC")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NET_MAC_ADDR);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_NET_ETHERNET_BEGIN_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const mac = arduinoGenerator.valueToCode(block, 'MAC', Order.ATOMIC) || '{0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED}';

        // 包含 SPI 和 Ethernet 库
        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('ethernet_lib', '#include <Ethernet.h>');
        // 定义 MAC 地址变量
        arduinoGenerator.addVariable('mac_addr', `byte mac[] = ${mac};`);
        // 在 setup 中尝试通过 DHCP 获取 IP，失败则死循环
        arduinoGenerator.addSetup('ethernet_begin', 'if (Ethernet.begin(mac) == 0) {\n    // DHCP 获取失败\n    while(true);\n  }');

        return '';
    });

    // 获取本地 IP 地址
    /**
     * 获取当前设备的本地 IP 地址。
     * @return {String} 本地 IP 地址字符串
     */
    registerBlock('net_ethernet_local_ip', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_LOCAL_IP);
            this.setOutput(true, "String");
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_NET_LOCAL_IP_TOOLTIP);
        }
    }, (block: any) => {
        const family = arduinoGenerator.getFamily();
        // 根据控制器家族（ESP32 或普通 Arduino/Ethernet）返回 IP 地址字符串
        if (family === 'esp32') return [`WiFi.localIP().toString()`, Order.ATOMIC];
        return [`Ethernet.localIP().toString()`, Order.ATOMIC];
    });

    // NTP 网络对时初始化
    /**
     * 初始化 NTP 客户端，用于网络对时。
     * @param {Number} OFFSET 时区偏移量 (秒，例如北京时间为 28800)
     */
    registerBlock('net_ntp_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_NTP_INIT);
            this.appendValueInput("OFFSET")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_NET_NTP_OFFSET);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_NET_NTP_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const offset = arduinoGenerator.valueToCode(block, 'OFFSET', Order.ATOMIC) || '28800';

        // 包含 UDP 和 NTPClient 库
        arduinoGenerator.addInclude('udp_lib', '#include <WiFiUdp.h>');
        arduinoGenerator.addInclude('ntp_lib', '#include <NTPClient.h>');
        // 定义 UDP 连接和 NTP 客户端
        arduinoGenerator.addVariable('ntp_udp', `WiFiUDP ntpUDP;`);
        arduinoGenerator.addVariable('ntp_client', `NTPClient timeClient(ntpUDP, "pool.ntp.org");`);
        // 在 setup 中开启服务并设置时区偏移（北京时间默认为 28800 秒）
        arduinoGenerator.addSetup('ntp_begin', `timeClient.begin();\n  timeClient.setTimeOffset(${offset});`);
        // 在 loop 中定期更新时间
        arduinoGenerator.addLoop('ntp_update', `timeClient.update();`);

        return '';
    });

    /**
     * 获取 NTP 服务器返回的当前格式化时间
     * @return {String} 只有时间的字符串 (如 "12:34:56")
     */
    registerBlock('net_ntp_get_time', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_NTP_GET_TIME);
            this.setOutput(true, "String");
            this.setColour(210);
        }
    }, (block: any) => {
        return ['timeClient.getFormattedTime()', Order.ATOMIC];
    });

    // WiFi 连接 (通用方式)
    /**
     * 连接到指定的 WiFi 接入点 (AP)。
     * @param {String} SSID WiFi 网络的名称
     * @param {String} PASS WiFi 网络的密码
     */
    registerBlock('net_wifi_connect_generic', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_WIFI_CONNECT);
            this.appendValueInput("SSID")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NET_WIFI_SSID);
            this.appendValueInput("PASS")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NET_WIFI_PASS);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const ssid = arduinoGenerator.valueToCode(block, 'SSID', Order.ATOMIC) || '""';
        const pass = arduinoGenerator.valueToCode(block, 'PASS', Order.ATOMIC) || '""';

        // 包含 ESP32 WiFi 库
        arduinoGenerator.addInclude('wifi_lib', '#include <WiFi.h>');
        // 在 setup 中开始连接，直到连接成功才继续
        arduinoGenerator.addSetup('wifi_begin', `
  WiFi.begin(${ssid}, ${pass});
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }`);

        return '';
    });

    /**
     * 检查 WiFi 是否已连接
     * @return {Boolean} 是否连接成功
     */
    registerBlock('net_wifi_status', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_WIFI_STATUS);
            this.setOutput(true, "Boolean");
            this.setColour(210);
        }
    }, (block: any) => {
        return ['(WiFi.status() == WL_CONNECTED)', Order.ATOMIC];
    });

};

export const NetworkModule: BlockModule = {
    id: 'protocols.network',
    name: 'Network (Ethernet/WiFi)',
    init
};
