import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // Wii Nunchuck (WiiChuck.h)
    // =========================================================================

    registerBlock('wii_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WII_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
            this.setTooltip(Blockly.Msg.ARD_WII_INIT_TOOLTIP);
        }
    }, (block: any) => {
        arduinoGenerator.addInclude('wire_lib', '#include <Wire.h>');
        arduinoGenerator.addInclude('wiichuck_lib', '#include <Wiichuck.h>');
        arduinoGenerator.addVariable('wiichuck_obj', `Wiichuck wii;`);
        arduinoGenerator.addSetup('wii_init', `wii.begin();\n  wii.update();`);

        return '';
    });

    registerBlock('wii_update', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WII_UPDATE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
            this.setTooltip(Blockly.Msg.ARD_WII_READ_TOOLTIP);
        }
    }, (block: any) => {
        return `chuck.update();\ndelay(20);\n`;
    });

    registerBlock('wii_read_axis', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WII_READ)
                .appendField(new Blockly.FieldDropdown([
                    ["Joy X", "readJoyX()"],
                    ["Joy Y", "readJoyY()"],
                    ["Accel X", "readAccelX()"],
                    ["Accel Y", "readAccelY()"],
                    ["Accel Z", "readAccelZ()"],
                    ["Roll", "readRoll()"],
                    ["Pitch", "readPitch()"]
                ]), "AXIS");
            this.setOutput(true, "Number");
            this.setColour(260);
            this.setTooltip(Blockly.Msg.ARD_WII_AXIS_TOOLTIP);
        }
    }, (block: any) => {
        const axis = block.getFieldValue('AXIS');
        return [`chuck.${axis}`, Order.ATOMIC];
    });

    registerBlock('wii_button', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_WII_BUTTON)
                .appendField(new Blockly.FieldDropdown([["C", "cPressed"], ["Z", "zPressed"]]), "BTN");
            this.setOutput(true, "Boolean");
            this.setColour(260);
            this.setTooltip(Blockly.Msg.ARD_WII_BTN_TOOLTIP);
        }
    }, (block: any) => {
        const btn = block.getFieldValue('BTN');
        return [`chuck.button${btn}`, Order.ATOMIC]; // Note: Lib variations exists, assumed typical prop or method
    });
};

export const WiiModule: BlockModule = {
    id: 'hardware.wii',
    name: 'Wii Nunchuck',
    category: 'Wii',
    init
};
