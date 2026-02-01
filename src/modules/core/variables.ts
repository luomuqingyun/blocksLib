/**
 * ============================================================
 * 变量系统模块 (Variables System Module)
 * ============================================================
 * 
 * 提供完整的变量管理系统积木:
 * - 全局/局部变量: 声明、赋值、获取
 * - 数组: 创建、访问、修改
 * - 结构体: 定义、实例化、字段访问
 * - 宏定义: #define
 * - 参数定义: 函数参数
 * 
 * 支持动态类型选择和变量扫描。
 * 
 * @file src/modules/core/variables.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-nocheck
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../generators/arduino-base';
import { scanVariablesCategorized, getUserTypesDropdownOptions } from '../../utils/variable_scanner';
import { VAR_TYPES } from './system';
import { BlockModule } from '../../registries/ModuleRegistry';


// 从共享工具模块导入
import {
    COLOUR_GLOBAL, COLOUR_LOCAL, COLOUR_PARAM, COLOUR_STRUCT, COLOUR_MACRO,
    VAR_QUALIFIERS, ColorUpdateMixin,
    createDropdown, appendVarGetDropdown, appendVarSetDropdown, appendArrayDropdown,
    appendStructDropdown, appendEnumDropdown, appendEnumItemDropdown, appendMacroDropdown, appendMemberDropdown
} from './variables/utils';

// ------------------------------------------------------------------
// 核心变量模块 (Core Variables Module)
// ------------------------------------------------------------------
// 包含:
// 1. 变量声明 (Declare)
// 2. 宏定义 (Macro / #define)
// 3. 数组操作 (Arrays)
// 4. 结构体定义 (Structs)
// 5. 枚举定义 (Enums)
// 6. 指针操作 (Pointers)
// ------------------------------------------------------------------


const init = () => {
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
    registerBlock('c_macro_define', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_MACRO_DEFINE)
                .appendField(new Blockly.FieldTextInput("CONSTANT"), "NAME")
                .appendField(new Blockly.FieldTextInput("VAL"), "VALUE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOUR_MACRO);
        }
    }, function (block: any) {
        const name = block.getFieldValue('NAME');
        arduinoGenerator.addMacro(name, `#define ${name} ${block.getFieldValue('VALUE')} \n`);
        return '';
    });

    registerBlock('c_macro_get', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_MACRO_GET);
            this.setOutput(true, null);
            this.setColour(COLOUR_MACRO);
            appendMacroDropdown(this);
        }
    }, function (block: any) {
        return [cleanName(block.getFieldValue('VAR')), Order.ATOMIC];
    });

    registerBlock('c_include', {
        init: function () {
            this.appendDummyInput()
                .appendField("#include")
                .appendField(new Blockly.FieldTextInput("<Servo.h>"), "HEADER");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOUR_MACRO);
        }
    }, function (block: any) {
        const header = block.getFieldValue('HEADER');
        if (arduinoGenerator.addInclude) {
            arduinoGenerator.addInclude('include_manual_' + header, `#include ${header}`);
        }
        return '';
    });

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
        mutationToDom: function () { const c = Blockly.utils.xml.createElement('mutation'); c.setAttribute('items', this.itemCount_); return c; },
        domToMutation: function (xml: any) { this.itemCount_ = parseInt(xml.getAttribute('items') || 0); this.updateShape_(); },
        saveExtraState: function () { return { itemCount: this.itemCount_ }; },
        loadExtraState: function (state: any) { this.itemCount_ = state.itemCount || 0; this.updateShape_(); },
        decompose: function (ws: any) {
            const c = ws.newBlock('c_array_init_container');
            c.initSvg();
            let conn = c.getInput('STACK').connection;
            for (let i = 0; i < this.itemCount_; i++) {
                const it = ws.newBlock('c_array_init_item');
                it.initSvg();

                // Sync val from main block shadow if possible
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
                // Bi-directional Sync: Pull value from workspace back to mutator
                if (it.valueConnection_) {
                    const targetBlock = it.valueConnection_.getSourceBlock();
                    // Grab value from ANY connected block (shadow or real math_number)
                    if (targetBlock && targetBlock.type === 'math_number') {
                        const liveVal = targetBlock.getFieldValue('NUM');
                        it.setFieldValue(liveVal, 'VAL');
                    }

                    if (targetBlock && targetBlock.isShadow()) {
                        conns.push(null); // Discard shadow connection, handled by updateShape_
                    } else {
                        conns.push(it.valueConnection_); // Keep real block
                    }
                } else {
                    conns.push(null);
                }

                // Capture the 'VAL' field from the mutator item to seed new blocks
                const val = it.getFieldValue('VAL');
                this.defaultValues_.push(val || ''); // Respect empty string!

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
                            // LIVE UPDATE: If a real block is connected, update its value to match mutator
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
                // Save the connection from the MAIN block to the MUTATOR block object
                it.valueConnection_ = input && input.connection && input.connection.targetConnection;
                it = it.nextConnection && it.nextConnection.targetBlock();
                i++;
            }
        },
        updateShape_: function () {
            // Cancel any pending shadow creation to prevent stale operations
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
                        const input = this.appendValueInput(inputName).setAlign(Blockly.inputs.Align.RIGHT);
                        const seedValue = (this.defaultValues_ && this.defaultValues_[j]) ? this.defaultValues_[j] : '0';

                        if (this.workspace && !this.isInFlyout) {
                            // Only schedule shadow creation if we HAVE a value
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
                                                    // @ts-ignore
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
                                // If seed is empty, ensure no shadow exists
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
    registerBlock('c_array_init_container', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_ARRAY_INIT);
            this.appendStatementInput("STACK");
            this.setColour(COLOUR_STRUCT);
            this.contextMenu = false;
        }
    }, () => '');

    registerBlock('c_array_init_item', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_ARRAY_ITEM).appendField(new Blockly.FieldTextInput("0"), "VAL");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(COLOUR_STRUCT);
            this.contextMenu = false;
        }
    }, () => '');

    // --- Helper for Array Dimensions Mutator ---
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
            // Reconnect
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
            // Remove existing inputs
            let i = 0;
            while (this.getInput('INDEX' + i)) {
                this.removeInput('INDEX' + i);
                i++;
            }
            if (this.getInput('DUMMY_END')) this.removeInput('DUMMY_END');
            if (this.getInput('VALUE')) this.removeInput('VALUE'); // For set block

            // Rebuild
            for (let j = 0; j < this.dimCount_; j++) {
                const input = this.appendValueInput('INDEX' + j).setCheck("Number").appendField("[");
                this.appendDummyInput('DUMMY_CLOSE_' + j).appendField("]");
                // Merge dummy into value input line? No, standard blockly value input doesn't carry tail text nicely in same line without inline
                // Actually, appendField("]") to the value input puts it BEFORE the input? No.
                // Value Input: Label -> Input socket.
                // To put "]" after: we need a dummy input or append to the next input.
                // Let's use setInputsInline(true) and just append dummy inputs for brackets.
                // But wait, the standard way is: Input( "[" ) -> Socket -> Dummy( "]" ) ?
                // Current implementation: appendValueInput...appendField("[") ... appendDummy...appendField("]")
            }

            // Restore 'VALUE' input for set block
            if (this.type === 'c_array_set_element') {
                this.appendValueInput("VALUE").appendField("=");
            }
        }
    };

    // Register Mutator Blocks
    registerBlock('c_array_dims_container', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_ARRAY_DIMS || "Dimensions");
            this.appendStatementInput("STACK");
            this.setColour(COLOUR_STRUCT);
            this.contextMenu = false;
        }
    }, () => '');
    registerBlock('c_array_dim_item', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_ARRAY_DIM || "Dimension");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(COLOUR_STRUCT);
            this.contextMenu = false;
        }
    }, () => '');

    registerBlock('c_array_get_element', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_ARRAY_GET);
            appendArrayDropdown(this);
            this.dimCount_ = 1;
            this.updateShape_(); // Initial 1 dim
            this.setOutput(true, null);
            this.setColour(COLOUR_STRUCT);
            this.setInputsInline(true);
            if (Blockly.icons?.MutatorIcon) this.setMutator(new Blockly.icons.MutatorIcon(['c_array_dim_item'], this));
        },
        ...arrayDimMutator,
        updateShape_: function () {
            // Specialized update for GET
            let i = 0;
            // Clear all potentially existing
            while (this.getInput('INDEX' + i)) { this.removeInput('INDEX' + i); i++; }
            while (this.getInput('DUMMY_CLOSE_' + i)) { this.removeInput('DUMMY_CLOSE_' + i); i++; } // Remove loose dummies

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
            // Specialized update for SET
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

    registerBlock('c_array_get_whole', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_STRUCT_GET_WHOLE); // Using similar concept
            appendArrayDropdown(this);
            this.setOutput(true, null);
            this.setColour(COLOUR_STRUCT);
        }
    }, function (block: any) {
        return [cleanName(block.getFieldValue('VAR')), Order.ATOMIC];
    });

    registerBlock('c_struct_define', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_STRUCT_DEFINE).appendField(new Blockly.FieldTextInput("MyStruct"), "NAME");
            this.setColour(COLOUR_STRUCT);
            this.members_ = [];
            if (Blockly.icons?.MutatorIcon) this.setMutator(new Blockly.icons.MutatorIcon(['c_struct_member_item'], this));
        },
        mutationToDom: function () {
            const container = Blockly.utils.xml.createElement('mutation');
            container.setAttribute('count', String(this.members_.length));
            return container;
        },
        domToMutation: function (xml: any) {
            this.updateShape_();
        },
        saveExtraState: function () { return { members: this.members_ } },
        loadExtraState: function (s: any) { this.members_ = s.members || []; this.updateShape_() },
        decompose: function (ws: any) {
            const c = ws.newBlock('c_struct_container');
            c.initSvg();
            let conn = c.getInput('STACK').connection;
            for (let m of this.members_) {
                const it = ws.newBlock('c_struct_member_item');
                it.setFieldValue(m.type, 'TYPE');
                it.setFieldValue(m.name, 'NAME');
                it.setFieldValue(m.arr || '', 'ARR');
                it.initSvg();
                conn.connect(it.previousConnection);
                conn = it.nextConnection;
            }
            return c;
        },
        compose: function (c: any) {
            const newMem = [];
            let it = c.getInputTargetBlock('STACK');
            while (it) {
                let type = it.getFieldValue('TYPE');
                // Legacy Migration: If block still has PTR field (from old definition in memory) or if we are adapting logic
                // Actually, standard Blockly getFieldValue returns null if field doesn't exist.
                // But if the block was created with the OLD init, it might have the field?
                // Re-init happens on load.
                // However, we can't easily access the old checkbox value if it's gone from UI.
                // Wait! 'compose' reads from the MUTATOR blocks. failing to read 'PTR' is fine if we accept the type as is.
                // But if the User is using the NEW block, there is no PTR field.
                // The Type string holds the truth.
                newMem.push({ type: type, name: it.getFieldValue('NAME'), arr: it.getFieldValue('ARR') });
                it = it.nextConnection && it.nextConnection.targetBlock();
            }
            this.members_ = newMem;
            this.updateShape_();
        },
        updateShape_: function () {
            let i = 0; while (this.getInput('MEM_' + i)) { this.removeInput('MEM_' + i); i++ }
            if (this.getInput('MEM_END')) this.removeInput('MEM_END');
            if (this.members_.length > 0) {
                this.appendDummyInput('MEM_0').appendField("{");
                for (let j = 0; j < this.members_.length; j++) {
                    const m = this.members_[j];
                    let desc = `  ${m.type} ${m.name}`;
                    if (m.arr) {
                        const parts = m.arr.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
                        desc += parts.map((p: string) => `[${p}]`).join('');
                    }
                    desc += `; `;
                    this.appendDummyInput('MEM_' + (j + 1)).appendField(desc);
                }
                this.appendDummyInput('MEM_END').appendField("};");
            }
        }
    }, function (block: any) {
        const name = cleanName(block.getFieldValue('NAME'));
        if (this.members_.length === 0) return null;
        let f = "";
        for (let m of this.members_) {
            let line = `  ${m.type} ${m.name}`;
            if (m.arr) {
                const parts = m.arr.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
                line += parts.map((p: string) => `[${p}]`).join('');
            }
            line += `; \n`;
            f += line;
        }
        if (arduinoGenerator.addType) {
            arduinoGenerator.addType(name, `struct ${name} { \n${f} }; \n`);
        }
        return null;
    });
    registerBlock('c_struct_container', { init: function () { this.appendDummyInput().appendField(Blockly.Msg.ARD_STRUCT_MEMBERS); this.appendStatementInput("STACK"); this.setColour(COLOUR_STRUCT); this.contextMenu = false; } }, () => '');
    registerBlock('c_struct_member_item', {
        init: function () {
            // Smart Dropdown: Includes Basic Types + User Structs + Struct Pointers
            const dd = createDropdown(this, (ws: any, current: string) => {
                const options = [...VAR_TYPES]; // Start with basic types
                // Add Structs and Struct Pointers
                const vars = scanVariablesCategorized(ws);
                Array.from(vars.structDefinitions.keys()).sort().forEach(name => {
                    if (!options.some(o => o[1] === name)) {
                        options.push([name, name]);
                        options.push([name + '*', name + '*']); // Auto-add pointer type
                    }
                });

                // Ensure current value is valid
                if (current && !options.some(o => o[1] === current)) {
                    options.unshift([current, current]);
                }
                return options;
            });

            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STRUCT_MEMBER)
                .appendField(dd, "TYPE")
                .appendField(new Blockly.FieldTextInput("m"), "NAME")
                .appendField("[")
                .appendField(new Blockly.FieldTextInput(""), "ARR")
                .appendField("]");

            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(COLOUR_STRUCT);
            this.setInputsInline(true);
            this.contextMenu = false;
            this.setTooltip(Blockly.Msg.ARD_VAR_STRUCT_MEMBER_TOOLTIP);
        }

    }, () => '');

    registerBlock('c_enum_define', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_ENUM_DEFINE).appendField(new Blockly.FieldTextInput("MyState"), "NAME");
            this.setColour(COLOUR_STRUCT);
            this.items_ = []; // State: {name: string, seed: string}
            if (Blockly.icons?.MutatorIcon) this.setMutator(new Blockly.icons.MutatorIcon(['c_enum_item'], this));
        },
        mutationToDom: function () {
            const c = Blockly.utils.xml.createElement('mutation');
            // Serialize items state
            c.setAttribute('items', JSON.stringify(this.items_));
            return c;
        },
        domToMutation: function (xml: any) {
            try {
                const attr = xml.getAttribute('items');
                if (attr.startsWith('[')) {
                    this.items_ = JSON.parse(attr);
                } else {
                    // Legacy count support
                    const count = parseInt(attr || 0);
                    this.items_ = [];
                    for (let i = 0; i < count; i++) this.items_.push({ name: 'ITEM_' + i, seed: '' });
                }
            } catch (e) { this.items_ = []; }
            this.updateShape_();
        },
        saveExtraState: function () { return { items: this.items_ }; },
        loadExtraState: function (state: any) {
            // [Fix]: Handle case where extraState is a legacy XML string (e.g. from older JSON serialization)
            if (typeof state === 'string' && state.startsWith('<mutation')) {
                try {
                    // Extract 'items' count or json data from the XML string
                    // 1. Try JSON in attribute
                    const itemsMatch = state.match(/items='([^']+)'/) || state.match(/items="([^"]+)"/);
                    if (itemsMatch) {
                        const val = itemsMatch[1];
                        if (val.startsWith('[')) {
                            this.items_ = JSON.parse(val.replace(/&quot;/g, '"'));
                        } else {
                            // Legacy integer count
                            const count = parseInt(val);
                            this.items_ = [];
                            for (let i = 0; i < count; i++) this.items_.push({ name: 'ITEM_' + i, seed: '' });
                        }
                    }
                } catch (e) { console.warn('Failed to parse legacy extraState string', e); }
            }
            // Standard Object State
            else if (state.items) {
                this.items_ = state.items;
            } else if (state.itemCount !== undefined) {
                this.items_ = [];
                for (let i = 0; i < state.itemCount; i++) this.items_.push({ name: 'ITEM_' + i, seed: '' });
            }
            this.updateShape_();
        },
        decompose: function (ws: any) {
            const c = ws.newBlock('c_enum_container');
            c.initSvg();
            let conn = c.getInput('STACK').connection;
            for (let i = 0; i < this.items_.length; i++) {
                const it = ws.newBlock('c_enum_item');
                it.initSvg();
                const currentName = this.getFieldValue('NAME_' + i);
                const nameToSet = currentName !== null ? currentName : this.items_[i].name;
                it.setFieldValue(nameToSet, 'NAME');

                // Read LIVE value from the connection to populate mutator
                let val = '';
                const input = this.getInput('VAL_' + i);
                if (input && input.connection && input.connection.targetConnection) {
                    const target = input.connection.targetConnection.getSourceBlock();
                    if (target.type === 'math_number') {
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
            const newItems = [];
            const valueConnections = [];

            while (it) {
                // Bi-directional Sync: Pull value from workspace back to mutator
                if (it.valueConnection_) {
                    const targetBlock = it.valueConnection_.getSourceBlock();
                    if (targetBlock && targetBlock.type === 'math_number') {
                        const liveVal = targetBlock.getFieldValue('NUM');
                        it.setFieldValue(liveVal, 'VAL');
                    }

                    if (targetBlock && targetBlock.isShadow()) {
                        valueConnections.push(null); // Discard shadow, it will be recreated
                    } else {
                        valueConnections.push(it.valueConnection_); // Keep real block
                    }
                } else {
                    valueConnections.push(null);
                }

                newItems.push({
                    name: it.getFieldValue('NAME'),
                    seed: it.getFieldValue('VAL')
                });

                it = it.nextConnection?.targetBlock();
            }
            this.items_ = newItems;

            // Safe update sequence
            Blockly.Events.disable();
            try {
                this.updateShape_();

                // Reconnect Real Blocks and UPDATE their values
                valueConnections.forEach((conn: any, index: number) => {
                    const input = this.getInput('VAL_' + index);
                    if (input && input.connection) {
                        if (conn) {
                            input.connection.connect(conn);
                            // Live Sync: Update connected real block to match mutator
                            const target = conn.getSourceBlock();
                            if (target.type === 'math_number') {
                                target.setFieldValue(this.items_[index].seed, 'NUM');
                            }
                        }
                    }
                });
            } finally {
                Blockly.Events.enable();
            }
        },
        saveConnections: function (c: any) {
            let it = c.getInputTargetBlock('STACK');
            let i = 0;
            while (it) {
                const input = this.getInput('VAL_' + i);
                it.valueConnection_ = input && input.connection && input.connection.targetConnection;
                it = it.nextConnection && it.nextConnection.targetBlock();
                i++;
            }
        },
        updateShape_: function () {
            // Cancel any pending shadow creation
            if (this.shadowTimer_) clearTimeout(this.shadowTimer_);

            Blockly.Events.disable();
            try {
                let i = 0;
                // Clear existing
                while (this.getInput('IT_' + i)) { this.removeInput('IT_' + i); i++ }
                i = 0;
                while (this.getInput('VAL_' + i)) { this.removeInput('VAL_' + i); i++ }
                if (this.getInput('ST')) this.removeInput('ST');
                if (this.getInput('ED')) this.removeInput('ED');

                if (this.items_.length > 0) {
                    this.appendDummyInput('ST').appendField("{");
                    for (let j = 0; j < this.items_.length; j++) {
                        const item = this.items_[j];
                        const inputName = 'VAL_' + j;

                        const input = this.appendValueInput(inputName)
                            .setAlign(Blockly.inputs.Align.RIGHT)
                            .appendField(new Blockly.FieldTextInput(item.name || "ITEM_" + j), "NAME_" + j)
                            .appendField("=");

                        if (this.workspace && !this.isInFlyout) {
                            const seed = item.seed;
                            // Only schedule shadow creation if field is not empty
                            if (seed && seed !== '') {
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
                                                shadow.setFieldValue(seed, 'NUM');
                                                shadow.initSvg();
                                                shadow.render();

                                                if (!target) {
                                                    currentInput.connection.connect(shadow.outputConnection);
                                                } else {
                                                    // @ts-ignore
                                                    currentInput.connection.setShadowDom(shadow.toXml());
                                                    shadow.dispose();
                                                }
                                            } else if (target.getSourceBlock().isShadow()) {
                                                target.getSourceBlock().setFieldValue(seed, 'NUM');
                                            }
                                        }
                                    } catch (e) {
                                        console.warn("[Blockly] Shadow creation failed:", e);
                                    } finally {
                                        Blockly.Events.enable();
                                    }
                                }, 10);
                            } else {
                                // Clear shadow if seed is empty
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
                    this.appendDummyInput('ED').appendField("};");
                }
            } finally {
                Blockly.Events.enable();
            }
        }
    }, function (block: any) {
        // Generator
        const name = cleanName(block.getFieldValue('NAME'));
        if (block.items_.length === 0) return null;
        const its = [];
        for (let i = 0; i < block.items_.length; i++) {
            const n = cleanName(block.getFieldValue('NAME_' + i) || block.items_[i].name);
            // Value is now an Input!
            const v = arduinoGenerator.valueToCode(block, 'VAL_' + i, Order.ASSIGNMENT);
            its.push(v && v !== '0' ? `${n} = ${v}` : n);
        }
        if (arduinoGenerator.addType) {
            arduinoGenerator.addType('enum_' + name, `enum ${name} { \n  ${its.join(',\n  ')} \n }; \n`);
        }
        return null;
    });
    registerBlock('c_enum_container', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_ENUM_ITEMS);
            this.appendStatementInput("STACK");
            this.setColour(COLOUR_STRUCT);
            this.contextMenu = false;
        }
    }, () => '');
    registerBlock('c_enum_item', {
        init: function () {
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("ITEM"), "NAME")
                .appendField("=")
                .appendField(new Blockly.FieldTextInput(""), "VAL");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(COLOUR_STRUCT);
            this.contextMenu = false;
        }
    }, () => '');

    registerBlock('c_struct_var_declare', {
        init: function () {
            const dd = createDropdown(this, (ws: any, current: string) => {
                const vars = scanVariablesCategorized(ws);
                const options: [string, string][] = [];
                Array.from(vars.structDefinitions.keys()).sort().forEach(name => options.push([name, name]));
                if (current && !options.some(o => o[1] === current)) options.unshift([current, current]);
                if (options.length === 0) return [['MyStruct', 'MyStruct']];
                return options;
            });
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_STRUCT_DECLARE)
                .appendField(dd, "STRUCT_NAME")
                .appendField(Blockly.Msg.ARD_VAR_VAR)
                .appendField(new Blockly.FieldTextInput("mySt"), "VAR");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOUR_STRUCT);
        },
        onchange: ColorUpdateMixin.onchange
    }, function (block: any) {
        const t = cleanName(block.getFieldValue('STRUCT_NAME'));
        const v = cleanName(block.getFieldValue('VAR'));
        const code = `struct ${t} ${v}; `;
        if (!block.getSurroundParent()) {
            arduinoGenerator.addVariable('var_' + v, code);
            return '';
        }
        return code + '\n';
    });

    registerBlock('c_enum_var_declare', {
        init: function () {
            const dd = createDropdown(this, (ws: any, current: string) => {
                const vars = scanVariablesCategorized(ws);
                const options: [string, string][] = [];
                vars.userTypes.forEach(type => {
                    if (type.startsWith('enum ')) {
                        const name = type.substring(5);
                        options.push([name, name]);
                    }
                });
                options.sort((a, b) => a[0].localeCompare(b[0]));
                if (current && !options.some(o => o[1] === current)) options.unshift([current, current]);
                if (options.length === 0) return [['MyState', 'MyState']];
                return options;
            });
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ENUM_DECLARE)
                .appendField(dd, "ENUM_NAME")
                .appendField(Blockly.Msg.ARD_VAR_VAR)
                .appendField(new Blockly.FieldTextInput("state"), "VAR");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOUR_STRUCT);
        },
        onchange: ColorUpdateMixin.onchange
    }, function (block: any) {
        const t = cleanName(block.getFieldValue('ENUM_NAME'));
        const v = cleanName(block.getFieldValue('VAR'));
        const code = `enum ${t} ${v}; `;
        if (!block.getSurroundParent()) {
            arduinoGenerator.addVariable('var_' + v, code);
            return '';
        }
        return code + '\n';
    });

    // Enum Value
    registerBlock('c_enum_value', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_ENUM_ITEM);
            this.setOutput(true, null);
            this.setColour(COLOUR_STRUCT);
            appendEnumItemDropdown(this);
        },
        onchange: function (e: any) {
            if (!this.workspace || this.isInFlyout) return;
            const val = this.getFieldValue('VAR');
            if (val === 'no_item') {
                this.setWarningText(Blockly.Msg.ARD_VAR_ENUM_NO_ITEMS);
            } else {
                this.setWarningText(null);
            }
        }
    }, function (block: any) { return [cleanName(block.getFieldValue('VAR')), Order.ATOMIC]; });

    // Enum Set/Get
    registerBlock('c_enum_set', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_ENUM_SET);
            this.appendValueInput("VALUE").appendField(Blockly.Msg.ARD_VAR_TO);
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(330);
            appendEnumDropdown(this);
        },
        ...ColorUpdateMixin
    }, function (block: any) {
        const val = arduinoGenerator.valueToCode(block, 'VALUE', Order.ASSIGNMENT);
        if (!val) return '';
        return `${cleanName(block.getFieldValue('VAR'))} = ${val}; \n`;
    });

    registerBlock('c_enum_get', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_ENUM_GET);
            this.setOutput(true, null);
            this.setColour(330);
            appendEnumDropdown(this);
        },
        ...ColorUpdateMixin
    }, function (block: any) {
        return [cleanName(block.getFieldValue('VAR')), Order.ATOMIC];
    });

    registerBlock('c_struct_get_member', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_STRUCT_GET);
            appendStructDropdown(this);
            appendMemberDropdown(this);
            this.setOutput(true, null);
            this.setColour(COLOUR_STRUCT);
            this.setInputsInline(true);
        }
    }, function (b: any) {
        const mem = cleanName(b.getFieldValue('MEMBER'));
        if (mem === 'none' || !mem) return ['', Order.ATOMIC];
        return [`${cleanName(b.getFieldValue('VAR'))}.${mem} `, Order.ATOMIC];
    });

    registerBlock('c_struct_set_member', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_STRUCT_SET);
            appendStructDropdown(this);
            appendMemberDropdown(this);
            this.appendValueInput("VALUE").appendField("=");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(COLOUR_STRUCT);
            this.setInputsInline(true);
        }
    }, function (b: any) {
        const mem = cleanName(b.getFieldValue('MEMBER'));
        const val = arduinoGenerator.valueToCode(b, 'VALUE', Order.ASSIGNMENT);
        if (mem === 'none' || !mem || !val) return '';
        return `${cleanName(b.getFieldValue('VAR'))}.${mem} = ${val}; \n`;
    });

    registerBlock('c_struct_get_whole', {
        init: function () {
            this.appendDummyInput("DUMMY").appendField(Blockly.Msg.ARD_STRUCT_GET_WHOLE);
            appendStructDropdown(this);
            this.setOutput(true, null);
            this.setColour(COLOUR_STRUCT);
        }
    }, function (b: any) {
        return [cleanName(b.getFieldValue('VAR')), Order.ATOMIC];
    });

    registerBlock('c_sizeof', {
        init: function () {
            this.appendDummyInput().appendField("sizeof");
            this.appendDummyInput().appendField(new Blockly.FieldDropdown([
                [Blockly.Msg.ARD_SIZEOF_EXPR || "Expression", "EXPR"],
                [Blockly.Msg.ARD_SIZEOF_TYPE || "Type", "TYPE"]
            ], function (o: any) {
                // @ts-ignore
                this.sourceBlock_.updateShape_(o)
            }), "MODE");
            this.setOutput(true, "Number");
            this.setColour(65);
            this.setInputsInline(true);
            this.updateShape_("EXPR");
        },
        updateShape_: function (m: string) {
            if (this.getInput('VAL')) this.removeInput('VAL');
            if (this.getInput('TY')) this.removeInput('TY');
            if (m === 'EXPR') this.appendValueInput('VAL');
            else {
                const dd = createDropdown(this, getUserTypesDropdownOptions);
                this.appendDummyInput('TY').appendField(dd, 'TYPE_VAL');
            }
        }
    }, function (b: any) {
        if (b.getFieldValue('MODE') === 'EXPR') {
            const val = arduinoGenerator.valueToCode(b, 'VAL', Order.NONE);
            if (!val) return ['', Order.ATOMIC];
            return [`sizeof(${val})`, Order.ATOMIC];
        } else return [`sizeof(${b.getFieldValue('TYPE_VAL')})`, Order.ATOMIC];
    });
    registerBlock('c_type_cast', {
        init: function () {
            this.appendValueInput("VAL").appendField(Blockly.Msg.ARD_CAST).appendField(new Blockly.FieldDropdown(VAR_TYPES), "TYPE");
            this.setOutput(true, null);
            this.setColour(65);
        }
    }, (b: any) => {
        const val = arduinoGenerator.valueToCode(b, 'VAL', Order.UNARY_PREFIX);
        if (!val) return ['', Order.ATOMIC];
        return [`(${b.getFieldValue('TYPE')})(${val})`, Order.UNARY_PREFIX];
    });
    registerBlock('c_address_of', {
        init: function () {
            this.appendValueInput("VAL").appendField(Blockly.Msg.ARD_ADDRESS_OF);
            this.setOutput(true, "Pointer");
            this.setColour(65);
        }
    }, (b: any) => {
        const val = arduinoGenerator.valueToCode(b, 'VAL', Order.UNARY_PREFIX);
        if (!val) return ['', Order.ATOMIC];
        return ['&' + val, Order.UNARY_PREFIX];
    });
    registerBlock('arduino_functions_return', {
        init: function () {
            this.appendValueInput("VALUE").appendField(Blockly.Msg.ARD_SYS_RETURN);
            this.setPreviousStatement(true);
            this.setColour(290);
        }
    }, (b: any) => {
        return `return ${arduinoGenerator.valueToCode(b, 'VALUE', Order.NONE) || ''};\n`
    });
    registerBlock('c_dereference', {
        init: function () {
            this.appendValueInput("VAL").appendField(Blockly.Msg.ARD_DEREFERENCE);
            this.setOutput(true, null);
            this.setColour(65);
        }
    }, (b: any) => {
        const val = arduinoGenerator.valueToCode(b, 'VAL', Order.UNARY_PREFIX);
        if (!val) return ['', Order.ATOMIC];
        return ['*' + val, Order.UNARY_PREFIX];
    });
};

export const VariablesModule: BlockModule = {
    id: 'core.variables',
    name: 'Variables & Data Types',
    init
};