// @ts-nocheck
/**
 * 数组模块 (Arrays Module)
 * 
 * 包含数组定义、访问和操作积木，以及相关的 Mutator 辅助块。
 */
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../../generators/arduino-base';
import { VAR_TYPES } from '../system';
import { COLOUR_STRUCT, appendArrayDropdown } from './utils';

// ============================================================
// 数组维度 Mutator (Array Dimension Mutator)
// ============================================================

const arrayDimMutator = {
    mutationToDom: function () {
        const container = Blockly.utils.xml.createElement('mutation');
        container.setAttribute('dims', this.dimCount_);
        return container;
    },
    domToMutation: function (xml: any) {
        this.dimCount_ = parseInt(xml.getAttribute('dims') || 1);
        this.updateShape_();
    },
    saveExtraState: function () {
        return { dimCount: this.dimCount_ };
    },
    loadExtraState: function (state: any) {
        this.dimCount_ = state.dimCount || 1;
        this.updateShape_();
    },
    decompose: function (ws: any) {
        const container = ws.newBlock('c_array_dims_container');
        container.initSvg();
        let connection = container.getInput('STACK').connection;
        for (let i = 0; i < this.dimCount_; i++) {
            const item = ws.newBlock('c_array_dim_item');
            item.initSvg();
            connection.connect(item.previousConnection);
            connection = item.nextConnection;
        }
        return container;
    },
    compose: function (containerBlock: any) {
        let itemBlock = containerBlock.getInputTargetBlock('STACK');
        const connections = [];
        while (itemBlock) {
            connections.push(itemBlock.valueConnection_);
            itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
        }
        this.dimCount_ = connections.length;
        this.updateShape_();
        for (let i = 0; i < this.dimCount_; i++) {
            if (connections[i]) {
                this.getInput('INDEX' + i).connection.connect(connections[i]);
            }
        }
    },
    saveConnections: function (containerBlock: any) {
        let itemBlock = containerBlock.getInputTargetBlock('STACK');
        let i = 0;
        while (itemBlock) {
            const input = this.getInput('INDEX' + i);
            itemBlock.valueConnection_ = input && input.connection.targetConnection;
            itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
            i++;
        }
    },
    updateShape_: function () {
        let i = 0;
        while (this.getInput('INDEX' + i)) { this.removeInput('INDEX' + i); i++; }
        if (this.getInput('DUMMY_END')) this.removeInput('DUMMY_END');
        if (this.getInput('VALUE')) this.removeInput('VALUE');

        for (let j = 0; j < this.dimCount_; j++) {
            this.appendValueInput('INDEX' + j).setCheck("Number").appendField("[");
            this.appendDummyInput('DUMMY_CLOSE_' + j).appendField("]");
        }

        if (this.type === 'c_array_set_element') {
            this.appendValueInput("VALUE").appendField("=");
        }
    }
};

// ============================================================
// 初始化数组积木 (Initialize Array Blocks)
// ============================================================

