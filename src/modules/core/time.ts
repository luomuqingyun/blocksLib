/**
 * ============================================================
 * 时间模块 (Time Module)
 * ============================================================
 * 
 * 提供 Arduino 时间相关积木:
 * - delay(): 毫秒延时
 * - millis(): 运行时间 (毫秒)
 * - micros(): 运行时间 (微秒)
 * 
 * @file src/modules/core/time.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

import * as Blockly from 'blockly';
import { Order, registerBlock, arduinoGenerator } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册与 Arduino 时间控制和运行计时相关的积木。
 */
const init = () => {

    // =========================================================================
    // 毫秒延时 (Delay MS)
    // 阻塞式等待指定的毫秒数。
    // 对应的 Arduino API: `delay(ms)`
    // =========================================================================
    registerBlock('arduino_delay_ms', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIME_DELAY); // 延时
            this.appendValueInput("DELAY").setCheck("Number");
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIME_MS); // 毫秒
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(120); // 绿色系，代表流控
            this.setInputsInline(true);
            this.setTooltip(Blockly.Msg.ARD_TIME_DELAY_TOOLTIP);
        }
    }, (b: any) => {
        const delay = arduinoGenerator.valueToCode(b, 'DELAY', Order.NONE) || '1000';
        return `delay(${delay});\n`;
    });

    // =========================================================================
    // 获取运行毫秒数 (Millis)
    // 返回自程序启动以来的毫秒数 (unsigned long)。常用于非阻塞定时。
    // 对应的 Arduino API: `millis()`
    // =========================================================================
    registerBlock('arduino_millis', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIME_MILLIS);
            this.setOutput(true, "Number");
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_TIME_MILLIS_TOOLTIP);
        }
    }, () => ['millis()', Order.ATOMIC]);

    // =========================================================================
    // 获取运行微秒数 (Micros)
    // 返回自程序启动以来的微秒数。
    // 对应的 Arduino API: `micros()`
    // =========================================================================
    registerBlock('arduino_micros', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIME_MICROS);
            this.setOutput(true, "Number");
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_TIME_MICROS_TOOLTIP);
        }
    }, () => ['micros()', Order.ATOMIC]);
};

/**
 * 时间模块定义
 * 包含基础的延时控制与高精度时间读取功能。
 */
export const TimeModule: BlockModule = {
    id: 'core.time',
    name: 'Time Blocks',
    init
};