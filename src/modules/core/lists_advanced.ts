/**
 * ============================================================
 * 高级列表模块 (Advanced Lists Module)
 * ============================================================
 * 
 * 提供高级列表操作积木 (std::vector):
 * - lists_sort_num: 数字排序 (升序/降序)
 * - lists_reverse: 反转列表
 * - lists_find_index: 查找元素索引
 * 
 * @file src/modules/core/lists_advanced.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // Helper: We assume "lists" in Arduino are often std::vector or arrays.
    // However, standard Blockly lists compile to arrays of a fixed size or complex structures.
    // For simplicity in this embedded context, we deal with specific types or Assume std::vector<int/float>
    // But since Blockly's default lists are versatile, we might need a generic approach or C++ templates.
    // For this module, we will assume the user has a variable which is a std::vector or can be treated as one.
    // OR we provide blocks that explicitly work on array variables.

    registerBlock('lists_sort_num', {
        init: function () {
            this.appendDummyInput()
                .appendField("Sort Number List");
            this.appendValueInput("LIST")
                .setCheck("Array")
                .appendField("List");
            this.appendDummyInput()
                .appendField("Order")
                .appendField(new Blockly.FieldDropdown([["Ascending", "ASC"], ["Descending", "DESC"]]), "ORDER");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
            this.setTooltip(Blockly.Msg.ARD_LIST_SORT_TOOLTIP);
        }
    }, (block: any) => {
        const list = arduinoGenerator.valueToCode(block, 'LIST', Order.ATOMIC) || 'myList';
        const order = block.getFieldValue('ORDER');

        arduinoGenerator.addInclude('vector_lib', '#include <vector>');
        arduinoGenerator.addInclude('algo_lib', '#include <algorithm>');

        // This assumes 'list' is a std::vector or compatible container with begin()/end()
        if (order === 'ASC') {
            return `std::sort(${list}.begin(), ${list}.end());\n`;
        } else {
            return `std::sort(${list}.begin(), ${list}.end(), std::greater<int>());\n`;
        }
    });

    registerBlock('lists_reverse', {
        init: function () {
            this.appendDummyInput()
                .appendField("Reverse List");
            this.appendValueInput("LIST")
                .setCheck("Array")
                .appendField("List");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
        }
    }, (block: any) => {
        const list = arduinoGenerator.valueToCode(block, 'LIST', Order.ATOMIC) || 'myList';
        arduinoGenerator.addInclude('algo_lib', '#include <algorithm>');
        return `std::reverse(${list}.begin(), ${list}.end());\n`;
    });

    // Find Index
    registerBlock('lists_find_index', {
        init: function () {
            this.appendDummyInput()
                .appendField("Find Index of");
            this.appendValueInput("ITEM")
                .setCheck("Number")
                .appendField("Item");
            this.appendValueInput("LIST")
                .setCheck("Array")
                .appendField("in List");
            this.setOutput(true, "Number");
            this.setColour(260);
            this.setTooltip(Blockly.Msg.ARD_LIST_INDEX_TOOLTIP);
        }
    }, (block: any) => {
        const item = arduinoGenerator.valueToCode(block, 'ITEM', Order.ATOMIC) || '0';
        const list = arduinoGenerator.valueToCode(block, 'LIST', Order.ATOMIC) || 'myList';

        const funcName = 'findListIndex';
        arduinoGenerator.functions_[funcName] = `
int ${funcName}(std::vector<int> &vec, int val) {
    auto it = std::find(vec.begin(), vec.end(), val);
    if (it != vec.end()) {
        return std::distance(vec.begin(), it);
    }
    return -1;
}`;
        return [`${funcName}(${list}, ${item})`, Order.ATOMIC];
    });

};

export const ListsAdvancedModule: BlockModule = {
    id: 'core.lists_advanced',
    name: 'Lists (Advanced)',
    category: 'Lists',
    init
};
