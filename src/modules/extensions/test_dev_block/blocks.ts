import * as Blockly from 'blockly/core';

export const initBlocks = () => {
    Blockly.Blocks['test_dev_log'] = {
        init: function () {
            this.appendValueInput("MESSAGE")
                .setCheck("String")
                .appendField("Dev Log");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip("Log message from internal block");
            this.setHelpUrl("");
        }
    };
};
