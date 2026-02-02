/**
 * ============================================================
 * 实时时钟模块 (Real Time Clock Module)
 * ============================================================
 * 
 * 提供 RTC DS3231/DS1307 时钟模块积木 (RTClib):
 * - rtc_init: 初始化 RTC (自动校准)
 * - rtc_set_time: 手动设置日期时间
 * - rtc_get_element: 获取年/月/日/时/分/秒
 * - rtc_get_date_string: 获取日期字符串
 * - rtc_get_time_string: 获取时间字符串
 * 
 * @file src/modules/hardware/rtc.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // RTC DS3231/DS1307 (RTClib)
    // =========================================================================

    // Init Block
    registerBlock('rtc_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RTC_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_RTC_INIT_TOOLTIP);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('wire_lib', '#include <Wire.h>');
        arduinoGenerator.addInclude('rtc_lib', '#include <RTClib.h>');
        arduinoGenerator.addVariable('rtc_def', 'RTC_DS3231 rtc;');
        arduinoGenerator.addSetup('rtc_init', `
  if (!rtc.begin()) {
    while (1);
  }
  if (rtc.lostPower()) {
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }`);
        return '';
    });

    // 手动设置 RTC 时间
    registerBlock('rtc_set_time', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RTC_SET);
            this.appendValueInput("YEAR").setCheck("Number").appendField("Y");
            this.appendValueInput("MONTH").setCheck("Number").appendField("M");
            this.appendValueInput("DAY").setCheck("Number").appendField("D");
            this.appendValueInput("HOUR").setCheck("Number").appendField("h");
            this.appendValueInput("MIN").setCheck("Number").appendField("m");
            this.appendValueInput("SEC").setCheck("Number").appendField("s");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_RTC_SET_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const year = arduinoGenerator.valueToCode(block, 'YEAR', Order.ATOMIC) || '2023';
        const month = arduinoGenerator.valueToCode(block, 'MONTH', Order.ATOMIC) || '1';
        const day = arduinoGenerator.valueToCode(block, 'DAY', Order.ATOMIC) || '1';
        const hour = arduinoGenerator.valueToCode(block, 'HOUR', Order.ATOMIC) || '0';
        const min = arduinoGenerator.valueToCode(block, 'MIN', Order.ATOMIC) || '0';
        const sec = arduinoGenerator.valueToCode(block, 'SEC', Order.ATOMIC) || '0';

        // 调用 adjust 函数校准内部时钟
        return `rtc.adjust(DateTime(${year}, ${month}, ${day}, ${hour}, ${min}, ${sec}));\n`;
    });

    // 获取特定的时间分量 (年/月/日/时/分/秒)
    registerBlock('rtc_get_element', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RTC_GET)
                .appendField(new Blockly.FieldDropdown([
                    ["Year", "year()"],
                    ["Month", "month()"],
                    ["Day", "day()"],
                    ["Hour", "hour()"],
                    ["Minute", "minute()"],
                    ["Second", "second()"]
                ]), "ELEMENT");
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_RTC_GET_TOOLTIP);
        }
    }, (block: any) => {
        const elem = block.getFieldValue('ELEMENT');
        // rtc.now() 获取当前 DateTime 对象，然后调用对应方法
        return [`rtc.now().${elem}`, Order.ATOMIC];
    });

    // 以 "DD/MM/YYYY" 格式获取日期字符串
    registerBlock('rtc_get_date_string', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RTC_DATE_STR);
            this.setOutput(true, "String");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_RTC_DATE_TOOLTIP);
        }
    }, (block: any) => {
        // 使用辅助函数格式化字符串，减少重复生成代码量
        const funcName = 'rtc_get_date_str';
        arduinoGenerator.addFunction(funcName, `
String ${funcName}() {
  DateTime now = rtc.now();
  char buf[12];
  sprintf(buf, "%02d/%02d/%04d", now.day(), now.month(), now.year());
  return String(buf);
}`);
        return [`${funcName}()`, Order.ATOMIC];
    });

    // 获取当前时间字符串 (格式为 HH:MM:SS)
    registerBlock('rtc_get_time_string', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RTC_TIME_STR);
            this.setOutput(true, "String");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_RTC_TIME_TOOLTIP);
        }
    }, (block: any) => {
        const funcName = 'rtc_get_time_str';
        // 生成辅助函数，使用 sprintf 格式化时间
        arduinoGenerator.addFunction(funcName, `
String ${funcName}() {
  DateTime now = rtc.now();
  char buf[10];
  // 格式化为两位数字显示
  sprintf(buf, "%02d:%02d:%02d", now.hour(), now.minute(), now.second());
  return String(buf);
}`);
        return [`${funcName}()`, Order.ATOMIC];
    });

};

/**
 * 实时时钟 (RTC) 模块 (DS1307/DS3231)
 * 通过 I2C 接口提供精确的日期和时间获取与设置功能。
 */
export const RTCModule: BlockModule = {
    id: 'hardware.rtc',
    name: 'Real Time Clock',
    init
};
