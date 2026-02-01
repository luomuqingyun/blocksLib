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


const init = () => {

    registerBlock('data_csv_create', {
        init: function () {
            this.appendDummyInput()
                .appendField("Create CSV Line");
            this.appendValueInput("ITEM1").appendField("Item 1");
            this.appendValueInput("ITEM2").appendField("Item 2");
            this.appendValueInput("ITEM3").appendField("Item 3");
            this.setOutput(true, "String");
            this.setColour(160); // Data color
            this.setTooltip(Blockly.Msg.ARD_DATA_CSV_JOIN_TOOLTIP);
        }
    }, (block: any) => {
        const i1 = arduinoGenerator.valueToCode(block, 'ITEM1', Order.ATOMIC) || '""';
        const i2 = arduinoGenerator.valueToCode(block, 'ITEM2', Order.ATOMIC) || '""';
        const i3 = arduinoGenerator.valueToCode(block, 'ITEM3', Order.ATOMIC) || '""';

        return [`(String(${i1}) + "," + String(${i2}) + "," + String(${i3}))`, Order.ATOMIC];
    });

    registerBlock('data_csv_parse', {
        init: function () {
            this.appendDummyInput()
                .appendField("Parse CSV Get Item");
            this.appendValueInput("CSV").setCheck("String").appendField("CSV String");
            this.appendValueInput("INDEX").setCheck("Number").appendField("Index");
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_DATA_CSV_GET_TOOLTIP);
        }
    }, (block: any) => {
        const csv = arduinoGenerator.valueToCode(block, 'CSV', Order.ATOMIC) || '""';
        const idx = arduinoGenerator.valueToCode(block, 'INDEX', Order.ATOMIC) || '0';

        const funcName = 'getCSVItem';
        arduinoGenerator.functions_[funcName] = `
String ${funcName}(String data, int index) {
  int found = 0;
  int strIndex[] = {0, -1};
  int maxIndex = data.length()-1;

  for(int i=0; i<=maxIndex && found<=index; i++){
    if(data.charAt(i)==',' || i==maxIndex){
        found++;
        strIndex[0] = strIndex[1]+1;
        strIndex[1] = (i == maxIndex) ? i+1 : i;
    }
  }
  return found>index ? data.substring(strIndex[0], strIndex[1]) : "";
}`;
        return [`${funcName}(${csv}, ${idx})`, Order.ATOMIC];
    });

};

export const DataFormatsModule: BlockModule = {
    id: 'core.data_formats',
    name: 'Data Formats (CSV)',
    category: 'Data',
    init
};
