// @ts-nocheck
/**
 * 基础变量模块 (Basic Variables Module)
 * 
 * 包含基本变量声明、赋值和获取积木。
 */
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../../generators/arduino-base';
import { VAR_TYPES } from '../system';
import {
    COLOUR_GLOBAL, COLOUR_LOCAL, VAR_QUALIFIERS, ColorUpdateMixin,
    appendVarGetDropdown, appendVarSetDropdown
} from './utils';

/**
 * 初始化基础变量积木
 */
export function initBasicBlocks() {
    // --- arduino_var_declare: 变量声明 ---
    registerBlock('arduino_var_declare', {
        init: function () {
            this.appendValueInput("VALUE")
                .appendField(Blockly.Msg.ARD_VAR_DECLARE)
                .appendField(new Blockly.FieldDropdown(VAR_QUALIFIERS), "QUALIFIER")
                .appendField(new Blockly.FieldDropdown(VAR_TYPES), "TYPE")
                .appendField(Blockly.Msg.ARD_VAR_VAR)
                .appendField(new Blockly.FieldTextInput("myVar"), "VAR")
                .appendField(Blockly.Msg.ARD_VAR_VAL);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOUR_GLOBAL);
        },
        onchange: function (e: any) {
            if (!this.workspace || this.isInFlyout) return;
            if (e.type === Blockly.Events.BLOCK_MOVE) {
                const isLocal = !!this.getSurroundParent();
                this.setColour(isLocal ? COLOUR_LOCAL : COLOUR_GLOBAL);
            }
        }
    }, function (block: any) {
        const type = block.getFieldValue('TYPE');
        const name = cleanName(block.getFieldValue('VAR'));
        const val = arduinoGenerator.valueToCode(block, 'VALUE', Order.ASSIGNMENT);
        const q = block.getFieldValue('QUALIFIER');
        let pre = q === 'CONST' ? 'const ' : q === 'STATIC' ? 'static ' : q === 'VOLATILE' ? 'volatile ' : '';
        let code;
        if (val) {
            code = `${pre}${type} ${name} = ${val}; `;
            if (type === 'String') code = `${pre}String ${name} = ${val}; `;
            if (type.endsWith('*')) code = `${pre}${type} ${name} = ${val}; `;
        } else {
            code = `${pre}${type} ${name}; `;
            if (type === 'String') code = `${pre}String ${name} = ""; `;
            if (type.endsWith('*')) code = `${pre}${type} ${name} = NULL; `;
        }
        if (!block.getSurroundParent()) {
            arduinoGenerator.addVariable('var_' + name, code);
            return '';
        }
        return code + '\n';
    });

    // --- arduino_var_set_dynamic: 动态变量赋值 ---
    registerBlock('arduino_var_set_dynamic', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_VAR_SET);
            this.appendValueInput("VALUE").appendField(Blockly.Msg.ARD_VAR_TO);
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(330);
            appendVarSetDropdown(this);
        },
        ...ColorUpdateMixin
    }, function (block: any) {
        const val = arduinoGenerator.valueToCode(block, 'VALUE', Order.ASSIGNMENT);
        if (!val) return '';
        return `${cleanName(block.getFieldValue('VAR'))} = ${val}; \n`;
    });

    // --- arduino_var_get_dynamic: 动态变量获取 ---
    registerBlock('arduino_var_get_dynamic', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_VAR_GET);
            this.setOutput(true, null);
            this.setColour(330);
            appendVarGetDropdown(this);
        },
        ...ColorUpdateMixin
    }, function (block: any) {
        return [cleanName(block.getFieldValue('VAR')), Order.ATOMIC];
    });
}
