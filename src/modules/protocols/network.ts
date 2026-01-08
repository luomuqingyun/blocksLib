import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // Ethernet (Ethernet.h)
    // =========================================================================

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

        arduinoGenerator.addInclude('spi_lib', '#include <SPI.h>');
        arduinoGenerator.addInclude('ethernet_lib', '#include <Ethernet.h>');
        arduinoGenerator.addVariable('mac_addr', `byte mac[] = ${mac};`);
        arduinoGenerator.addSetup('ethernet_begin', 'if (Ethernet.begin(mac) == 0) {\n    // Failed to configure Ethernet using DHCP\n    while(true);\n  }');

        return '';
    });

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
        if (family === 'esp32') return [`WiFi.localIP().toString()`, Order.ATOMIC];
        return [`Ethernet.localIP().toString()`, Order.ATOMIC];
    });

    // =========================================================================
    // NTP Time (NTPClient)
    // =========================================================================

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
        const offset = arduinoGenerator.valueToCode(block, 'OFFSET', Order.ATOMIC) || '0';

        arduinoGenerator.addInclude('udp_lib', '#include <WiFiUdp.h>');
        arduinoGenerator.addInclude('ntp_lib', '#include <NTPClient.h>');
        arduinoGenerator.addVariable('ntp_udp', `WiFiUDP ntpUDP;`);
        arduinoGenerator.addVariable('ntp_client', `NTPClient timeClient(ntpUDP, "pool.ntp.org");`);
        arduinoGenerator.addSetup('ntp_begin', `timeClient.begin();\n  timeClient.setTimeOffset(${offset});`);

        // Update in loop ? Or manually update? Manual is safer for blocks
        // automatic update every 60s is default
        arduinoGenerator.addLoop('ntp_update', `timeClient.update();`);

        return '';
    });

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

    registerBlock('net_ntp_get_epoch', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_NTP_GET_EPOCH);
            this.setOutput(true, "Number");
            this.setColour(210);
        }
    }, (block: any) => {
        return ['timeClient.getEpochTime()', Order.ATOMIC];
    });

    // =========================================================================
    // Wi-Fi Generic (WiFi.h / ESP8266WiFi.h)
    // =========================================================================
    // Note: ESP32/ESP8266 specific modules might exist, but this is a generic wrapper ideal for common code.

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
            this.setTooltip(Blockly.Msg.ARD_NET_WIFI_CONNECT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const ssid = arduinoGenerator.valueToCode(block, 'SSID', Order.ATOMIC) || '""';
        const pass = arduinoGenerator.valueToCode(block, 'PASS', Order.ATOMIC) || '""';

        // This is generic; user needs to ensure board selected has WiFi support (ESP32/ESP8266/MKR1010)
        // We include generic WiFi.h which works for most modern Arduino cores.
        arduinoGenerator.addInclude('wifi_lib', '#include <WiFi.h>');

        arduinoGenerator.addSetup('wifi_begin', `
  WiFi.begin(${ssid}, ${pass});
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }`);

        return '';
    });



    registerBlock('net_wifi_softap', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_WIFI_SOFTAP);
            this.appendValueInput("SSID")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NET_WIFI_SSID);
            this.appendValueInput("PASS")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NET_WIFI_PASS);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_NET_WIFI_SOFTAP_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const ssid = arduinoGenerator.valueToCode(block, 'SSID', Order.ATOMIC) || '"MyESP32"';
        const pass = arduinoGenerator.valueToCode(block, 'PASS', Order.ATOMIC) || '"12345678"';

        arduinoGenerator.addInclude('wifi_lib', '#include <WiFi.h>');
        arduinoGenerator.addSetup('wifi_ap', `WiFi.softAP(${ssid}, ${pass});`);

        return '';
    });

    registerBlock('net_wifi_status', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_WIFI_STATUS);
            this.setOutput(true, "Boolean");
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_NET_WIFI_STATUS_TOOLTIP);
        }
    }, (block: any) => {
        return ['(WiFi.status() == WL_CONNECTED)', Order.ATOMIC];
    });

    registerBlock('net_http_get', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_HTTP_GET);
            this.appendValueInput("URL")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NET_HTTP_URL);
            this.setOutput(true, "String");
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_NET_HTTP_GET_TOOLTIP);
        }
    }, (block: any) => {
        const url = arduinoGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '"http://example.com"';
        const family = arduinoGenerator.getFamily();

        if (family === 'esp32') {
            arduinoGenerator.addInclude('http_client_lib', '#include <HTTPClient.h>\n#include <WiFi.h>');
        } else if (family === 'arduino') {
            // Assume ESP8266 or similar if user is using HTTP on "Arduino" family usually means ESP8266 in this context
            // or we need a more generic library like ArduinoHttpClient
            arduinoGenerator.addInclude('http_client_lib', '#include <ESP8266HTTPClient.h>\n#include <WiFiClient.h>');
        }

        const funcName = 'http_get_request';
        arduinoGenerator.addFunction(funcName, `
String ${funcName}(String url) {
  WiFiClient client;
  HTTPClient http;
  http.begin(client, url);
  int httpCode = http.GET();
  String payload = "{}";
  if (httpCode > 0) {
    payload = http.getString();
  }
  http.end();
  return payload;
}`);
        return [`${funcName}(${url})`, Order.ATOMIC];
    });

    registerBlock('net_http_post', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_NET_HTTP_POST);
            this.appendValueInput("URL")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NET_HTTP_URL);
            this.appendValueInput("DATA")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NET_HTTP_DATA);
            this.appendValueInput("TYPE")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_NET_HTTP_TYPE);
            this.setOutput(true, "String");
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_NET_HTTP_POST_TOOLTIP);
        }
    }, (block: any) => {
        const url = arduinoGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '"http://example.com"';
        const data = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';
        const type = arduinoGenerator.valueToCode(block, 'TYPE', Order.ATOMIC) || '"application/json"';
        const family = arduinoGenerator.getFamily();

        if (family === 'esp32') {
            arduinoGenerator.addInclude('http_client_lib', '#include <HTTPClient.h>\n#include <WiFi.h>');
        } else {
            arduinoGenerator.addInclude('http_client_lib', '#include <ESP8266HTTPClient.h>\n#include <WiFiClient.h>');
        }

        const funcName = 'http_post_request';
        arduinoGenerator.addFunction(funcName, `
String ${funcName}(String url, String data, String contentType) {
  WiFiClient client;
  HTTPClient http;
  http.begin(client, url);
  http.addHeader("Content-Type", contentType);
  int httpCode = http.POST(data);
  String payload = "{}";
  if (httpCode > 0) {
    payload = http.getString();
  }
  http.end();
  return payload;
}`);
        return [`${funcName}(${url}, ${data}, ${type})`, Order.ATOMIC];
    });

};

export const NetworkModule: BlockModule = {
    id: 'protocols.network',
    name: 'Network (Ethernet/WiFi)',
    category: 'Network',
    init
};
