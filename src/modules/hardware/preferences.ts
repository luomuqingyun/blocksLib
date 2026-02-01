/**
 * ============================================================
 * Preferences 存储模块 (ESP32 NVS Flash Storage)
 * ============================================================
 * 
 * 提供 ESP32 NVS (Non-Volatile Storage) 键值存储积木:
 * - nvs_begin: 打开命名空间
 * - nvs_put_int/get_int: 存取整数
 * - nvs_put_string/get_string: 存取字符串
 * 
 * 数据断电不丢失，适合保存配置参数。
 * 使用 Preferences.h 库。
 * 
 * @file src/modules/hardware/preferences.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('nvs_begin', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PREF_BEGIN);
            this.appendValueInput("NAME")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_PREF_NAMESPACE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_PREFS_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const name = arduinoGenerator.valueToCode(block, 'NAME', Order.ATOMIC) || '"my-app"';

        arduinoGenerator.addInclude('pref_lib', '#include <Preferences.h>');
        arduinoGenerator.addVariable('pref_obj', `Preferences prefs;`);

        return `prefs.begin(${name}, false);\n`;
    });

    registerBlock('nvs_put_int', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PREF_PUT_INT);
            this.appendValueInput("KEY")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_PREF_KEY);
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PREF_VALUE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_PREFS_SAVE_INT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        return `prefs.putInt(${key}, ${val});\n`;
    });

    registerBlock('nvs_get_int', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PREF_GET_INT);
            this.appendValueInput("KEY")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_PREF_KEY);
            this.appendValueInput("DEFAULT")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PREF_DEFAULT);
            this.setOutput(true, "Number");
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_PREFS_GET_INT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        const def = arduinoGenerator.valueToCode(block, 'DEFAULT', Order.ATOMIC) || '0';
        return [`prefs.getInt(${key}, ${def})`, Order.ATOMIC];
    });

    registerBlock('nvs_put_string', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PREF_PUT_STR);
            this.appendValueInput("KEY")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_PREF_KEY);
            this.appendValueInput("VAL")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_PREF_VALUE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_PREFS_SAVE_STR_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '""';
        return `prefs.putString(${key}, ${val});\n`;
    });

    registerBlock('nvs_get_string', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PREF_GET_STR);
            this.appendValueInput("KEY")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_PREF_KEY);
            this.appendValueInput("DEFAULT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_PREF_DEFAULT);
            this.setOutput(true, "String");
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_PREFS_GET_STR_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const key = arduinoGenerator.valueToCode(block, 'KEY', Order.ATOMIC) || '"key"';
        const def = arduinoGenerator.valueToCode(block, 'DEFAULT', Order.ATOMIC) || '""';
        return [`prefs.getString(${key}, ${def})`, Order.ATOMIC];
    });

};

export const PreferencesModule: BlockModule = {
    id: 'hardware.preferences',
    name: 'Preferences (Storage)',
    category: 'Storage',
    init
};
