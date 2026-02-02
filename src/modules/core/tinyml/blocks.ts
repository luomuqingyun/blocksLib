/**
 * ============================================================
 * TinyML (嵌入式机器学习) 积木定义
 * ============================================================
 */
import * as Blockly from 'blockly';

export const defineBlocks = () => {

    Blockly.Blocks['tinyml_knn_init'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TINYML_KNN_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_TINYML_KNN_INIT_TOOLTIP);
        }
    };

    Blockly.Blocks['tinyml_knn_add'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TINYML_KNN_TRAIN);
            this.appendValueInput("X").setCheck("Number").appendField(Blockly.Msg.ARD_TINYML_INPUT_1);
            this.appendValueInput("Y").setCheck("Number").appendField(Blockly.Msg.ARD_TINYML_INPUT_2);
            this.appendValueInput("Z").setCheck("Number").appendField(Blockly.Msg.ARD_TINYML_INPUT_3);
            this.appendValueInput("LABEL").setCheck("Number").appendField(Blockly.Msg.ARD_TINYML_LABEL);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(280);
        }
    };

    Blockly.Blocks['tinyml_knn_classify'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TINYML_KNN_PREDICT);
            this.appendValueInput("X").setCheck("Number").appendField(Blockly.Msg.ARD_TINYML_INPUT_1);
            this.appendValueInput("Y").setCheck("Number").appendField(Blockly.Msg.ARD_TINYML_INPUT_2);
            this.appendValueInput("Z").setCheck("Number").appendField(Blockly.Msg.ARD_TINYML_INPUT_3);
            this.setOutput(true, "Number");
            this.setColour(280);
        }
    };
};
