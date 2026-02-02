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


/**
 * 模块初始化函数
 * 注册与高级列表操作（基于 C++ std::vector）相关的积木块。
 */
const init = () => {

    // =========================================================================
    // 1. 数字列表排序 (Sort Number List)
    // 支持按升序或降序对列表内容进行重新排列。
    // =========================================================================
    registerBlock('lists_sort_num', {
        init: function () {
            this.appendDummyInput()
                .appendField("数字列表排序");
            this.appendValueInput("LIST")
                .setCheck("Array")
                .appendField("列表");
            this.appendDummyInput()
                .appendField("排序方式")
                .appendField(new Blockly.FieldDropdown([["升序", "ASC"], ["降序", "DESC"]]), "ORDER");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260); // 列表类积木通常使用浅绿色或特定深灰色
            this.setTooltip(Blockly.Msg.ARD_LIST_SORT_TOOLTIP);
        }
    }, (block: any) => {
        const list = arduinoGenerator.valueToCode(block, 'LIST', Order.ATOMIC) || 'myList';
        const order = block.getFieldValue('ORDER');

        // 引入标准库以支持向量与算法
        arduinoGenerator.addInclude('vector_lib', '#include <vector>');
        arduinoGenerator.addInclude('algo_lib', '#include <algorithm>');

        // 【生成的 C++ 代码逻辑】
        // 使用 std::sort，它要求容器支持迭代器 (begin/end)。
        if (order === 'ASC') {
            return `std::sort(${list}.begin(), ${list}.end());\n`;
        } else {
            // 使用 std::greater 比较器实现降序
            return `std::sort(${list}.begin(), ${list}.end(), std::greater<int>());\n`;
        }
    });

    // =========================================================================
    // 2. 反转列表 (Reverse List)
    // =========================================================================
    registerBlock('lists_reverse', {
        init: function () {
            this.appendDummyInput()
                .appendField("反转列表");
            this.appendValueInput("LIST")
                .setCheck("Array")
                .appendField("列表");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
        }
    }, (block: any) => {
        const list = arduinoGenerator.valueToCode(block, 'LIST', Order.ATOMIC) || 'myList';
        arduinoGenerator.addInclude('algo_lib', '#include <algorithm>');
        // 同样适用迭代器范围反转
        return `std::reverse(${list}.begin(), ${list}.end());\n`;
    });

    // =========================================================================
    // 3. 查找元素索引 (Find Index)
    // =========================================================================
    registerBlock('lists_find_index', {
        init: function () {
            this.appendDummyInput()
                .appendField("查找元素在列表中的索引");
            this.appendValueInput("ITEM")
                .setCheck("Number")
                .appendField("元素值");
            this.appendValueInput("LIST")
                .setCheck("Array")
                .appendField("目标列表");
            this.setOutput(true, "Number");
            this.setColour(260);
            this.setTooltip(Blockly.Msg.ARD_LIST_INDEX_TOOLTIP);
        }
    }, (block: any) => {
        const item = arduinoGenerator.valueToCode(block, 'ITEM', Order.ATOMIC) || '0';
        const list = arduinoGenerator.valueToCode(block, 'LIST', Order.ATOMIC) || 'myList';

        const funcName = 'findListIndex';
        // 注入全局辅助函数
        arduinoGenerator.functions_[funcName] = `
/** 在向量中查找值的索引位置，未找到返回 -1 */
int ${funcName}(std::vector<int> &vec, int val) {
    // std::find 返回指向该元素的迭代器
    auto it = std::find(vec.begin(), vec.end(), val);
    if (it != vec.end()) {
        // 使用 distance 计算迭代器偏离起始位置的距离（即索引）
        return std::distance(vec.begin(), it);
    }
    return -1;
}`;
        return [`${funcName}(${list}, ${item})`, Order.ATOMIC];
    });

};

/**
 * 高级列表模块定义
 * 旨在让用户以类似现代高级语言的方式操作 Arduino 中的动态数组或向量。
 */
export const ListsAdvancedModule: BlockModule = {
    id: 'core.lists_advanced',
    name: 'Lists (Advanced)',
    init
};
