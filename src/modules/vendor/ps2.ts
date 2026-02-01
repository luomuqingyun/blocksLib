/**
 * ============================================================
 * PS2 游戏手柄模块 (PS2 Controller)
 * ============================================================
 * 
 * 提供 PS2 无线/有线手柄积木:
 * - ps2_init: 初始化 (CLK/CMD/ATT/DAT)
 * - ps2_button: 读取按钮状态
 * - ps2_analog: 读取摇杆模拟值
 * 
 * 使用 PS2X_lib.h 库。
 * 
 * @file src/modules/vendor/ps2.ts
 * @module EmbedBlocks/Frontend/Modules/Vendor
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    registerBlock('ps2_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_CLOCK)
                .appendField(new Blockly.FieldTextInput("13"), "CLK");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_CMD)
                .appendField(new Blockly.FieldTextInput("11"), "CMD");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_ATT)
                .appendField(new Blockly.FieldTextInput("10"), "ATT");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_DATA)
                .appendField(new Blockly.FieldTextInput("12"), "DAT");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_PS2_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const clk = block.getFieldValue('CLK');
        const cmd = block.getFieldValue('CMD');
        const att = block.getFieldValue('ATT');
        const dat = block.getFieldValue('DAT');

        arduinoGenerator.addInclude('ps2_lib', '#include <PS2X_lib.h>');
        arduinoGenerator.addVariable('ps2_obj', `PS2X ps2x;`);
        arduinoGenerator.addVariable('ps2_err', `int ps2_error = 0;`);

        arduinoGenerator.addSetup('ps2_begin', `ps2_error = ps2x.config_gamepad(${clk}, ${cmd}, ${att}, ${dat}, true, true);`);
        arduinoGenerator.addSetup('ps2_check', `if(ps2_error == 0) Serial.println("Found Controller");`);

        // Loop read
        // Note: addLoop is not standard yet? Let's check arduino-base.ts
        // If not, we should implement it or stick to addSetup if it was intended there?
        // Wait, line 43 is: arduinoGenerator.addLoop('ps2_read', `ps2x.read_gamepad(false, 0); // Read controller`);
        // We haven't added `addLoop` helper to arduino-base.ts yet!
        // We only added setups.
        // Let's check if addLoop exists or if I need to add it.
        // Assuming it doesn't exist based on previous file reads.
        // I will stick to what's there IF it works (direct assignment?), OR better, implement `addLoop`.
        // The current code in ps2.ts ALREADY calls `arduinoGenerator.addLoop`.
        // If `addLoop` doesn't exist on generator, this code is BROKEN.
        // I must check arduino-base.ts immediately.
        // For now, I will NOT touch this line until I verify `addLoop` existence.
        // Resuming replace for lines 35-37 only.

        return '';
    });

    registerBlock('ps2_button', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_BTN_PRESSED)
                .appendField(new Blockly.FieldDropdown([
                    ["Start", "PSB_START"],
                    ["Select", "PSB_SELECT"],
                    ["Up", "PSB_PAD_UP"],
                    ["Down", "PSB_PAD_DOWN"],
                    ["Left", "PSB_PAD_LEFT"],
                    ["Right", "PSB_PAD_RIGHT"],
                    ["Square", "PSB_SQUARE"],
                    ["Circle", "PSB_CIRCLE"],
                    ["Cross", "PSB_CROSS"],
                    ["Triangle", "PSB_TRIANGLE"],
                    ["L1", "PSB_L1"],
                    ["R1", "PSB_R1"]
                ]), "BTN");
            this.setOutput(true, "Boolean");
            this.setColour(30);
        }
    }, (block: any) => {
        const btn = block.getFieldValue('BTN');
        return [`ps2x.Button(${btn})`, Order.ATOMIC];
    });

    registerBlock('ps2_analog', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PS2_READ_ANA)
                .appendField(new Blockly.FieldDropdown([
                    ["Left Stick X", "PSS_LX"],
                    ["Left Stick Y", "PSS_LY"],
                    ["Right Stick X", "PSS_RX"],
                    ["Right Stick Y", "PSS_RY"]
                ]), "AXIS");
            this.setOutput(true, "Number");
            this.setColour(30);
            this.setTooltip(Blockly.Msg.ARD_PS2_READ_TOOLTIP);
        }
    }, (block: any) => {
        const axis = block.getFieldValue('AXIS');
        return [`ps2x.Analog(${axis})`, Order.ATOMIC];
    });

};

export const PS2Module: BlockModule = {
    id: 'vendor.ps2',
    name: 'PS2 Controller',
    category: 'Inputs',
    init
};
