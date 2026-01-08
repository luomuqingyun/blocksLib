// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('stats_average', {
        init: function () {
            this.appendDummyInput()
                .appendField("Average of List");
            this.appendValueInput("LIST")
                .setCheck("Array")
                .appendField("List");
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_STATS_AVG_TOOLTIP);
        }
    }, (block: any) => {
        const list = arduinoGenerator.valueToCode(block, 'LIST', Order.ATOMIC) || '{}';

        arduinoGenerator.addInclude('vector_lib', '#include <vector>');
        arduinoGenerator.addInclude('numeric_lib', '#include <numeric>');

        const funcName = 'getAverage';
        arduinoGenerator.functions_[funcName] = `
double ${funcName}(std::vector<double> v) {
  if(v.empty()) return 0;
  double sum = std::accumulate(v.begin(), v.end(), 0.0);
  return sum / v.size();
}`;
        // Note: Assumes Input is std::vector<double> or compatible. 
        // Our lists are usually std::vector<int> or <String>. 
        // If it's <int>, conversion works. String fails.
        // We assume User passes Number list.

        return [`${funcName}(${list})`, Order.ATOMIC];
    });

    registerBlock('stats_min_max', {
        init: function () {
            this.appendDummyInput()
                .appendField("Get")
                .appendField(new Blockly.FieldDropdown([["Min", "MIN"], ["Max", "MAX"]]), "MODE")
                .appendField("of List");
            this.appendValueInput("LIST")
                .setCheck("Array");
            this.setOutput(true, "Number");
            this.setColour(230);
        }
    }, (block: any) => {
        const mode = block.getFieldValue('MODE');
        const list = arduinoGenerator.valueToCode(block, 'LIST', Order.ATOMIC) || '{}';

        arduinoGenerator.addInclude('algorithm_lib', '#include <algorithm>');

        const funcName = (mode === 'MIN') ? 'getMinVal' : 'getMaxVal';
        const algo = (mode === 'MIN') ? 'std::min_element' : 'std::max_element';

        arduinoGenerator.functions_[funcName] = `
double ${funcName}(std::vector<double> v) {
  if(v.empty()) return 0;
  return *${algo}(v.begin(), v.end());
}`;
        return [`${funcName}(${list})`, Order.ATOMIC];
    });

};

export const MathStatsModule: BlockModule = {
    id: 'core.math_stats',
    name: 'Statistics',
    category: 'Math',
    init
};
