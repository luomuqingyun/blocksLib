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


/**
 * 模块初始化函数
 * 注册与系统级硬件控制相关的积木块。
 * 包含外部中断处理、高精度时间测量、脉冲捕捉以及软件复位功能。
 */
const init = () => {

    // =========================================================================
    // 1. 外部中断 (External Interrupts)
    // 允许引脚电平变化时立即暂停主程序，跳转执行特定任务。
    // =========================================================================

    /** 绑定中断 */
    registerBlock('system_interrupt_attach', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_ATTACH_INT); // 开启外部中断
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN"); // 触发引脚
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_MODE)
                .appendField(new Blockly.FieldDropdown([
                    ["上升沿 (RISING)", "RISING"],
                    ["下降沿 (FALLING)", "FALLING"],
                    ["双边沿 (CHANGE)", "CHANGE"],
                    ["低电平 (LOW)", "LOW"]
                ]), "MODE"); // 触发模式
            this.appendStatementInput("DO")
                .appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_DO); // 执行内容
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290); // 系统控制类统一使用砖红色
            this.setTooltip(Blockly.Msg.ARD_SYS_INT_ATTACH_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const mode = block.getFieldValue('MODE');
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        // 预留引脚并自动生成 pinMode 设置
        reservePin(block, pin, 'INPUT');

        // 【生成的 C++ 代码逻辑】
        // 中断服务程序 (ISR) 必须是全局函数。
        // 这里根据引脚号生成唯一的函数名。
        const funcName = `interrupt_isr_pin${pin}`;

        arduinoGenerator.functions_[funcName] = `
/** 中断服务程序 - 引脚 ${pin} */
void ${funcName}() {
${branch}
}`;

        // 在 setup() 中将引脚号转换为中断号并绑定
        arduinoGenerator.addSetup(`interrupt_init_${pin}`, `attachInterrupt(digitalPinToInterrupt(${pin}), ${funcName}, ${mode});`);
        return '';
    });

    /** 取消中断 */
    registerBlock('system_interrupt_referrer', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_DETACH_INT); // 关闭外部中断
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

    /** 全局启用中断 */
    registerBlock('system_interrupts_enable', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_ENABLE_INT); // 启用全局中断
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_SYS_INT_ENA_TOOLTIP);
        }
    }, (block: any) => {
        return `interrupts();\n`;
    });

    /** 全局禁用中断 */
    registerBlock('system_interrupts_disable', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_DISABLE_INT); // 禁用全局中断
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_SYS_INT_DIS_TOOLTIP);
        }
    }, (block: any) => {
        return `noInterrupts();\n`;
    });


    // =========================================================================
    // 2. 脉冲捕捉 (PulseIn)
    // 测量引脚保持特定电平的时间（常用于超声波测距信号解析）。
    // =========================================================================

    registerBlock('system_pulse_in', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_READ_PULSE); // 读取脉冲宽度
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("7"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_STATE)
                .appendField(new Blockly.FieldDropdown([["高电平 (HIGH)", "HIGH"], ["低电平 (LOW)", "LOW"]]), "STATE");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_TIMEOUT)
                .appendField(new Blockly.FieldNumber(1000000), "TIMEOUT"); // 超时时间（微秒）
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
    // 3. 时间测量 (Time Measurement)
    // =========================================================================

    /** 获取自开机以来的毫秒数 */
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

    /** 获取自开机以来的微秒数 */
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

    // =========================================================================
    // 4. 软件复位 (Software Reset)
    // =========================================================================
    registerBlock('system_software_reset', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SYS_RESET); // 软件复位
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_SYS_RESET_TOOLTIP);
        }
    }, (block: any) => {
        // 【关键逻辑】对于 AVR 架构的高通用性复位方案：
        // 定义一个指向地址 0 的函数指针，调用它会导致程序从头开始（模拟复位）。
        arduinoGenerator.functions_['software_reset'] = `
void(* resetFunc) (void) = 0;
`;
        return `resetFunc();\n`;
    });

};

/**
 * 系统控制模块定义
 * 提供了对 Arduino 底层机制（如中断流控、微秒级时间测量）的支持。
 */
export const SystemControlModule: BlockModule = {
    id: 'core.system_control',
    name: 'System Utilities',
    init
};
