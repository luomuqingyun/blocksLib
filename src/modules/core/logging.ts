/**
 * ============================================================
 * 数据日志模块 (Data Logging Module)
 * ============================================================
 * 
 * 提供数据记录和可视化积木:
 * - log_to_serial_csv: 输出 CSV 格式行
 * - log_plotter_print: 串口绘图器输出
 * 
 * @file src/modules/core/logging.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册与数据记录、实时监控相关的积木定义及其代码生成器。
 */
const init = () => {

    // =========================================================================
    // 记录 CSV 格式行 (Log CSV Row)
    // 将多个数值以逗号分隔的形式输出到串口，常用于 SD 卡记录或 Excel 数据分析。
    // =========================================================================
    registerBlock('log_to_serial_csv', {
        init: function () {
            this.appendDummyInput()
                .appendField("Log CSV Row"); // 记录 CSV 行
            this.appendValueInput("VAL1").setCheck(null).appendField("Val 1"); // 变量 1
            this.appendValueInput("VAL2").setCheck(null).appendField("Val 2"); // 变量 2
            this.appendValueInput("VAL3").setCheck(null).appendField("Val 3"); // 变量 3
            this.appendValueInput("VAL4").setCheck(null).appendField("Val 4"); // 变量 4
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160); // 串口通讯标准紫色
            this.setTooltip(Blockly.Msg.ARD_LOG_CSV_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const v1 = arduinoGenerator.valueToCode(block, 'VAL1', Order.ATOMIC) || '0';
        const v2 = arduinoGenerator.valueToCode(block, 'VAL2', Order.ATOMIC) || '0';
        const v3 = arduinoGenerator.valueToCode(block, 'VAL3', Order.ATOMIC) || '0';
        const v4 = arduinoGenerator.valueToCode(block, 'VAL4', Order.ATOMIC) || '0';

        return `
  Serial.print(${v1}); Serial.print(",");
  Serial.print(${v2}); Serial.print(",");
  Serial.print(${v3}); Serial.print(",");
  Serial.println(${v4});\n`;
    });

    // =========================================================================
    // 串口绘图器输出 (Plotter Print)
    // 格式化输出为 "标签:数值"，使 Arduino IDE 的串口绘图器能识别多条曲线。
    // =========================================================================
    registerBlock('log_plotter_print', {
        init: function () {
            this.appendDummyInput()
                .appendField("Plotter Print"); // 绘图器输出
            this.appendValueInput("LABEL").setCheck("String").appendField("Label"); // 标签
            this.appendValueInput("VALUE").setCheck("Number").appendField("Value"); // 数值
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_LOG_PLOT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const label = arduinoGenerator.valueToCode(block, 'LABEL', Order.ATOMIC) || '"Var"';
        const val = arduinoGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
        // 标准格式：Serial.print(Label); Serial.print(":"); Serial.println(Value);
        return `
  Serial.print(${label});
  Serial.print(":");
  Serial.println(${val});\n`;
    });

};

/**
 * 数据日志模块定义
 * 旨在通过简单的串口封装，实现数据的可视化存储与分析。
 */
export const LoggingModule: BlockModule = {
    id: 'core.logging',
    name: 'Data Logging',
    init
};
