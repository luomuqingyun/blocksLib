/**
 * ============================================================
 * 系统诊断模块 (System Diagnostics Module)
 * ============================================================
 * 
 * 提供 ESP32 系统诊断积木:
 * - temp_read: 读取内部温度
 * - diag_free_heap: 可用堆内存
 * - diag_uptime: 运行时间
 * - diag_restart_reason: 重启原因
 * - diag_chip_model: 芯片型号
 * 
 * @file src/modules/core/diagnostics.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册与系统运行状态监测相关的积木块。
 * 注意：部分功能（如 getFreeHeap）主要针对 ESP32/ESP8266 平台实现。
 */
const init = () => {

    // =========================================================================
    // 1. 读取内容温度 (Internal Temperature)
    // 警告：仅部分 ESP32 芯片支持内置温度计，且受系统负载影响较大，误差较明显。
    // =========================================================================
    registerBlock('temp_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DIAG_TEMP); // 读取内部温度
            this.setOutput(true, "Number");
            this.setColour(230); // 诊断类积木统一使用紫色调
            this.setTooltip(Blockly.Msg.ARD_DIAG_TEMP_TOOLTIP);
        }
    }, (block: any) => {
        return [`temperatureRead()`, Order.ATOMIC];
    });

    // =========================================================================
    // 2. 获取可用堆内存 (Free Heap)
    // 实时监测 RAM 消耗情况，防止内存泄漏导致程序崩溃。
    // =========================================================================
    registerBlock('diag_free_heap', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DIAG_HEAP); // 可用堆内存 (Heap)
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_DIAG_RAM_TOOLTIP);
        }
    }, (block: any) => {
        // 调用 ESP32 SDK 提供的接口
        return [`ESP.getFreeHeap()`, Order.ATOMIC];
    });

    // =========================================================================
    // 3. 运行时间 (Uptime)
    // 获取自开机以来的秒数。
    // =========================================================================
    registerBlock('diag_uptime', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DIAG_UPTIME); // 累计运行时间 (秒)
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_DIAG_BOOT_TOOLTIP);
        }
    }, (block: any) => {
        // 基于 Arduino millis() 转换
        return [`(millis() / 1000)`, Order.ATOMIC];
    });

    // =========================================================================
    // 4. 重启原因 (Reset/Restart Reason)
    // 辅助诊断是手动重启、外部复位还是由于看门狗超时导致的重启。
    // =========================================================================
    registerBlock('diag_restart_reason', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DIAG_REASON); // 上次重启原因
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_DIAG_RESET_TOOLTIP);
        }
    }, (block: any) => {
        // 调用 ESP-IDF 底层接口
        return [`esp_reset_reason()`, Order.ATOMIC];
    });

    // =========================================================================
    // 5. 芯片型号 (Chip Model)
    // =========================================================================
    registerBlock('diag_chip_model', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DIAG_MODEL); // 读取芯片型号
            this.setOutput(true, "String");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_DIAG_CPU_TOOLTIP);
        }
    }, (block: any) => {
        return [`ESP.getChipModel()`, Order.ATOMIC];
    });

};

/**
 * 系统诊断模块定义
 * 旨在通过实时反馈设备底层状态，帮助用户进行远程调试或自诊断。
 */
export const DiagnosticsModule: BlockModule = {
    id: 'core.diagnostics',
    name: 'System Diagnostics',
    init
};
