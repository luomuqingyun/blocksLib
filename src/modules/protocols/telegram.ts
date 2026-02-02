/**
 * ============================================================
 * Telegram 机器人模块 (Telegram Bot)
 * ============================================================
 * 
 * 提供 Telegram 聊天机器人积木:
 * - telegram_config: 初始化机器人 (Token)
 * - telegram_check: 检查新消息并处理
 * - telegram_send: 发送消息
 * - telegram_msg_text: 获取消息文本
 * 
 * 使用 UniversalTelegramBot.h 库。
 * 
 * @file src/modules/protocols/telegram.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // Telegram 机器人配置
    registerBlock('telegram_config', {
        init: function () {
            this.appendDummyInput()
                .appendField("Telegram 机器人初始化");
            this.appendValueInput("TOKEN")
                .setCheck("String")
                .appendField("机器人令牌 (Token)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_TELEGRAM_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const token = arduinoGenerator.valueToCode(block, 'TOKEN', Order.ATOMIC) || '"TOKEN"';

        // 包含加密网络、Telegram 客户端和 JSON 库
        arduinoGenerator.addInclude('wifi_client_secure', '#include <WiFiClientSecure.h>');
        arduinoGenerator.addInclude('telegram_lib', '#include <UniversalTelegramBot.h>');
        arduinoGenerator.addInclude('arduino_json', '#include <ArduinoJson.h>');

        // 定义安全客户端和机器人对象
        arduinoGenerator.addVariable('telegram_client', `WiFiClientSecure secured_client;`);
        arduinoGenerator.addVariable('telegram_bot', `UniversalTelegramBot bot(${token}, secured_client);`);

        // 设置安全客户端（跳过证书校验以简化连接）
        arduinoGenerator.addSetup('telegram_setup', `secured_client.setInsecure();`);

        return '';
    });

    // 检查是否有新的 Telegram 消息
    registerBlock('telegram_check', {
        init: function () {
            this.appendDummyInput()
                .appendField("检查 Telegram 新消息");
            this.appendStatementInput("DO")
                .appendField("对于每条新消息");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_TELEGRAM_CHECK_TOOLTIP);
        }
    }, (block: any) => {
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        // 生成轮询逻辑：获取更新 -> 循环处理消息内容
        return `
  int numNewMessages = bot.getUpdates(bot.last_message_received + 1);
  while(numNewMessages) {
      for (int i=0; i<numNewMessages; i++) {
        String msg_text = bot.messages[i].text;
        String msg_chat_id = bot.messages[i].chat_id;
        String msg_name = bot.messages[i].from_name;
        
        ${branch}
      }
      numNewMessages = bot.getUpdates(bot.last_message_received + 1);
  }
\n`;
    });

    // Quick getters for loop vars (optional, or just document variables)
    // 获取最后一条消息的文本
    registerBlock('telegram_msg_text', {
        init: function () {
            this.appendDummyInput().appendField("最新消息内容");
            this.setOutput(true, "String");
            this.setColour(210);
        }
    }, (block: any) => {
        return ['msg_text', Order.ATOMIC];
    });

    // 发送 Telegram 消息
    registerBlock('telegram_send', {
        init: function () {
            this.appendDummyInput()
                .appendField("发送 Telegram 消息");
            this.appendValueInput("CHAT_ID")
                .setCheck("String")
                .appendField("会话 ID");
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField("消息内容");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
        }
    }, (block: any) => {
        const id = arduinoGenerator.valueToCode(block, 'CHAT_ID', Order.ATOMIC) || '""';
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '"Hello"';
        // 向指定 Chat ID 发送文本消息
        return `bot.sendMessage(${id}, ${text}, "");\n`;
    });

};

export const TelegramModule: BlockModule = {
    id: 'protocols.telegram',
    name: 'Telegram Bot',
    init
};
