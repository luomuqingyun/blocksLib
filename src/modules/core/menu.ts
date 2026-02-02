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


/**
 * 模块初始化函数
 * 注册与简易菜单系统相关的积木块。
 * 旨在为具有屏幕和按钮的设备（如带有 OLED 的 Arduino）提供基础交互框架。
 */
const init = () => {

    // =========================================================================
    // 1. 初始化菜单 (Menu Init)
    // 声明用于保存菜单项、当前索引和总数的全局变量。
    // =========================================================================
    registerBlock('menu_create', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MENU_INIT); // 初始化菜单系统
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290); // 属于控制/交互类，使用砖红色
            this.setTooltip(Blockly.Msg.ARD_MENU_INIT_TOOLTIP);
        }
    }, (block: any) => {
        // 【关键逻辑】使用静态 String 数组。
        // 为了平衡内存消耗与功能，目前默认支持最多 10 个菜单项。
        arduinoGenerator.addVariable('menu_vars', `
int menu_index = 0;   // 当前选中的项目索引
int menu_count = 0;   // 已注册的菜单项总数
String menu_items[10]; 
`);
        // 在程序启动时重置计数器
        arduinoGenerator.addSetup('menu_reset', `menu_count = 0; menu_index = 0;`);
        return '';
    });

    // =========================================================================
    // 2. 添加菜单项 (Add Menu Item)
    // =========================================================================
    registerBlock('menu_add_item', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MENU_ADD); // 添加菜单项
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_MENU_LABEL); // 项目标签
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
        }
    }, (block: any) => {
        const text = arduinoGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '"Item"';
        // 运行时安全检查，防止数组越界
        return `if(menu_count < 10) { menu_items[menu_count++] = ${text}; }\n`;
    });

    /** 废弃逻辑：基于复选框的输入管理
     *  原因：复选框是编译时决定的静态值，无法反映实时的物理按键按下状态。
     */
    registerBlock('menu_manage_input', {
        init: function () {
            this.appendDummyInput()
                .appendField("Menu Input Navigation (Deprecated)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(100); // 设为不常用颜色
        }
    }, (block: any) => {
        return '// Deprecated block logic\n';
    });

    // =========================================================================
    // 3. 菜单导航 (Menu Navigation)
    // 处理上移/下移逻辑，并包含基础防抖。
    // =========================================================================
    registerBlock('menu_nav', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MENU_NAV); // 菜单导航控制
            this.appendValueInput("NEXT")
                .setCheck("Boolean")
                .appendField(Blockly.Msg.ARD_MENU_NEXT); // 下一项（如按钮 A）
            this.appendValueInput("PREV")
                .setCheck("Boolean")
                .appendField(Blockly.Msg.ARD_MENU_PREV); // 上一项（如按钮 B）
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
        }
    }, (block: any) => {
        const next = arduinoGenerator.valueToCode(block, 'NEXT', Order.ATOMIC) || 'false';
        const prev = arduinoGenerator.valueToCode(block, 'PREV', Order.ATOMIC) || 'false';

        // 逻辑包含边界滚动处理：末尾继续向下 -> 回到开头；开头继续向上 -> 跳到末尾。
        return `
    if(${next}) { 
        menu_index++; 
        if(menu_index >= menu_count) menu_index = 0; 
        delay(200); // 简单的软件防抖延迟，防止按键连读导致菜单飞速滚动
    }
    if(${prev}) { 
        menu_index--; 
        if(menu_index < 0) menu_index = menu_count - 1;
        delay(200); 
    }
\n`;
    });

    // =========================================================================
    // 4. 获取当前项内容 (Get Current Selected Label)
    // =========================================================================
    registerBlock('menu_get_current', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MENU_GET); // 获取当前选中项的文字
            this.setOutput(true, "String");
            this.setColour(290);
        }
    }, (block: any) => {
        // 直接返回当前索引对应的数组内容
        return [`menu_items[menu_index]`, Order.ATOMIC];
    });

};

/**
 * 菜单系统模块定义
 * 提供了基础的列表展示与循环导航逻辑。
 */
export const MenuModule: BlockModule = {
    id: 'core.menu',
    name: 'Menu System',
    init
};
