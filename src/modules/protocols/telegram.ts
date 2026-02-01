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

    registerBlock('telegram_config', {
        init: function () {
            this.appendDummyInput()
                .appendField("Telegram Bot Init");
            this.appendValueInput("TOKEN")
                .setCheck("String")
                .appendField("Bot Token");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_TELEGRAM_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const token = arduinoGenerator.valueToCode(block, 'TOKEN', Order.ATOMIC) || '"TOKEN"';

        arduinoGenerator.addInclude('wifi_client_secure', '#include <WiFiClientSecure.h>');
        arduinoGenerator.addInclude('telegram_lib', '#include <UniversalTelegramBot.h>');
        arduinoGenerator.addInclude('arduino_json', '#include <ArduinoJson.h>'); // Req by lib
        arduinoGenerator.addVariable('telegram_client', `WiFiClientSecure secured_client;`);
        // Setup secure client (skipping cert validation for simplicity, NOT SECURE for production but standard for hobby)
        arduinoGenerator.addSetup('telegram_setup', `secured_client.setInsecure();`);

        return '';
    });

    registerBlock('telegram_check', {
        init: function () {
            this.appendDummyInput()
                .appendField("Telegram Check Messages");
            this.appendStatementInput("DO")
                .appendField("For Every New Message (msg)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_TELEGRAM_CHECK_TOOLTIP);
        }
    }, (block: any) => {
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        // Polling logic
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
    registerBlock('telegram_msg_text', {
        init: function () { this.appendDummyInput().appendField("Last Message Text"); this.setOutput(true, "String"); this.setColour(210); }
    }, (block: any) => { return ['msg_text', Order.ATOMIC]; });

    registerBlock('telegram_send', {
        init: function () {
            this.appendDummyInput()
                .appendField("Telegram Send");
            this.appendValueInput("CHAT_ID")
                .setCheck("String")
                .appendField("Chat ID");
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField("Message");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
        }
    }, (block: any) => {
        const id = arduinoGenerator.valueToCode(block, 'CHAT_ID', Order.ATOMIC) || '""';
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '"Hello"';
        return `bot.sendMessage(${id}, ${text}, "");\n`;
    });

};

export const TelegramModule: BlockModule = {
    id: 'protocols.telegram',
    name: 'Telegram Bot',
    category: 'Communication', // or Cloud
    init
};
