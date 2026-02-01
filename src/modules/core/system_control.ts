/**
 * ============================================================
 * 系统工具模块 (System Utilities Module)
 * ============================================================
 * 
 * 提供系统级控制积木:
 * - 中断: attachInterrupt/detachInterrupt/启用/禁用
 * - pulseIn: 读取脉冲宽度
 * - millis/micros: 时间测量
 * - 软件复位
 * 
 * @file src/modules/core/system_control.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // Interrupts
    // =========================================================================

    registerBlock('system_interrupt_attach', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_ATTACH_INT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_MODE)
                .appendField(new Blockly.FieldDropdown([
                    ["RISING", "RISING"],
                    ["FALLING", "FALLING"],
                    ["CHANGE", "CHANGE"],
                    ["LOW", "LOW"]
                ]), "MODE");
            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_DO);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_SYS_INT_ATTACH_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const mode = block.getFieldValue('MODE');
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        reservePin(block, pin, 'INPUT');

        // Clean room implementation:
        // We need a unique function name for the ISR.
        // We generate a static function name based on pin to keep it simple but functional.
        // LIMITATION: Only one interrupt per pin (Hardware limitation anyway usually).

        const funcName = `interrupt_isr_pin${pin}`;

        arduinoGenerator.functions_[funcName] = `
void ${funcName}() {
${branch}
}`;

        arduinoGenerator.addSetup(`interrupt_init_${pin}`, `attachInterrupt(digitalPinToInterrupt(${pin}), ${funcName}, ${mode});`);
        return '';
    });

    registerBlock('system_interrupt_referrer', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_DETACH_INT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_SYS_INT_DETACH_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        return `detachInterrupt(digitalPinToInterrupt(${pin}));\n`;
    });

    registerBlock('system_interrupts_enable', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_ENABLE_INT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_SYS_INT_ENA_TOOLTIP);
        }
    }, (block: any) => {
        return `interrupts();\n`;
    });

    registerBlock('system_interrupts_disable', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_DISABLE_INT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_SYS_INT_DIS_TOOLTIP);
        }
    }, (block: any) => {
        return `noInterrupts();\n`;
    });


    // =========================================================================
    // PulseIn
    // =========================================================================

    registerBlock('system_pulse_in', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_READ_PULSE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("7"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_STATE)
                .appendField(new Blockly.FieldDropdown([["HIGH", "HIGH"], ["LOW", "LOW"]]), "STATE");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_TIMEOUT)
                .appendField(new Blockly.FieldNumber(1000000), "TIMEOUT");
            this.setOutput(true, "Number");
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_SYS_PULSE_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const state = block.getFieldValue('STATE');
        const timeout = block.getFieldValue('TIMEOUT');
        reservePin(block, pin, 'INPUT');

        return [`pulseIn(${pin}, ${state}, ${timeout})`, Order.ATOMIC];
    });


    // =========================================================================
    // Time Measurement
    // =========================================================================

    registerBlock('system_millis', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_MILLIS);
            this.setOutput(true, "Number");
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_SYS_MILLIS_TOOLTIP);
        }
    }, (block: any) => {
        return [`millis()`, Order.ATOMIC];
    });

    registerBlock('system_micros', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_MICROS);
            this.setOutput(true, "Number");
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_SYS_MICROS_TOOLTIP);
        }
    }, (block: any) => {
        return [`micros()`, Order.ATOMIC];
    });

    registerBlock('system_software_reset', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_RESET);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_SYS_RESET_TOOLTIP);
        }
    }, (block: any) => {
        // Universal AVR reset method using pure assembly jump to 0
        arduinoGenerator.functions_['software_reset'] = `
void(* resetFunc) (void) = 0;
`;
        return `resetFunc();\n`;
    });

};

export const SystemControlModule: BlockModule = {
    id: 'core.system_control',
    name: 'System Utilities',
    category: 'System Utils',
    init
};
