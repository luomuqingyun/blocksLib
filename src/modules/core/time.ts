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
    /**
     * 程序延时 (Delay)
     * 阻塞式等待指定的毫秒数，期间微控制器除了中断服务程序外不执行任何指令。
     * 常用于简单的控制时序，但在严苛或多任务的场景下应尽量使用非阻塞的 millis()。
     * @category 时间与控制
     * @param {Number} DELAY 延时的毫秒数 (1000 毫秒 = 1 秒)
     */
    // =========================================================================
    registerBlock('arduino_delay_ms', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIME_DELAY); // 延时
            
            // 使用 connection 的 setShadowState 或在后续动态构建里追加默认数值块
            const valueInput = this.appendValueInput("DELAY").setCheck("Number");
            
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIME_MS); // 毫秒
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(120); // 绿色系，代表流控
            this.setInputsInline(true);
            this.setTooltip("暂停程序执行指定的毫秒数。1000 毫秒等于 1 秒。使用时请注意这会阻塞在此期间所有的普通引脚响应。");
            
            // 稍后初始化附加一个默认数字 shadow
            if (!this.workspace.isFlyout) {
                 setTimeout(() => {
                     if (valueInput.connection && !valueInput.connection.isConnected()) {
                         const numBlock = this.workspace.newBlock('math_number');
                         numBlock.setFieldValue('1000', 'NUM');
                         numBlock.setShadow(true);
                         numBlock.initSvg();
                         numBlock.render();
                         valueInput.connection.connect(numBlock.outputConnection);
                     }
                 }, 50);
            }
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