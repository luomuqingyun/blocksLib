/**
 * ============================================================
 * 菜单系统模块 (Menu System Module)
 * ============================================================
 * 
 * 提供简易菜单导航积木:
 * - menu_create: 创建菜单
 * - menu_add_item: 添加菜单项
 * - menu_nav: 导航 (上/下)
 * - menu_get_current: 获取当前项
 * 
 * @file src/modules/core/menu.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('menu_create', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MENU_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_MENU_INIT_TOOLTIP);
        }
    }, (block: any) => {
        arduinoGenerator.addVariable('menu_vars', `
int menu_index = 0;
int menu_count = 0;
String menu_items[10]; // Fixed size for block simplicity
`);
        arduinoGenerator.addSetup('menu_reset', `menu_count = 0; menu_index = 0;`);
        return '';
    });

    registerBlock('menu_add_item', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MENU_ADD);
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_MENU_LABEL);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '"Item"';
        // Add to setup array
        return `if(menu_count < 10) { menu_items[menu_count++] = ${text}; }\n`;
    });

    registerBlock('menu_manage_input', {
        init: function () {
            this.appendDummyInput()
                .appendField("Menu Input Navigation");
            this.appendDummyInput()
                .appendField("Up?")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "UP");
            this.appendDummyInput()
                .appendField("Down?")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "DOWN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
            this.setTooltip(Blockly.Msg.ARD_MENU_UPDATE_TOOLTIP);
            // Wait, checkbox is static compile time usually. 
            // Better to take Value inputs for button states.
        }
    }, (block: any) => {
        // Redefine block for Value inputs
        return '// Deprecated block logic\n';
    });

    registerBlock('menu_nav', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MENU_NAV);
            this.appendValueInput("NEXT")
                .setCheck("Boolean")
                .appendField(Blockly.Msg.ARD_MENU_NEXT);
            this.appendValueInput("PREV")
                .setCheck("Boolean")
                .appendField(Blockly.Msg.ARD_MENU_PREV);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
        }
    }, (block: any) => {
        const next = arduinoGenerator.valueToCode(block, 'NEXT', Order.ATOMIC) || 'false';
        const prev = arduinoGenerator.valueToCode(block, 'PREV', Order.ATOMIC) || 'false';

        return `
    if(${next}) { 
        menu_index++; 
        if(menu_index >= menu_count) menu_index = 0; 
        delay(200); // Debounce
    }
    if(${prev}) { 
        menu_index--; 
        if(menu_index < 0) menu_index = menu_count - 1;
        delay(200); 
    }
\n`;
    });

    registerBlock('menu_get_current', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MENU_GET);
            this.setOutput(true, "String");
            this.setColour(290);
        }
    }, (block: any) => {
        return [`menu_items[menu_index]`, Order.ATOMIC];
    });

};

export const MenuModule: BlockModule = {
    id: 'core.menu',
    name: 'Menu System',
    category: 'Logic',
    init
};
