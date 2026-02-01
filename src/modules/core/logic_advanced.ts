/**
 * ============================================================
 * 高级逻辑模块 (Advanced Logic Module)
 * ============================================================
 * 
 * 提供 switch-case 控制流积木:
 * - controls_switch: 主积木，支持多个 case 和 default
 * - controls_switch_case: 子积木，作为 case 条目
 * - controls_switch_default: 子积木，作为 default 分支
 * 
 * 通过 Mutator 支持动态添加/移除 case 分支。
 * 
 * @file src/modules/core/logic_advanced.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-nocheck
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('controls_switch_case', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_CASE);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(210);
            this.contextMenu = false;
        }
    }, () => '');

    registerBlock('controls_switch_default', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_DEFAULT);
            this.setPreviousStatement(true);
            this.setColour(210);
            this.contextMenu = false;
        }
    }, () => '');

    registerBlock('controls_switch_container', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CONTROLS_SWITCH);
            this.appendStatementInput("STACK");
            this.setColour(210);
            this.contextMenu = false;
        }
    }, () => '');

    // --- Switch Block (Main) ---
    registerBlock('controls_switch', {
        init: function () {
            this.appendValueInput("SWITCH_VAL")
                .appendField(Blockly.Msg.ARD_CONTROLS_SWITCH);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_CONTROLS_SWITCH_TOOLTIP);

            this.caseCount_ = 0;
            this.hasDefault_ = false;

            const quarkNames = ['controls_switch_case', 'controls_switch_default'];
            // FIXED: 只使用 v12 API
            if (Blockly.icons && Blockly.icons.MutatorIcon) {
                this.setMutator(new Blockly.icons.MutatorIcon(quarkNames, this));
            }
        },

        mutationToDom: function () {
            const container = Blockly.utils.xml.createElement('mutation');
            container.setAttribute('case_count', String(this.caseCount_));
            container.setAttribute('has_default', String(this.hasDefault_));
            return container;
        },

        domToMutation: function (xml: any) {
            this.caseCount_ = parseInt(xml.getAttribute('case_count') || '0');
            this.hasDefault_ = (xml.getAttribute('has_default') === 'true');
            this.updateShape_();
        },

        saveExtraState: function () {
            return {
                'caseCount': this.caseCount_,
                'hasDefault': this.hasDefault_
            };
        },

        loadExtraState: function (state: any) {
            this.caseCount_ = state['caseCount'];
            this.hasDefault_ = state['hasDefault'];
            this.updateShape_();
        },

        decompose: function (workspace: any) {
            const containerBlock = workspace.newBlock('controls_switch_container');
            containerBlock.initSvg();
            let connection = containerBlock.getInput('STACK').connection;

            for (let i = 0; i < this.caseCount_; i++) {
                const caseBlock = workspace.newBlock('controls_switch_case');
                caseBlock.initSvg();
                connection.connect(caseBlock.previousConnection);
                connection = caseBlock.nextConnection;
            }

            if (this.hasDefault_) {
                const defaultBlock = workspace.newBlock('controls_switch_default');
                defaultBlock.initSvg();
                connection.connect(defaultBlock.previousConnection);
            }

            return containerBlock;
        },

        compose: function (containerBlock: any) {
            let itemBlock = containerBlock.getInputTargetBlock('STACK');
            this.caseCount_ = 0;
            this.hasDefault_ = false;

            const valueConnections: any[] = [];
            const statementConnections: any[] = [];
            let defaultConnection: any = null;

            while (itemBlock) {
                if (itemBlock.type === 'controls_switch_case') {
                    this.caseCount_++;
                    valueConnections.push(itemBlock.valueConnection_);
                    statementConnections.push(itemBlock.statementConnection_);
                } else if (itemBlock.type === 'controls_switch_default') {
                    this.hasDefault_ = true;
                    defaultConnection = itemBlock.statementConnection_;
                }
                itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
            }

            this.updateShape_();

            for (let i = 0; i < this.caseCount_; i++) {
                if (valueConnections[i]) this.getInput('CASE' + i).connection.connect(valueConnections[i]);
                if (statementConnections[i]) this.getInput('DO' + i).connection.connect(statementConnections[i]);
            }
            if (this.hasDefault_ && defaultConnection) {
                this.getInput('DEFAULT').connection.connect(defaultConnection);
            }
        },

        saveConnections: function (containerBlock: any) {
            let itemBlock = containerBlock.getInputTargetBlock('STACK');
            let i = 0;
            while (itemBlock) {
                if (itemBlock.type === 'controls_switch_case') {
                    const inputValue = this.getInput('CASE' + i);
                    const inputStatement = this.getInput('DO' + i);
                    itemBlock.valueConnection_ = inputValue && inputValue.connection.targetConnection;
                    itemBlock.statementConnection_ = inputStatement && inputStatement.connection.targetConnection;
                    i++;
                } else if (itemBlock.type === 'controls_switch_default') {
                    const inputDefault = this.getInput('DEFAULT');
                    itemBlock.statementConnection_ = inputDefault && inputDefault.connection.targetConnection;
                }
                itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
            }
        },

        updateShape_: function () {
            let i = 0;
            while (this.getInput('CASE' + i)) {
                this.removeInput('CASE' + i);
                this.removeInput('DO' + i);
                i++;
            }
            if (this.getInput('DEFAULT')) {
                this.removeInput('DEFAULT');
            }

            for (let i = 0; i < this.caseCount_; i++) {
                this.appendValueInput('CASE' + i)
                    .setAlign(Blockly.inputs.Align.RIGHT)
                    .appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_CASE);
                this.appendStatementInput('DO' + i)
                    .appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_DO);
            }

            if (this.hasDefault_) {
                this.appendStatementInput('DEFAULT')
                    .appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_DEFAULT);
            }
        }
    }, function (block: any) {
        const switchVal = arduinoGenerator.valueToCode(block, 'SWITCH_VAL', Order.NONE) || '0';
        let code = `switch (${switchVal}) {\n`;

        for (let i = 0; i < block.caseCount_; i++) {
            const caseVal = arduinoGenerator.valueToCode(block, 'CASE' + i, Order.NONE) || '0';
            const branch = arduinoGenerator.statementToCode(block, 'DO' + i);
            code += `  case ${caseVal}:\n${branch}    break;\n`;
        }

        if (block.hasDefault_) {
            const defaultBranch = arduinoGenerator.statementToCode(block, 'DEFAULT');
            code += `  default:\n${defaultBranch}    break;\n`;
        }

        code += `}\n`;
        return code;
    });
};

export const LogicAdvancedModule: BlockModule = {
    id: 'core.logic_advanced',
    name: 'Advanced Logic',
    init
};