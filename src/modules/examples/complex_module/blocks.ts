
import { registerBlock, arduinoGenerator, Order } from '../../../generators/arduino-base';
import { BlockModule } from '../../../registries/ModuleRegistry';
import * as Blockly from 'blockly';

/**
 * 最佳实践示例：将积木定义分离
 */
export const initComplexBlock = () => {
    registerBlock('complex_sensor_read', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_EXAMPLE_COMPLEX_READ);
            this.setOutput(true, "Number");
            this.setColour(200);
        }
    }, (block: any) => {
        return ['0', Order.ATOMIC];
    });
};
