/**
 * ============================================================
 * Firebase 数据库模块 (Realtime Database)
 * ============================================================
 * 
 * 提供 Firebase 实时数据库积木:
 * - firebase_config: 配置 URL 和密钥
 * - firebase_set_int/string: 写入数据
 * - firebase_get_int: 读取整数数据
 * 
 * 使用 IOXhop_FirebaseESP32.h 库。
 * 
 * @file src/modules/protocols/firebase.ts
 * @module EmbedBlocks/Frontend/Modules/Protocols
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // Firebase 数据库配置
    registerBlock('firebase_config', {
        init: function () {
            this.appendDummyInput()
                .appendField("Firebase 配置");
            this.appendValueInput("URL")
                .setCheck("String")
                .appendField("数据库 URL");
            this.appendValueInput("SECRET")
                .setCheck("String")
                .appendField("数据库密钥 (Secret)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(25); // 深橙色/红色
            this.setTooltip(Blockly.Msg.ARD_FIREBASE_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const url = arduinoGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '""';
        const secret = arduinoGenerator.valueToCode(block, 'SECRET', Order.ATOMIC) || '""';

        // 包含 Firebase ESP32 库
        arduinoGenerator.addInclude('firebase_lib', '#include <IOXhop_FirebaseESP32.h>');

        // 在 setup 中开启 Firebase 连接
        arduinoGenerator.addSetup('firebase_begin', `Firebase.begin(${url}, ${secret});`);
        return '';
    });

    // 向 Firebase 写入整数值
    registerBlock('firebase_set_int', {
        init: function () {
            this.appendDummyInput()
                .appendField("Firebase 写入整数");
            this.appendValueInput("PATH")
                .setCheck("String")
                .appendField("路径");
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField("数值");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(25);
        }
    }, (block: any) => {
        const path = arduinoGenerator.valueToCode(block, 'PATH', Order.ATOMIC) || '"/"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        return `Firebase.setInt(${path}, ${val});\n`;
    });

    // 从 Firebase 读取整数值
    registerBlock('firebase_get_int', {
        init: function () {
            this.appendDummyInput()
                .appendField("Firebase 读取整数");
            this.appendValueInput("PATH")
                .setCheck("String")
                .appendField("路径");
            this.setOutput(true, "Number");
            this.setColour(25);
        }
    }, (block: any) => {
        const path = arduinoGenerator.valueToCode(block, 'PATH', Order.ATOMIC) || '"/"';
        return [`Firebase.getInt(${path})`, Order.ATOMIC];
    });

    // String variants
    // 向 Firebase 写入字符串值
    registerBlock('firebase_set_string', {
        init: function () {
            this.appendDummyInput()
                .appendField("Firebase 写入字符串");
            this.appendValueInput("PATH")
                .setCheck("String")
                .appendField("路径");
            this.appendValueInput("VAL")
                .setCheck("String")
                .appendField("字符串值");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(25);
        }
    }, (block: any) => {
        const path = arduinoGenerator.valueToCode(block, 'PATH', Order.ATOMIC) || '"/"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '""';
        return `Firebase.setString(${path}, ${val});\n`;
    });
};

export const FirebaseModule: BlockModule = {
    id: 'protocols.firebase',
    name: 'Firebase DB',
    init
};
