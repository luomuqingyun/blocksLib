/**
 * ============================================================
 * ESP 工具模块 (ESP Utilities)
 * ============================================================
 * 
 * 提供 ESP8266/ESP32 系统工具积木:
 * - esp_deep_sleep: 深度睡眠
 * - esp_restart: 重启
 * - esp_yield: 让出 CPU
 * - Ticker: 定时器中断 (attach/detach)
 * 
 * @file src/modules/hardware/esp_utils.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // ESP Specifics
    // =========================================================================

    /**
     * 进入深度睡眠 (Deep Sleep)
     * @param {Number} TIME 睡眠时长 (微秒 us)
     */
    registerBlock('esp_deep_sleep', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESP_SLEEP);
            this.appendValueInput("TIME")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ESP_TIME_US);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_ESP_SLEEP_TOOLTIP);
        }
    }, (block: any) => {
        const time = arduinoGenerator.valueToCode(block, 'TIME', Order.ATOMIC) || '0';
        return `ESP.deepSleep(${time});\n`;
    });

    /**
     * 重启 ESP 芯片
     */
    registerBlock('esp_restart', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESP_RESTART);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_ESP_RESTART_TOOLTIP);
        }
    }, (block: any) => {
        return `ESP.restart();\n`;
    });

    /**
     * 让出 CPU 时间 (Yield) 给系统后台任务 (如 WiFi/TCP 栈)
     */
    registerBlock('esp_yield', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ESP_YIELD);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_ESP_YIELD_TOOLTIP);
        }
    }, (block: any) => {
        return `yield();\n`;
    });


    // =========================================================================
    // Ticker (Timer Interrupts)
    // =========================================================================

    // 绑定 Ticker 定时器中断
    /**
     * 配置并启动 Ticker 定时器中断
     * @param {String} NAME 定时器实例名称
     * @param {Number} INTERVAL 时间间隔 (秒)
     */
    registerBlock('esp_ticker_attach', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TICKER_ATTACH);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NAME)
                .appendField(new Blockly.FieldTextInput("timer1"), "NAME");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TICKER_INTERVAL)
                .appendField(new Blockly.FieldNumber(1.0), "INTERVAL");
            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_TICKER_DO);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_TICKER_ATTACH_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        const interval = block.getFieldValue('INTERVAL');
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        // Ticker 需要一个独立的回调函数
        const funcName = `ticker_callback_${name}`;

        // 包含 Ticker 库
        arduinoGenerator.addInclude('ticker_lib', '#include <Ticker.h>');
        // 定义全局 Ticker 对象
        arduinoGenerator.addVariable(`ticker_obj_${name}`, `Ticker ${name};`);

        // 生成回调函数：包含用户在积木块中定义的逻辑
        arduinoGenerator.functions_[funcName] = `
void ${funcName}() {
${branch}
}`;

        // 在 setup 中将回调函数以指定间隔绑定到 Ticker
        arduinoGenerator.addSetup(`ticker_attach_${name}`, `${name}.attach(${interval}, ${funcName});`);
        return '';
    });

    // 停止并分离指定的定时器任务
    /**
     * 停止并分离指定的 Ticker 定时器
     * @param {String} NAME 要分离的定时器实例名称
     */
    registerBlock('esp_ticker_detach', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TICKER_DETACH);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NAME)
                .appendField(new Blockly.FieldTextInput("timer1"), "NAME");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_TICKER_DETACH_TOOLTIP);
        }
    }, (block: any) => {
        const name = block.getFieldValue('NAME');
        // 调用 detach() 停止该 Ticker 实例的周期性回调
        return `${name}.detach();\n`;
    });

};

/**
 * ESP 实用工具模块
 * 提供重启、休眠、系统让步以及 Ticker 定时中断等硬件相关功能。
 */
export const ESPUtilsModule: BlockModule = {
    id: 'hardware.esp_utils',
    name: 'ESP Utilities',
    init
};
