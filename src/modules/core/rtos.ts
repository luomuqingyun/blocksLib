/**
 * ============================================================
 * RTOS 多任务模块 (RTOS Multitasking Module)
 * ============================================================
 * 
 * 提供 FreeRTOS 多任务相关积木:
 * - rtos_task_create: 创建任务 (含优先级、栈大小、循环体)
 * - rtos_delay: 任务延时 (vTaskDelay)
 * 
 * 适用于 ESP32 等内置 FreeRTOS 的平台。
 * 
 * @file src/modules/core/rtos.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册与实时操作系统 (RTOS) 多任务相关的积木块。
 * 主要针对 ESP32 (基于 FreeRTOS) 平台。
 */
const init = () => {

    // =========================================================================
    // 1. 创建任务 (Task Create)
    // 允许用户创建一个独立于 Loop 运行的并行线程。
    // =========================================================================
    registerBlock('rtos_task_create', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RTOS_CREATE); // 创建多任务
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NAME)
                .appendField(new Blockly.FieldTextInput("Task1"), "NAME"); // 任务名称
            this.appendValueInput("STACK")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_RTOS_STACK); // 栈深度 (Bytes)
            this.appendValueInput("PRIORITY")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_RTOS_PRIORITY); // 优先级 (数值越高优先级越高)
            this.appendDummyInput()
                .appendField("代码");
            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_SYS_LOOP); // 循环体
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290); // 属于控制类任务，使用砖红色调
            this.setTooltip(Blockly.Msg.ARD_RTOS_TASK_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        const stack = arduinoGenerator.valueToCode(block, 'STACK', Order.ATOMIC) || '2048';
        const priority = arduinoGenerator.valueToCode(block, 'PRIORITY', Order.ATOMIC) || '1';
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        const funcName = `task_${name}_func`;

        // 【生成的 C++ 代码逻辑】
        // FreeRTOS 任务函数必须是一个死循环，否则任务执行完一次后会崩溃退出。
        arduinoGenerator.functions_[funcName] = `
/** 任务主函数: ${name} */
void ${funcName}(void *parameter) {
  for(;;) {
${branch}
    // 【关键】强制让出 CPU 所有权 (Yield)，防止当前任务霸占所有算力，
    // 导致其他低优先级任务或底层 WiFi 系统无法运行 (Watchdog Timeout)。
    vTaskDelay(1); 
  }
}`;

        // 在 setup() 中动态创建任务。
        // 参数依次为：函数指针、任务名字符串、栈大小、参数、优先级、任务句柄。
        arduinoGenerator.addSetup(`rtos_task_${name}`, `xTaskCreate(${funcName}, "${name}", ${stack}, NULL, ${priority}, NULL);`);

        return '';
    });

    // =========================================================================
    // 2. 任务延时 (Task Delay)
    // 专门用于 RTOS 任务内部的非阻塞延时。
    // =========================================================================
    registerBlock('rtos_delay', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RTOS_DELAY); // 任务专属延时 (毫秒)
            this.appendValueInput("MS")
                .setCheck("Number");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_RTOS_DELAY_TOOLTIP);
        }
    }, (block: any) => {
        const ms = arduinoGenerator.valueToCode(block, 'MS', Order.ATOMIC) || '1000';
        // 使用该函数会将任务置于“阻塞状态”，让出 CPU 供其他任务使用，直到时间到达。
        return `vTaskDelay(${ms} / portTICK_PERIOD_MS);\n`;
    });

};

/**
 * RTOS 多任务模块定义
 * 旨在通过 FreeRTOS 框架发挥 ESP32 的双核与并发处理能力。
 */
export const RTOSModule: BlockModule = {
    id: 'core.rtos',
    name: 'RTOS (Multitasking)',
    init
};
