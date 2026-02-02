/**
 * ============================================================
 * Blynk IoT 平台模块 (Blynk Cloud)
 * ============================================================
 * 
 * 提供 Blynk 物联网平台积木:
 * - blynk_setup_wifi: WiFi 连接初始化
 * - blynk_write: 写入虚拟引脚
 * - blynk_notify: 发送推送通知
 * - blynk_email: 发送邮件
 * - blynk_connected: 检查连接状态
 * 
 * 使用 BlynkSimpleEsp32.h 库。
 * 
 * @file src/modules/protocols/blynk.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // Blynk IoT (BlynkSimpleEsp8266.h / Generic)
    // =========================================================================
    // Clean room strategy: Generic Blynk setup assuming WiFi usage (most common).

    // Blynk WiFi 连接初始化
    registerBlock('blynk_setup_wifi', {
        init: function () {
            this.appendDummyInput()
                .appendField("Blynk 初始化 (WiFi)");
            this.appendValueInput("AUTH")
                .setCheck("String")
                .appendField("授权令牌 (Auth)");
            this.appendValueInput("SSID")
                .setCheck("String")
                .appendField("WiFi SSID");
            this.appendValueInput("PASS")
                .setCheck("String")
                .appendField("WiFi 密码");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLYNK_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const auth = arduinoGenerator.valueToCode(block, 'AUTH', Order.ATOMIC) || '""';
        const ssid = arduinoGenerator.valueToCode(block, 'SSID', Order.ATOMIC) || '""';
        const pass = arduinoGenerator.valueToCode(block, 'PASS', Order.ATOMIC) || '""';

        // 包含 ESP32 的 Blynk 库
        arduinoGenerator.addInclude('blynk_lib', '#include <BlynkSimpleEsp32.h>');
        // 定义认证和网络凭据变量
        arduinoGenerator.addVariable('blynk_auth', `char auth[] = ${auth};`);
        arduinoGenerator.addVariable('blynk_wifi', `char blynk_ssid[] = ${ssid};\nchar blynk_pass[] = ${pass};`);

        // 在 setup 中开启连接
        arduinoGenerator.addSetup('blynk_begin', `Blynk.begin(auth, blynk_ssid, blynk_pass);`);
        // 在 loop 中持续运行 Blynk 任务
        arduinoGenerator.addLoop('blynk_run', 'Blynk.run();');

        return '';
    });

    // 向虚拟引脚写入数据
    registerBlock('blynk_write', {
        init: function () {
            this.appendDummyInput()
                .appendField("Blynk 写入虚拟引脚");
            this.appendDummyInput()
                .appendField("引脚 V")
                .appendField(new Blockly.FieldTextInput("1"), "PIN");
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField("数值");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLYNK_WRITE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        return `Blynk.virtualWrite(V${pin}, ${val});\n`;
    });

    // 发送推送通知
    registerBlock('blynk_notify', {
        init: function () {
            this.appendDummyInput()
                .appendField("Blynk 推送通知");
            this.appendValueInput("MSG")
                .setCheck("String")
                .appendField("消息");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLYNK_NOTIFY_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const msg = arduinoGenerator.valueToCode(block, 'MSG', Order.ATOMIC) || '"Notification"';
        return `Blynk.notify(${msg});\n`;
    });

    // 发送邮件通知
    registerBlock('blynk_email', {
        init: function () {
            this.appendDummyInput()
                .appendField("Blynk 发送邮件");
            this.appendValueInput("ADDR")
                .setCheck("String")
                .appendField("收件人");
            this.appendValueInput("SUBJ")
                .setCheck("String")
                .appendField("主题");
            this.appendValueInput("BODY")
                .setCheck("String")
                .appendField("正文");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLYNK_EMAIL_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const addr = arduinoGenerator.valueToCode(block, 'ADDR', Order.ATOMIC) || '"email@example.com"';
        const subj = arduinoGenerator.valueToCode(block, 'SUBJ', Order.ATOMIC) || '"Subject"';
        const body = arduinoGenerator.valueToCode(block, 'BODY', Order.ATOMIC) || '"Body"';
        return `Blynk.email(${addr}, ${subj}, ${body});\n`;
    });

    // 检查与 Blynk 云端的连接状态
    registerBlock('blynk_connected', {
        init: function () {
            this.appendDummyInput()
                .appendField("Blynk 已连接？");
            this.setOutput(true, "Boolean");
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLYNK_CONN_TOOLTIP);
        }
    }, (block: any) => {
        return ['Blynk.connected()', Order.ATOMIC];
    });

    // Read Virtual Pin (Requires BLYNK_WRITE callback mechanism)
    // For simplicity in blocks, we currently omit complex callback generation 
    // or we implement a listener block structure if requested.
    // Clean room decision: Start with Write as it's simplest and most common.

};

export const BlynkModule: BlockModule = {
    id: 'protocols.blynk',
    name: 'Blynk IoT',
    init
};
