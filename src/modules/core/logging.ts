// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('log_to_serial_csv', {
        init: function () {
            this.appendDummyInput()
                .appendField("Log CSV Row");
            this.appendValueInput("VAL1").setCheck(null).appendField("Val 1");
            this.appendValueInput("VAL2").setCheck(null).appendField("Val 2");
            this.appendValueInput("VAL3").setCheck(null).appendField("Val 3");
            this.appendValueInput("VAL4").setCheck(null).appendField("Val 4");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160); // Serial color
            this.setTooltip(Blockly.Msg.ARD_LOG_CSV_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const v1 = arduinoGenerator.valueToCode(block, 'VAL1', Order.ATOMIC) || '0';
        const v2 = arduinoGenerator.valueToCode(block, 'VAL2', Order.ATOMIC) || '0';
        const v3 = arduinoGenerator.valueToCode(block, 'VAL3', Order.ATOMIC) || '0';
        const v4 = arduinoGenerator.valueToCode(block, 'VAL4', Order.ATOMIC) || '0';

        return `
 Serial.print(${v1}); Serial.print(",");
 Serial.print(${v2}); Serial.print(",");
 Serial.print(${v3}); Serial.print(",");
 Serial.println(${v4});\n`;
    });

    registerBlock('log_plotter_print', {
        init: function () {
            this.appendDummyInput()
                .appendField("Plotter Print");
            this.appendValueInput("LABEL").setCheck("String").appendField("Label");
            this.appendValueInput("VALUE").setCheck("Number").appendField("Value");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg.ARD_LOG_PLOT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const label = arduinoGenerator.valueToCode(block, 'LABEL', Order.ATOMIC) || '"Var"';
        const val = arduinoGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
        return `
 Serial.print(${label});
 Serial.print(":");
 Serial.println(${val});\n`;
    });

};

export const LoggingModule: BlockModule = {
    id: 'core.logging',
    name: 'Data Logging',
    category: 'Communication',
    init
};
