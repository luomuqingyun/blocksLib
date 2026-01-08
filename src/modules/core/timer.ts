// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    registerBlock('timer_every', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TIMER_EVERY);
            this.appendValueInput("MS")
                .setCheck("Number");
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIMER_MS_DO);
            this.appendStatementInput("DO")
                .setCheck(null);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120); // Loop color
            this.setTooltip(Blockly.Msg.ARD_TIMER_TOOLTIP);
        }
    }, (block: any) => {
        const ms = arduinoGenerator.valueToCode(block, 'MS', Order.ATOMIC) || '1000';
        const branch = arduinoGenerator.statementToCode(block, 'DO');

        // We use static variable for timer state to keep it self-contained in loop
        // Unique ID for this block instance
        const id = block.id.replace(/[^a-zA-Z0-9]/g, '');

        return `
  static unsigned long last_${id} = 0;
  if (millis() - last_${id} > ${ms}) {
      last_${id} = millis();
      ${branch}
  }
\n`;
    });

    registerBlock('timer_once', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TIMER_AFTER);
            this.appendValueInput("MS")
                .setCheck("Number");
            this.appendDummyInput().appendField(Blockly.Msg.ARD_TIMER_ONCE);
            this.appendStatementInput("DO")
                .setCheck(null);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(120);
        }
    }, (block: any) => {
        const ms = arduinoGenerator.valueToCode(block, 'MS', Order.ATOMIC) || '1000';
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        const id = block.id.replace(/[^a-zA-Z0-9]/g, '');

        // Run once logic: check if elapsed AND not run yet? 
        // Or "After boot"?
        // Usually "after boot".

        return `
  static bool ran_${id} = false;
  if (!ran_${id} && millis() > ${ms}) {
      ran_${id} = true;
      ${branch}
  }
\n`;
    });

};

export const TimerUtilsModule: BlockModule = {
    id: 'core.timer_utils',
    name: 'Software Timers',
    category: 'Time',
    init
};
