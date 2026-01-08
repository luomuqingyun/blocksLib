import { arduinoGenerator } from '../../../generators/arduino-base';
import { Order } from '../../../generators/utils/generator_constants';

export const initGenerator = () => {
    arduinoGenerator['test_dev_log'] = (block: any) => {
        const message = arduinoGenerator.valueToCode(block, 'MESSAGE', Order.ATOMIC) || '""';

        arduinoGenerator.addSetup('serial_begin', 'Serial.begin(115200);');

        return `Serial.println("Dev: " + String(${message}));\n`;
    };
};
