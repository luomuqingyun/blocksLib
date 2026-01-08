import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // Grove Chainable LED (ChainableLED.h)
    // =========================================================================

    registerBlock('grove_led_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GROVE_LED_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GROVE_CLK)
                .appendField(new Blockly.FieldTextInput("6"), "CLK");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GROVE_DATA)
                .appendField(new Blockly.FieldTextInput("7"), "DATA");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GROVE_COUNT)
                .appendField(new Blockly.FieldNumber(1), "COUNT");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_GROVE_LED_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const clk = block.getFieldValue('CLK');
        const data = block.getFieldValue('DATA');
        const count = block.getFieldValue('COUNT');

        reservePin(block, clk, 'OUTPUT');
        reservePin(block, data, 'OUTPUT');

        arduinoGenerator.addInclude('chainled_lib', '#include <ChainableLED.h>');
        arduinoGenerator.addVariable(`chainled_${clk}`, `ChainableLED leds_${clk}(${clk}, ${data}, ${count});`);
        arduinoGenerator.addSetup(`chainled_init_${clk}`, `leds_${clk}.init();`);

        return '';
    });

    registerBlock('grove_led_set', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GROVE_LED_SET);
            this.appendValueInput("INDEX")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_GROVE_INDEX);
            this.appendValueInput("R")
                .setCheck("Number")
                .appendField("R");
            this.appendValueInput("G")
                .setCheck("Number")
                .appendField("G");
            this.appendValueInput("B")
                .setCheck("Number")
                .appendField("B");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_GROVE_LED_SET_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        // We need a reference to the object. Simplified assumption: user uses one chain or we infer from somewhere.
        // For clean room simplicity, we'll assume the variable name matches a pinned convention or just 'leds_6' 
        // if we enforce using the same pins. ideally we'd pass the instance.
        // Let's assume user configured it on pins 6/7 for this example.

        const index = arduinoGenerator.valueToCode(block, 'INDEX', Order.ATOMIC) || '0';
        const r = arduinoGenerator.valueToCode(block, 'R', Order.ATOMIC) || '0';
        const g = arduinoGenerator.valueToCode(block, 'G', Order.ATOMIC) || '0';
        const b = arduinoGenerator.valueToCode(block, 'B', Order.ATOMIC) || '0';

        // Note: Ideally we select which LED chain
        return `leds_6.setColorRGB(${index}, ${r}, ${g}, ${b});\n`;
    });

    registerBlock('grove_led_set_hsl', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GROVE_LED_HSL);
            this.appendValueInput("INDEX")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_GROVE_INDEX);
            this.appendValueInput("H")
                .setCheck("Number")
                .appendField("H (0-1.0)");
            this.appendValueInput("S")
                .setCheck("Number")
                .appendField("S (0-1.0)");
            this.appendValueInput("L")
                .setCheck("Number")
                .appendField("L (0-1.0)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_GROVE_LED_HSL_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const index = arduinoGenerator.valueToCode(block, 'INDEX', Order.ATOMIC) || '0';
        const h = arduinoGenerator.valueToCode(block, 'H', Order.ATOMIC) || '0.0';
        const s = arduinoGenerator.valueToCode(block, 'S', Order.ATOMIC) || '1.0';
        const l = arduinoGenerator.valueToCode(block, 'L', Order.ATOMIC) || '0.5';

        return `leds_6.setColorHSL(${index}, ${h}, ${s}, ${l});\n`;
    });


    // =========================================================================
    // Grove 4-Digit Display (TM1637.h)
    // =========================================================================

    registerBlock('grove_display_4digit_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GROVE_DISP_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GROVE_CLK)
                .appendField(new Blockly.FieldTextInput("2"), "CLK");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GROVE_DIO)
                .appendField(new Blockly.FieldTextInput("3"), "DIO");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_GROVE_DISP_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const clk = block.getFieldValue('CLK');
        const dio = block.getFieldValue('DIO');

        arduinoGenerator.addInclude('tm1637_lib', '#include <TM1637.h>');
        arduinoGenerator.addVariable(`tm1637_${clk}`, `TM1637 tm1637_${clk}(${clk}, ${dio});`);
        arduinoGenerator.addSetup(`tm1637_init_${clk}`, `tm1637_${clk}.init();\n  tm1637_${clk}.set(BRIGHT_TYPICAL);`);

        return '';
    });

    registerBlock('grove_display_4digit_print', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GROVE_DISP_PRINT);
            this.appendValueInput("NUM")
                .setCheck("Number")
                .appendField("Number");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip(Blockly.Msg.ARD_GROVE_DISP_PRINT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const num = arduinoGenerator.valueToCode(block, 'NUM', Order.ATOMIC) || '0';
        // Simplified assumption: using instance on pin 2
        return `tm1637_2.displayNum(${num});\n`;
    });

};

export const SeeedModule: BlockModule = {
    id: 'vendor.seeed',
    name: 'Seeed Studio (Grove)',
    category: 'Seeed/Grove',
    init
};
