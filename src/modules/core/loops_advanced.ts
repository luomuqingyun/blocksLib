/**
 * ============================================================
 * 高级循环模块 (Advanced Loops Module)
 * ============================================================
 * 
 * 提供高级循环控制积木:
 * - c_do_while: do...while 循环
 * - c_for_custom: 自定义 for 循环
 * - controls_flow_break: break 跳出
 * - controls_flow_continue: continue 继续
 * 
 * @file src/modules/core/loops_advanced.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册 C++ 风格的高级循环控制积木，补充基础循环模块的不足。
 */
const init = () => {

    // =========================================================================
    // 1. Do...While 循环
    // 与基础 while 循环不同，do...while 保证循环体至少执行一次。
    // =========================================================================
    registerBlock('c_do_while', {
        init: function () {
            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_LOOP_DO_WHILE); // 执行
            this.appendValueInput("CONDITION")
                .setCheck("Boolean")
                .appendField(Blockly.Msg.ARD_LOOP_WHILE) // 当...
                .setAlign(Blockly.inputs.Align.RIGHT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120); // 循环类积木统一使用绿色调
            this.setTooltip(Blockly.Msg.ARD_LOOP_DO_WHILE_TOOLTIP);
        }
    }, function (block: any) {
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        const condition = arduinoGenerator.valueToCode(block, 'CONDITION', Order.NONE) || 'false';
        return `do {\n${branch}} while (${condition});\n`;
    });

    // =========================================================================
    // 2. C 风格自定义 For 循环 (C-Style Flexible For Loop)
    // 允许用户自主定义控制三要素：初始化、循环条件、步进操作。
    // 结构：for (init; cond; step)
    // =========================================================================
    registerBlock('c_for_custom', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_LOOP_FOR_CUSTOM); // 高阶循环

            // Init: 通常放置变量声明积木或赋值积木
            this.appendStatementInput("INIT")
                .appendField(Blockly.Msg.ARD_LOOP_INIT); // 初始化

            // Cond: 决定循环是否继续的布尔表达式
            this.appendValueInput("COND")
                .setCheck("Boolean")
                .appendField(Blockly.Msg.ARD_LOOP_COND); // 条件

            // Step: 每一轮循环结束后执行的操作（通常是 i++）
            this.appendStatementInput("STEP")
                .appendField(Blockly.Msg.ARD_LOOP_STEP); // 步进

            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_LOOP_DO_WHILE); // 执行

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_LOOP_FOR_CUSTOM_TOOLTIP);
        }
    }, function (block: any) {
        let init = arduinoGenerator.statementToCode(block, 'INIT').trim();
        const cond = arduinoGenerator.valueToCode(block, 'COND', Order.NONE) || 'true';
        let step = arduinoGenerator.statementToCode(block, 'STEP').trim();
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        // 【关键逻辑】清理末尾的分号
        if (init.endsWith(';')) init = init.slice(0, -1);
        if (step.endsWith(';')) step = step.slice(0, -1);

        return `for (${init}; ${cond}; ${step}) {\n${branch}}\n`;
    });

    // =========================================================================
    // 3. Break (跳出循环)
    // =========================================================================
    registerBlock('controls_flow_break', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_LOOP_BREAK); // 跳出循环
            this.setPreviousStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_LOOP_BREAK_TOOLTIP);
        }
    }, function () {
        return 'break;\n';
    });

    // =========================================================================
    // 4. Continue (继续下一次循环)
    // =========================================================================
    registerBlock('controls_flow_continue', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_LOOP_CONTINUE); // 进入下一轮循环
            this.setPreviousStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_LOOP_CONTINUE_TOOLTIP);
        }
    }, function () {
        return 'continue;\n';
    });
};

/**
 * 高级循环模块定义
 */
export const LoopsAdvancedModule: BlockModule = {
    id: 'core.loops_advanced',
    name: 'Advanced Loops',
    init
};
