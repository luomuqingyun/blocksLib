/**
 * ============================================================
 * 统计模块 (Statistics Module)
 * ============================================================
 * 
 * 提供统计计算积木:
 * - stats_average: 计算列表平均值
 * - stats_min_max: 获取最小/最大值
 * 
 * @file src/modules/core/math_stats.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册与数学统计（列表运算）相关的积木块。
 * 实现方案：基于 C++ 标准库 (STL) 的 vector、numeric 和 algorithm 实现。
 */
const init = () => {

    // =========================================================================
    // 1. 计算列表平均值 (Average of List)
    // =========================================================================
    registerBlock('stats_average', {
        init: function () {
            this.appendDummyInput()
                .appendField("计算列表平均值");
            this.appendValueInput("LIST")
                .setCheck("Array") // 必须是数组/列表类型
                .appendField("列表");
            this.setOutput(true, "Number");
            this.setColour(230); // 数学类积木通常偏紫色或特定浅色
            this.setTooltip(Blockly.Msg.ARD_STATS_AVG_TOOLTIP);
        }
    }, (block: any) => {
        const list = arduinoGenerator.valueToCode(block, 'LIST', Order.ATOMIC) || '{}';

        // 引入辅助算法库
        arduinoGenerator.addInclude('vector_lib', '#include <vector>');
        arduinoGenerator.addInclude('numeric_lib', '#include <numeric>');

        const funcName = 'getAverage';
        // 注入全局辅助函数：避免在 loop 中重复定义，提高效率
        arduinoGenerator.functions_[funcName] = `
/** 计算双精度浮点数向量的平均值 */
double ${funcName}(std::vector<double> v) {
  if(v.empty()) return 0;
  // 使用 std::accumulate 进行累加求和
  double sum = std::accumulate(v.begin(), v.end(), 0.0);
  return sum / v.size();
}`;
        return [`${funcName}(${list})`, Order.ATOMIC];
    });

    // =========================================================================
    // 2. 获取最小/最大值 (Min/Max of List)
    // =========================================================================
    registerBlock('stats_min_max', {
        init: function () {
            this.appendDummyInput()
                .appendField("获取列表")
                .appendField(new Blockly.FieldDropdown([["最小值", "MIN"], ["最大值", "MAX"]]), "MODE");
            this.appendValueInput("LIST")
                .setCheck("Array");
            this.setOutput(true, "Number");
            this.setColour(230);
        }
    }, (block: any) => {
        const mode = block.getFieldValue('MODE');
        const list = arduinoGenerator.valueToCode(block, 'LIST', Order.ATOMIC) || '{}';

        // 引入算法库以使用迭代器极值查找
        arduinoGenerator.addInclude('algorithm_lib', '#include <algorithm>');

        const funcName = (mode === 'MIN') ? 'getMinVal' : 'getMaxVal';
        const algo = (mode === 'MIN') ? 'std::min_element' : 'std::max_element';

        arduinoGenerator.functions_[funcName] = `
/** 查找向量中的${mode === 'MIN' ? '最小' : '最大'}值 */
double ${funcName}(std::vector<double> v) {
  if(v.empty()) return 0;
  // min_element/max_element 返回的是迭代器，需要用 * 取值
  return *${algo}(v.begin(), v.end());
}`;
        return [`${funcName}(${list})`, Order.ATOMIC];
    });

};

/**
 * 统计模块定义
 * 扩展了基础数学功能，支持对一组数据执行聚合运算。
 */
export const MathStatsModule: BlockModule = {
    id: 'core.math_stats',
    name: 'Statistics',
    init
};
