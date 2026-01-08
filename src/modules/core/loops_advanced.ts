// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // 1. Do...While 循环
    registerBlock('c_do_while', {
        init: function () {
            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_LOOP_DO_WHILE);
            this.appendValueInput("CONDITION")
                .setCheck("Boolean")
                .appendField(Blockly.Msg.ARD_LOOP_WHILE)
                .setAlign(Blockly.inputs.Align.RIGHT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_LOOP_DO_WHILE_TOOLTIP);
        }
    }, function (block: any) {
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        const condition = arduinoGenerator.valueToCode(block, 'CONDITION', Order.NONE) || 'false';
        return `do {\n${branch}} while (${condition});\n`;
    });

    // 2. C-Style Flexible For Loop: for (init; cond; step)
    registerBlock('c_for_custom', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_LOOP_FOR_CUSTOM);

            // Init: 通常是变量声明或赋值
            this.appendStatementInput("INIT")
                .appendField(Blockly.Msg.ARD_LOOP_INIT);

            // Cond: 布尔表达式
            this.appendValueInput("COND")
                .setCheck("Boolean")
                .appendField(Blockly.Msg.ARD_LOOP_COND);

            // Step: 赋值表达式
            this.appendStatementInput("STEP")
                .appendField(Blockly.Msg.ARD_LOOP_STEP);

            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_LOOP_DO_WHILE);

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

        // 清理末尾的分号，因为 for 循环头自带分号
        if (init.endsWith(';')) init = init.slice(0, -1);
        if (step.endsWith(';')) step = step.slice(0, -1);

        return `for (${init}; ${cond}; ${step}) {\n${branch}}\n`;
    });

    // 3. Break (跳出循环)
    registerBlock('controls_flow_break', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_LOOP_BREAK);
            this.setPreviousStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_LOOP_BREAK_TOOLTIP);
        }
    }, function () {
        return 'break;\n';
    });

    // 4. Continue (继续下一次循环)
    registerBlock('controls_flow_continue', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_LOOP_CONTINUE);
            this.setPreviousStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_LOOP_CONTINUE_TOOLTIP);
        }
    }, function () {
        return 'continue;\n';
    });
};

export const LoopsAdvancedModule: BlockModule = {
    id: 'core.loops_advanced',
    name: 'Advanced Loops',
    init
};