/**
 * ============================================================
 * ESP32 专用模块 (ESP32 Hardware Module)
 * ============================================================
 * 
 * 提供 ESP32 特有功能积木:
 * - esp32_wifi_connect: WiFi 连接
 * - esp32_deep_sleep: 深度睡眠
 * - esp32_hall_read: 内置霍尔传感器
 * - esp32_touch_read: 触摸引脚 (T0-T9)
 * 
 * @file src/modules/hardware/esp32.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    /**
     * 连接到指定的 WiFi 网络 (ESP32)
     * @param {String} SSID 网络名称
     * @param {String} PASSWORD 网络密码
     */
    registerBlock('esp32_wifi_connect', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESP32_WIFI_CONN);
            this.appendValueInput("SSID")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_ESP32_SSID);
            this.appendValueInput("PASSWORD")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_ESP32_PASS);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_ESP32_WIFI_CONN_TOOLTIP);
            this.setHelpUrl("");
        }
    }, function (block: any) {
        const ssid = arduinoGenerator.valueToCode(block, 'SSID', Order.ATOMIC) || '""';
        const password = arduinoGenerator.valueToCode(block, 'PASSWORD', Order.ATOMIC) || '""';

        // 包含乐鑫官方 WiFi 库
        arduinoGenerator.addInclude('wifi_include', '#include <WiFi.h>');

        // 生成阻塞式连接代码，直到连接成功才继续执行
        return `
WiFi.begin(${ssid}, ${password});
while (WiFi.status() != WL_CONNECTED) {
  delay(500);
}
`;
    });

    /**
     * ESP32 进入深度睡眠 (Deep Sleep)
     * @param {Number} TIME 睡眠时长 (微秒 us)
     */
    registerBlock('esp32_deep_sleep', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESP32_SLEEP_US);
            this.appendValueInput("TIME")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ESP_TIME_US);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_ESP32_SLEEP_TOOLTIP);
        }
    }, (block: any) => {
        const time = arduinoGenerator.valueToCode(block, 'TIME', Order.ATOMIC) || '1000000';
        // 调用底层 API 进入深度睡眠，唤醒后程序将从 setup 重新开始
        return `esp_deep_sleep(${time}); \n`;
    });

    /**
     * 读取 ESP32 内置霍尔传感器 (Hall Sensor)
     * @return {Number} 霍尔传感强度值
     */
    registerBlock('esp32_hall_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESP32_HALL);
            this.setOutput(true, "Number");
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_ESP32_HALL_TOOLTIP);
        }
    }, (block: any) => {
        return [`hallRead()`, Order.ATOMIC];
    });

    /**
     * 读取 ESP32 电容式触摸引脚 (Touch Pin)
     * @param {String} PIN 触摸通道 (T0-T9)
     * @return {Number} 触摸检测值
     */
    registerBlock('esp32_touch_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESP32_TOUCH);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESP32_TOUCH_PIN)
                .appendField(new Blockly.FieldDropdown([
                    ["T0 (GPIO 4)", "T0"],
                    ["T1 (GPIO 0)", "T1"],
                    ["T2 (GPIO 2)", "T2"],
                    ["T3 (GPIO 15)", "T3"],
                    ["T4 (GPIO 13)", "T4"],
                    ["T5 (GPIO 12)", "T5"],
                    ["T6 (GPIO 14)", "T6"],
                    ["T7 (GPIO 27)", "T7"],
                    ["T8 (GPIO 33)", "T8"],
                    ["T9 (GPIO 32)", "T9"]
                ]), "PIN");
            this.setOutput(true, "Number");
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_ESP32_TOUCH_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        // 使用 ESP32 SDK 内置的 touchRead 函数读取原始值
        return [`touchRead(${pin})`, Order.ATOMIC];
    });

};

/**
 * ESP32 硬件特性模块
 * 封装了 ESP32 芯片特有的硬件功能，如霍尔传感器读取、内置电容触摸检测等。
 */
export const ESP32Module: BlockModule = {
    id: 'hardware.esp32',
    name: 'ESP32 Hardware',
    init
};
