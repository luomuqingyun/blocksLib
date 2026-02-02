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


/**
 * 模块初始化函数
 * 注册 C++ 风格的高级逻辑控制积木，如 switch-case 结构。
 */
const init = () => {

    // =========================================================================
    // Switch-Case 相关的辅助子积木 (Quarks)
    // 这些积木通常只出现在 Mutator 弹出窗口中，用于配置主积木的形状。
    // =========================================================================

    /** Case 分支项 */
    registerBlock('controls_switch_case', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_CASE);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(210); // 逻辑类积木统一使用蓝色调
            this.contextMenu = false;
        }
    }, () => '');

    /** Default 默认分支项 */
    registerBlock('controls_switch_default', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_DEFAULT);
            this.setPreviousStatement(true);
            this.setColour(210);
            this.contextMenu = false;
        }
    }, () => '');

    /** Mutator 内部的根容器 */
    registerBlock('controls_switch_container', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_CONTROLS_SWITCH);
            this.appendStatementInput("STACK");
            this.setColour(210);
            this.contextMenu = false;
        }
    }, () => '');

    // =========================================================================
    // 主 Switch 积木 (Main Switch Block)
    // 支持动态增减 Case 分支和可选的 Default 分支。
    // =========================================================================
    registerBlock('controls_switch', {
        init: function () {
            this.appendValueInput("SWITCH_VAL")
                .appendField(Blockly.Msg.ARD_CONTROLS_SWITCH); // 匹配
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip(Blockly.Msg.ARD_CONTROLS_SWITCH_TOOLTIP);

            this.caseCount_ = 0;   // 记录 Case 分支数量
            this.hasDefault_ = false; // 记录是否存在 Default 分支

            const quarkNames = ['controls_switch_case', 'controls_switch_default'];
            // 启用 Mutator 允许交互式配置积木结构
            if (Blockly.icons && Blockly.icons.MutatorIcon) {
                this.setMutator(new Blockly.icons.MutatorIcon(quarkNames, this));
            }
        },

        // 序列化：将当前状态（分支数、是否有默认分支）写入 XML
        mutationToDom: function () {
            const container = Blockly.utils.xml.createElement('mutation');
            container.setAttribute('case_count', String(this.caseCount_));
            container.setAttribute('has_default', String(this.hasDefault_));
            return container;
        },

        // 反序列化：从 XML 恢复状态并更新积木外观
        domToMutation: function (xml: any) {
            this.caseCount_ = parseInt(xml.getAttribute('case_count') || '0');
            this.hasDefault_ = (xml.getAttribute('has_default') === 'true');
            this.updateShape_();
        },

        // 用于保存撤销/重做状态
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

        /**
         * 分解 (Decompose)
         * 当用户点击 Mutator 图标时，创建一个小型工作区，并根据当前状态在其中生成对应的子积木。
         */
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

        /**
         * 组合 (Compose)
         * 当用户在小型工作区移动子积木后，根据子积木的排列顺序重新配置主积木。
         */
        compose: function (containerBlock: any) {
            let itemBlock = containerBlock.getInputTargetBlock('STACK');
            this.caseCount_ = 0;
            this.hasDefault_ = false;

            const valueConnections: any[] = [];
            const statementConnections: any[] = [];
            let defaultConnection: any = null;

            // 遍历并记录旧有的积木连接，以便在重绘后恢复它们
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

            // 重新连接之前保存的积木
            for (let i = 0; i < this.caseCount_; i++) {
                if (valueConnections[i]) this.getInput('CASE' + i).connection.connect(valueConnections[i]);
                if (statementConnections[i]) this.getInput('DO' + i).connection.connect(statementConnections[i]);
            }
            if (this.hasDefault_ && defaultConnection) {
                this.getInput('DEFAULT').connection.connect(defaultConnection);
            }
        },

        /**
         * 保存连接 (Save Connections)
         * 在 compose 之前被调用，记录当前每个插槽上连接的外部积木。
         */
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

        /**
         * 更新形状 (Update Shape)
         * 物理移除旧的输入槽，并根据最新的计数动态生成新的输入槽。
         */
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
                    .appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_CASE); // 情况
                this.appendStatementInput('DO' + i)
                    .appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_DO); // 执行
            }

            if (this.hasDefault_) {
                this.appendStatementInput('DEFAULT')
                    .appendField(Blockly.Msg.ARD_CONTROLS_SWITCH_DEFAULT); // 默认
            }
        }
    }, function (block: any) {
        // 【代码生成器核心逻辑】
        const switchVal = arduinoGenerator.valueToCode(block, 'SWITCH_VAL', Order.NONE) || '0';
        let code = `switch (${switchVal}) {\n`;

        for (let i = 0; i < block.caseCount_; i++) {
            const caseVal = arduinoGenerator.valueToCode(block, 'CASE' + i, Order.NONE) || '0';
            const branch = arduinoGenerator.statementToCode(block, 'DO' + i);
            // 每个 case 分支后必须手动补上 break，除非需要 fallthrough，但积木通常默认含 break
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

/**
 * 高级逻辑模块定义
 * 提供了比基础 if-else 更复杂的控制流积木。
 */
export const LogicAdvancedModule: BlockModule = {
    id: 'core.logic_advanced',
    name: 'Advanced Logic',
    init
};
