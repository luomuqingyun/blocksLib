/**
 * ============================================================
 * 数据格式模块 (Data Formats - CSV)
 * ============================================================
 * 
 * 提供 CSV 数据格式处理积木:
 * - data_csv_create: 创建 CSV 行
 * - data_csv_parse: 解析 CSV 获取项目
 * 
 * @file src/modules/core/data_formats.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册与数据交换格式（如 CSV）相关的积木块。
 */
const init = () => {

    // =========================================================================
    // 1. 创建 CSV 行 (Create CSV Line)
    // 将多个离散的数据项拼接到一个以逗号分隔的字符串中。
    // =========================================================================
    registerBlock('data_csv_create', {
        init: function () {
            this.appendDummyInput()
                .appendField("创建 CSV 行");
            this.appendValueInput("ITEM1").appendField("项目 1");
            this.appendValueInput("ITEM2").appendField("项目 2");
            this.appendValueInput("ITEM3").appendField("项目 3");
            this.setOutput(true, "String");
            this.setColour(160); // 数据处理类积木统一使用青色调
            this.setTooltip(Blockly.Msg.ARD_DATA_CSV_JOIN_TOOLTIP);
        }
    }, (block: any) => {
        const i1 = arduinoGenerator.valueToCode(block, 'ITEM1', Order.ATOMIC) || '""';
        const i2 = arduinoGenerator.valueToCode(block, 'ITEM2', Order.ATOMIC) || '""';
        const i3 = arduinoGenerator.valueToCode(block, 'ITEM3', Order.ATOMIC) || '""';

        // 【关键点】在 Arduino 中显式调用 String() 构造函数，
        // 以确保无论是数字、字符还是浮点数都能正确转换为字符串并连接。
        return [`(String(${i1}) + "," + String(${i2}) + "," + String(${i3}))`, Order.ATOMIC];
    });

    // =========================================================================
    // 2. 解析 CSV (Parse CSV Get Item)
    // 根据索引位置，从一个 CSV 字符串中提取指定的字段。
    // =========================================================================
    registerBlock('data_csv_parse', {
        init: function () {
            this.appendDummyInput()
                .appendField("解析 CSV 提取项目");
            this.appendValueInput("CSV").setCheck("String").appendField("CSV 字符串");
            this.appendValueInput("INDEX").setCheck("Number").appendField("位置索引");
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_DATA_CSV_GET_TOOLTIP);
        }
    }, (block: any) => {
        const csv = arduinoGenerator.valueToCode(block, 'CSV', Order.ATOMIC) || '""';
        const idx = arduinoGenerator.valueToCode(block, 'INDEX', Order.ATOMIC) || '0';

        const funcName = 'getCSVItem';
        // 注入全局辅助函数，用于解析 CSV
        arduinoGenerator.functions_[funcName] = `
/** 
 * 根据索引提取 CSV 中的字段 
 * 原理：遍历字符串查找第 n 个逗号的位置，并截取子串。
 */
String ${funcName}(String data, int index) {
  int found = 0;
  int strIndex[] = {0, -1};
  int maxIndex = data.length()-1;

  for(int i=0; i<=maxIndex && found<=index; i++){
    // 如果遇到逗号或到了末尾，说明找到了一个项目的终点
    if(data.charAt(i)==',' || i==maxIndex){
        found++;
        strIndex[0] = strIndex[1]+1;
        strIndex[1] = (i == maxIndex) ? i+1 : i;
    }
  }
  // 如果找到的项目数足够，返回截取的子串；否则返回空。
  return found>index ? data.substring(strIndex[0], strIndex[1]) : "";
}`;
        return [`${funcName}(${csv}, ${idx})`, Order.ATOMIC];
    });

};

/**
 * 数据格式模块定义
 * 旨在简化传感器数据的打包传输与简单数据协议的解析。
 */
export const DataFormatsModule: BlockModule = {
    id: 'core.data_formats',
    name: 'Data Formats (CSV)',
    init
};