export function initArrayBlocks() {
    /**
     * 数组定义
     * @param {String} TYPE 数组元素类型
     * @param {String} VAR 数组变量名
     * @param {Number} SIZE 数组长度 (方括号内的数值)
     * @param {Any[]} [items] 初始元素列表 (由子项 Mutator 提供)
     */
    registerBlock('c_array_define', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ARRAY_DECLARE)
                .appendField(new Blockly.FieldDropdown(VAR_TYPES), "TYPE")
                .appendField(new Blockly.FieldTextInput("myArr"), "VAR");
            this.appendValueInput("SIZE").setCheck("Number").appendField(Blockly.Msg.ARD_ARRAY_SIZE);
            this.appendDummyInput().appendField("]");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOUR_STRUCT);
            this.setInputsInline(true);
            this.itemCount_ = 0;
            if (Blockly.icons?.MutatorIcon) this.setMutator(new Blockly.icons.MutatorIcon(['c_array_init_item'], this));
        },
        mutationToDom: function () {
            const c = Blockly.utils.xml.createElement('mutation');
            c.setAttribute('items', this.itemCount_);
            return c;
        },
        domToMutation: function (xml: any) {
            this.itemCount_ = parseInt(xml.getAttribute('items') || 0);
            this.updateShape_();
        },
        saveExtraState: function () { return { itemCount: this.itemCount_ }; },
        loadExtraState: function (state: any) { this.itemCount_ = state.itemCount || 0; this.updateShape_(); },
        decompose: function (ws: any) {
            const c = ws.newBlock('c_array_init_container');
            c.initSvg();
            let conn = c.getInput('STACK').connection;
            for (let i = 0; i < this.itemCount_; i++) {
                const it = ws.newBlock('c_array_init_item');
                it.initSvg();

                let val = '0';
                const input = this.getInput('ELEM' + i);
                if (input && input.connection && input.connection.targetConnection) {
                    const target = input.connection.targetConnection.getSourceBlock();
                    if (target.isShadow() && target.type === 'math_number') {
                        val = target.getFieldValue('NUM');
                    }
                }
                it.setFieldValue(val, 'VAL');

                conn.connect(it.previousConnection);
                conn = it.nextConnection;
            }
            return c;
        },
        compose: function (c: any) {
            let it = c.getInputTargetBlock('STACK');
            const conns = [];
            this.defaultValues_ = [];
            while (it) {
                if (it.valueConnection_) {
                    const targetBlock = it.valueConnection_.getSourceBlock();
                    if (targetBlock && targetBlock.type === 'math_number') {
                        const liveVal = targetBlock.getFieldValue('NUM');
                        it.setFieldValue(liveVal, 'VAL');
                    }

                    if (targetBlock && targetBlock.isShadow()) {
                        conns.push(null);
                    } else {
                        conns.push(it.valueConnection_);
                    }
                } else {
                    conns.push(null);
                }

                const val = it.getFieldValue('VAL');
                this.defaultValues_.push(val || '');

                it = it.nextConnection?.targetBlock();
            }

            Blockly.Events.disable();
            try {
                this.itemCount_ = conns.length;
                this.updateShape_();
                for (let i = 0; i < this.itemCount_; i++) {
                    if (conns[i]) {
                        const input = this.getInput('ELEM' + i);
                        if (input && input.connection) {
                            input.connection.connect(conns[i]);
                            const target = conns[i].getSourceBlock();
                            if (target.type === 'math_number') {
                                target.setFieldValue(this.defaultValues_[i], 'NUM');
                            }
                        }
                    }
                }
            } finally {
                Blockly.Events.enable();
            }
        },
        saveConnections: function (c: any) {
            let it = c.getInputTargetBlock('STACK');
            let i = 0;
            while (it) {
                const input = this.getInput('ELEM' + i);
                it.valueConnection_ = input && input.connection && input.connection.targetConnection;
                it = it.nextConnection && it.nextConnection.targetBlock();
                i++;
            }
        },
        updateShape_: function () {
            if (this.shadowTimer_) clearTimeout(this.shadowTimer_);

            Blockly.Events.disable();
            try {
                let i = 0;
                while (this.getInput('ELEM' + i)) { this.removeInput('ELEM' + i); i++; }
                if (this.getInput('INIT_START')) this.removeInput('INIT_START');
                if (this.getInput('INIT_END')) this.removeInput('INIT_END');

                if (this.itemCount_ > 0) {
                    this.appendDummyInput('INIT_START').appendField("= {");
                    for (let j = 0; j < this.itemCount_; j++) {
                        const inputName = 'ELEM' + j;
                        this.appendValueInput(inputName).setAlign(Blockly.inputs.Align.RIGHT);
                        const seedValue = (this.defaultValues_ && this.defaultValues_[j]) ? this.defaultValues_[j] : '0';

                        if (this.workspace && !this.isInFlyout) {
                            if (seedValue !== '') {
                                this.shadowTimer_ = setTimeout(() => {
                                    Blockly.Events.disable();
                                    try {
                                        if (this.disposed) return;
                                        const currentInput = this.getInput(inputName);
                                        if (currentInput && currentInput.connection) {
                                            const target = currentInput.connection.targetConnection;
                                            if (!target || !target.getSourceBlock().isShadow()) {
                                                const shadow = this.workspace.newBlock('math_number');
                                                shadow.setShadow(true);
                                                shadow.setFieldValue(seedValue, 'NUM');
                                                shadow.initSvg();
                                                shadow.render();

                                                if (!target) {
                                                    currentInput.connection.connect(shadow.outputConnection);
                                                } else {
                                                    currentInput.connection.setShadowDom(shadow.toXml());
                                                    shadow.dispose();
                                                }
                                            } else if (target.getSourceBlock().isShadow()) {
                                                target.getSourceBlock().setFieldValue(seedValue, 'NUM');
                                            }
                                        }
                                    } catch (e) {
                                        console.warn("[Blockly] Shadow creation failed:", e);
                                    } finally {
                                        Blockly.Events.enable();
                                    }
                                }, 10);
                            } else {
                                const currentInput = this.getInput(inputName);
                                if (currentInput && currentInput.connection && currentInput.connection.targetConnection) {
                                    const target = currentInput.connection.targetConnection.getSourceBlock();
                                    if (target.isShadow()) {
                                        target.dispose();
                                    }
                                }
                            }
                        }
                    }
                    this.appendDummyInput('INIT_END').appendField("}");
                }
            } finally {
                Blockly.Events.enable();
            }
        }
    }, function (block: any) {
        const type = block.getFieldValue('TYPE');
        const name = cleanName(block.getFieldValue('VAR'));
        const size = arduinoGenerator.valueToCode(block, 'SIZE', Order.ATOMIC) || '';
        let init = "";
        if (block.itemCount_ > 0) {
            const el = [];
            for (let i = 0; i < block.itemCount_; i++) el.push(arduinoGenerator.valueToCode(block, 'ELEM' + i, Order.ATOMIC) || '0');
            init = ` = { ${el.join(', ')} }`;
        }
        if (!size && !init) return '';
        const code = `${type} ${name} [${size}]${init}; `;
        if (!block.getSurroundParent()) {
            arduinoGenerator.addVariable('arr_' + name, code);
            return '';
        }
        return code + '\n';
    });

    /**
     * 数组初始化容器
     */
    registerBlock('c_array_init_container', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_ARRAY_INIT);
            this.appendStatementInput("STACK");
            this.setColour(COLOUR_STRUCT);
            this.contextMenu = false;
        }
    }, () => '');

    /**
     * 数组初始化项
     * @param {String} VAL 默认值
     */
    registerBlock('c_array_init_item', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_ARRAY_ITEM).appendField(new Blockly.FieldTextInput("0"), "VAL");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(COLOUR_STRUCT);
            this.contextMenu = false;
        }
    }, () => '');

    /**
     * 数组维度容器
     */
    registerBlock('c_array_dims_container', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_ARRAY_DIMS || "Dimensions");
            this.appendStatementInput("STACK");
            this.setColour(COLOUR_STRUCT);
            this.contextMenu = false;
        }
    }, () => '');

    /**
     * 数组维度项
     */
    registerBlock('c_array_dim_item', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_ARRAY_DIM || "Dimension");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(COLOUR_STRUCT);
            this.contextMenu = false;
        }
    }, () => '');

    /**
     * 获取数组元素
     * @param {String} VAR 数组名
     * @param {Number[]} INDEX 维度索引列表
     * @return {Any} 存储在指定位置的元素
     */
    registerBlock('c_array_get_element', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_ARRAY_GET);
            appendArrayDropdown(this);
            this.dimCount_ = 1;
            this.updateShape_();
            this.setOutput(true, null);
            this.setColour(COLOUR_STRUCT);
            this.setInputsInline(true);
            if (Blockly.icons?.MutatorIcon) this.setMutator(new Blockly.icons.MutatorIcon(['c_array_dim_item'], this));
        },
        ...arrayDimMutator,
        updateShape_: function () {
            let i = 0;
            while (this.getInput('INDEX' + i)) { this.removeInput('INDEX' + i); i++; }
            while (this.getInput('DUMMY_CLOSE_' + i)) { this.removeInput('DUMMY_CLOSE_' + i); i++; }

            for (let j = 0; j < this.dimCount_; j++) {
                this.appendValueInput('INDEX' + j).setCheck("Number").appendField("[");
                this.appendDummyInput('DUMMY_CLOSE_' + j).appendField("]");
            }
        }
    }, function (block: any) {
        let access = "";
        for (let i = 0; i < block.dimCount_; i++) {
            const idx = arduinoGenerator.valueToCode(block, 'INDEX' + i, Order.ATOMIC) || '0';
            access += `[${idx}]`;
        }
        if (!access) access = "[0]";
        return [`${cleanName(block.getFieldValue('VAR'))}${access}`, Order.ATOMIC];
    });

    /**
     * 设置数组元素值
     * @param {String} VAR 数组名
     * @param {Number[]} INDEX 维度索引列表
     * @param {Any} VALUE 要设置的目标值
     */
    registerBlock('c_array_set_element', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_ARRAY_SET);
            appendArrayDropdown(this);
            this.dimCount_ = 1;
            this.updateShape_();
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOUR_STRUCT);
            this.setInputsInline(true);
            if (Blockly.icons?.MutatorIcon) this.setMutator(new Blockly.icons.MutatorIcon(['c_array_dim_item'], this));
        },
        ...arrayDimMutator,
        updateShape_: function () {
            if (this.getInput('VALUE')) this.removeInput('VALUE');
            let i = 0;
            while (this.getInput('INDEX' + i)) { this.removeInput('INDEX' + i); i++; }
            while (this.getInput('DUMMY_CLOSE_' + i)) { this.removeInput('DUMMY_CLOSE_' + i); i++; }

            for (let j = 0; j < this.dimCount_; j++) {
                this.appendValueInput('INDEX' + j).setCheck("Number").appendField("[");
                this.appendDummyInput('DUMMY_CLOSE_' + j).appendField("]");
            }
            this.appendValueInput("VALUE").appendField("=");
        }
    }, function (block: any) {
        let access = "";
        for (let i = 0; i < block.dimCount_; i++) {
            const idx = arduinoGenerator.valueToCode(block, 'INDEX' + i, Order.ATOMIC) || '0';
            access += `[${idx}]`;
        }
        if (!access) access = "[0]";
        const val = arduinoGenerator.valueToCode(block, 'VALUE', Order.ASSIGNMENT) || '0';
        return `${cleanName(block.getFieldValue('VAR'))}${access} = ${val}; \n`;
    });

    /**
     * 获取整个数组引用
     * @param {String} VAR 数组名
     * @return {Any[]} 数组首地址/引用
     */
    registerBlock('c_array_get_whole', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_STRUCT_GET_WHOLE);
            appendArrayDropdown(this);
            this.setOutput(true, null);
            this.setColour(COLOUR_STRUCT);
        }
    }, function (block: any) {
        return [cleanName(block.getFieldValue('VAR')), Order.ATOMIC];
    });
}
