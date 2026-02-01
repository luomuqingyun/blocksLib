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


const init = () => {

    registerBlock('rtos_task_create', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RTOS_CREATE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NAME)
                .appendField(new Blockly.FieldTextInput("Task1"), "NAME");
            this.appendValueInput("STACK")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_RTOS_STACK);
            this.appendValueInput("PRIORITY")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_RTOS_PRIORITY);
            this.appendDummyInput()
                .appendField("Code");
            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_SYS_LOOP);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_RTOS_TASK_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        const stack = arduinoGenerator.valueToCode(block, 'STACK', Order.ATOMIC) || '2048';
        const priority = arduinoGenerator.valueToCode(block, 'PRIORITY', Order.ATOMIC) || '1';
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        const funcName = `task_${name}_func`;

        // Define task function
        // Note: FreeRTOS tasks must have an infinite loop usually
        arduinoGenerator.functions_[funcName] = `
void ${funcName}(void *parameter) {
  for(;;) {
${branch}
    // Must yield in non-preemptive environments or for safety
    // vTaskDelay(10 / portTICK_PERIOD_MS); // Auto yield is safer?
    vTaskDelay(1); 
  }
}`;

        // Create task in setup
        arduinoGenerator.addSetup(`rtos_task_${name}`, `xTaskCreate(${funcName}, "${name}", ${stack}, NULL, ${priority}, NULL);`);

        return '';
    });

    registerBlock('rtos_delay', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RTOS_DELAY);
            this.appendValueInput("MS")
                .setCheck("Number");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_RTOS_DELAY_TOOLTIP);
        }
    }, (block: any) => {
        const ms = arduinoGenerator.valueToCode(block, 'MS', Order.ATOMIC) || '1000';
        return `vTaskDelay(${ms} / portTICK_PERIOD_MS);\n`;
    });

};

export const RTOSModule: BlockModule = {
    id: 'core.rtos',
    name: 'RTOS (Multitasking)',
    category: 'Control',
    init
};
