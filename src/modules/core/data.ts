// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('json_parse', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DATA_JSON_PARSE);
            this.appendValueInput("JSON")
                .setCheck("String")
                .appendField("String");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_DATA_JSON_PARSE_TOOLTIP);
        }
    }, (block: any) => {
        const json = arduinoGenerator.valueToCode(block, 'JSON', Order.ATOMIC) || '"{}"';

        arduinoGenerator.addInclude('json_lib', '#include <ArduinoJson.h>');
        // Use a static global doc for simplicity in blocks, though 2048 bytes might be small/large.
        // DynamicDocument is safer but requires heap.
        arduinoGenerator.addVariable('json_doc', `DynamicJsonDocument jsonDoc(1024);`);

        return `deserializeJson(jsonDoc, ${json});\n`;
    });

    registerBlock('json_get_key', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DATA_JSON_GET);
            this.appendValueInput("KEY")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_PREF_KEY);
            this.setOutput(true, null); // Variant (can be number or string)
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_DATA_JSON_GET_TOOLTIP);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        // Note: Block must cast result usually, but auto-cast works mostly in Arduino
        return [`jsonDoc[${key}]`, Order.ATOMIC];
    });


    // =========================================================================
    // JSON Creation
    // =========================================================================

    registerBlock('json_create_doc', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DATA_JSON_CREATE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_DATA_JSON_CLR_TOOLTIP);
        }
    }, (block: any) => {
        return `jsonDoc.clear();\n`;
    });

    registerBlock('json_set_key', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DATA_JSON_SET);
            this.appendValueInput("KEY")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_PREF_KEY);
            this.appendValueInput("VAL")
                // .setCheck(["String", "Number", "Boolean"]) // loose check
                .appendField(Blockly.Msg.ARD_PREF_VALUE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_DATA_JSON_ADD_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '""';
        return `jsonDoc[${key}] = ${val};\n`;
    });

    registerBlock('json_serialize', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DATA_JSON_SERIALIZE);
            this.setOutput(true, "String");
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_DATA_JSON_STR_TOOLTIP);
        }
    }, (block: any) => {
        // Needs a helper function to avoid complex inline code return
        const funcName = 'json_serialize_helper';
        arduinoGenerator.functions_[funcName] = `
String ${funcName}() {
  String output;
  serializeJson(jsonDoc, output);
  return output;
}`;
        return [`${funcName}()`, Order.ATOMIC];
    });

};

export const DataModule: BlockModule = {
    id: 'core.data',
    name: 'Data Processing',
    category: 'Data',
    init
};
