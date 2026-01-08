// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('firebase_config', {
        init: function () {
            this.appendDummyInput()
                .appendField("Firebase Config");
            this.appendValueInput("URL")
                .setCheck("String")
                .appendField("URL");
            this.appendValueInput("SECRET")
                .setCheck("String")
                .appendField("Secret");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(25); // Deep orange/red
            this.setTooltip(Blockly.Msg.ARD_FIREBASE_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const url = arduinoGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '""';
        const secret = arduinoGenerator.valueToCode(block, 'SECRET', Order.ATOMIC) || '""';

        arduinoGenerator.addInclude('firebase_lib', '#include <IOXhop_FirebaseESP32.h>'); // One common lib option
        // Alternative: FirebaseESP32.h by Mobizt (Official-ish)
        // using IOXhop syntax for simplicity: Firebase.begin(url, secret)

        arduinoGenerator.addSetup('firebase_begin', `Firebase.begin(${url}, ${secret});`);
        return '';
    });

    registerBlock('firebase_set_int', {
        init: function () {
            this.appendDummyInput()
                .appendField("Firebase Set Int");
            this.appendValueInput("PATH")
                .setCheck("String")
                .appendField("Path");
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField("Value");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(25);
        }
    }, (block: any) => {
        const path = arduinoGenerator.valueToCode(block, 'PATH', Order.ATOMIC) || '"/"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        return `Firebase.setInt(${path}, ${val});\n`;
    });

    registerBlock('firebase_get_int', {
        init: function () {
            this.appendDummyInput()
                .appendField("Firebase Get Int");
            this.appendValueInput("PATH")
                .setCheck("String")
                .appendField("Path");
            this.setOutput(true, "Number");
            this.setColour(25);
        }
    }, (block: any) => {
        const path = arduinoGenerator.valueToCode(block, 'PATH', Order.ATOMIC) || '"/"';
        return [`Firebase.getInt(${path})`, Order.ATOMIC];
    });

    // String variants
    registerBlock('firebase_set_string', {
        init: function () {
            this.appendDummyInput()
                .appendField("Firebase Set String");
            this.appendValueInput("PATH")
                .setCheck("String")
                .appendField("Path");
            this.appendValueInput("VAL")
                .setCheck("String")
                .appendField("Value");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(25);
        }
    }, (block: any) => {
        const path = arduinoGenerator.valueToCode(block, 'PATH', Order.ATOMIC) || '"/"';
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '""';
        return `Firebase.setString(${path}, ${val});\n`;
    });
};

export const FirebaseModule: BlockModule = {
    id: 'protocols.firebase',
    name: 'Firebase DB',
    category: 'Cloud',
    init
};
