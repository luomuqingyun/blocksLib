import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {
    registerBlock('arduino_serial_print', {
        init: function () {
            this.appendValueInput("CONTENT").appendField(Blockly.Msg.ARD_SERIAL_PRINT).appendField(new Blockly.FieldCheckbox("TRUE"), "NEW_LINE").appendField(Blockly.Msg.ARD_SERIAL_NEWLINE);
            this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(160);
        }
    }, function (block: any) {
        const content = arduinoGenerator.valueToCode(block, 'CONTENT', Order.NONE) || '""';
        const newLine = block.getFieldValue('NEW_LINE') === 'TRUE';
        arduinoGenerator.addSetup('serial_begin', 'Serial.begin(115200);');
        return newLine ? `Serial.println(${content});\n` : `Serial.print(${content});\n`;
    });

    registerBlock('arduino_serial_available', {
        init: function () { this.appendDummyInput().appendField(Blockly.Msg.ARD_SERIAL_AVAILABLE); this.setOutput(true, "Boolean"); this.setColour(160); }
    }, function () {
        arduinoGenerator.addSetup('serial_begin', 'Serial.begin(115200);');
        return ['Serial.available()', Order.ATOMIC];
    });

    registerBlock('arduino_serial_read_string', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_SERIAL_READ_STRING);
            this.setOutput(true, "String");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_SERIAL_READ_STRING_TOOLTIP);
        }
    }, function () {
        arduinoGenerator.addSetup('serial_begin', 'Serial.begin(115200);');
        return ['Serial.readString()', Order.ATOMIC];
    });

    registerBlock('arduino_serial_read_char', {
        init: function () {
            this.appendDummyInput().appendField(Blockly.Msg.ARD_SERIAL_READ_CHAR);
            this.setOutput(true, "Number");
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_SERIAL_READ_CHAR_TOOLTIP);
        }
    }, function () {
        arduinoGenerator.addSetup('serial_begin', 'Serial.begin(115200);');
        return ['Serial.read()', Order.ATOMIC];
    });
};

export const SerialModule: BlockModule = {
    id: 'protocols.serial',
    name: 'Serial Basic',
    category: 'Serial',
    init
};