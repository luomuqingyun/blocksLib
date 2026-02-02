/**
 * ============================================================
 * 软件定时器模块 (Software Timers Module)
 * ============================================================
 * 
 * 提供非阻塞定时器积木:
 * - timer_every: 每隔 N 毫秒执行
 * - timer_once: 启动后 N 毫秒执行一次
 * 
 * 使用 millis() 实现，不阻塞主循环。
 * 
 * @file src/modules/core/timer.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册基于 millis() 的非阻塞软件定时器积木。
 */
const init = () => {

    // =========================================================================
    // 循环定时执行 (Timer Every)
    // 实现原理：利用 C++ 函数内部的 static 变量记录上一次执行时间，
    // 每次进入循环检查时间差，从而实现不阻塞整个程序的定时触发。
    // =========================================================================
    registerBlock('timer_every', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TIMER_EVERY); // 每隔
            this.appendValueInput("MS")
                .setCheck("Number");
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIMER_MS_DO); // 毫秒执行一次：
            this.appendStatementInput("DO")
                .setCheck(null);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120); // 绿色系，逻辑流控制
            this.setTooltip(Blockly.Msg.ARD_TIMER_TOOLTIP);
        }
    }, (block: any) => {
        const ms = arduinoGenerator.valueToCode(block, 'MS', Order.ATOMIC) || '1000';
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        // 生成基于积木唯一 ID 的变量名，防止代码中多个定时器冲突
        const id = block.id.replace(/[^a-zA-Z0-9]/g, '');

        // 使用 static 关键字确保变量在循环中持有状态，而不会被重复初始化
        return `
  static unsigned long last_${id} = 0;
  if (millis() - last_${id} > ${ms}) {
      last_${id} = millis();
      ${branch}
  }
\n`;
    });

    // =========================================================================
    // 延时单次执行 (Timer Once)
    // 实现原理：使用 static bool 标记位追踪是否已经完成触发。
    // =========================================================================
    registerBlock('timer_once', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TIMER_AFTER); // 在程序启动
            this.appendValueInput("MS")
                .setCheck("Number");
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIMER_ONCE); // 毫秒后执行一次：
            this.appendStatementInput("DO")
                .setCheck(null);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
        }
    }, (block: any) => {
        const ms = arduinoGenerator.valueToCode(block, 'MS', Order.ATOMIC) || '1000';
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        const id = block.id.replace(/[^a-zA-Z0-9]/g, '');

        return `
  static bool ran_${id} = false;
  if (!ran_${id} && millis() > ${ms}) {
      ran_${id} = true;
      ${branch}
  }
\n`;
    });

};

/**
 * 软件定时器模块定义
 * 相比 delay()，非阻塞定时器允许系统同时处理多个任务（如读取传感器、刷新屏幕）。
 */
export const TimerUtilsModule: BlockModule = {
    id: 'core.timer_utils',
    name: 'Software Timers',
    init
};
