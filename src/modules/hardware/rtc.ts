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

    // Set Time Manually
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

        return `rtc.adjust(DateTime(${year}, ${month}, ${day}, ${hour}, ${min}, ${sec}));\n`;
    });

    // Get Time Element
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
        return [`rtc.now().${elem}`, Order.ATOMIC];
    });

    registerBlock('rtc_get_date_string', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_RTC_DATE_STR);
            this.setOutput(true, "String");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_RTC_DATE_TOOLTIP);
        }
    }, (block: any) => {
        // Requires a helper to format comfortably
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
        arduinoGenerator.addFunction(funcName, `
String ${funcName}() {
  DateTime now = rtc.now();
  char buf[10];
  sprintf(buf, "%02d:%02d:%02d", now.hour(), now.minute(), now.second());
  return String(buf);
}`);
        return [`${funcName}()`, Order.ATOMIC];
    });

};

export const RTCModule: BlockModule = {
    id: 'hardware.rtc',
    name: 'Real Time Clock',
    category: 'Time',
    init
};
