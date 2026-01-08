// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // Simple KNN Implementation in C++ 
    // Supports up to 50 examples, 3 dimensions (e.g. RGB)
    // K=3 hardcoded for simplicity

    registerBlock('tinyml_knn_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TINYML_KNN_INIT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(280); // Purple/AI color
            this.setTooltip(Blockly.Msg.ARD_TINYML_KNN_INIT_TOOLTIP);
        }
    }, (block: any) => {
        arduinoGenerator.functions_['knn_struct'] = `
struct KNNPoint {
  float features[3];
  int label;
};

KNNPoint knn_data[50];
int knn_count = 0;

int knn_classify(float f0, float f1, float f2, int k) {
  float distances[50];
  for(int i=0; i<knn_count; i++) {
                     pow(y - knn_examples[i].y, 2) + 
                     pow(z - knn_examples[i].z, 2) );
     if(d < min_dist) {
         min_dist = d;
         best_label = knn_examples[i].label;
     }
  }
  return best_label;
}

void knn_add(float x, float y, float z, int label) {
   if(knn_count < 50) {
      knn_examples[knn_count].x = x;
      knn_examples[knn_count].y = y;
      knn_examples[knn_count].z = z;
      knn_examples[knn_count].label = label;
      knn_count++;
   }
}
`;
        arduinoGenerator.addSetup('knn_reset', `knn_count = 0;`);
        return '';
    });

    registerBlock('tinyml_knn_add', {
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
    }, (block: any) => {
        const x = arduinoGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
        const y = arduinoGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
        const z = arduinoGenerator.valueToCode(block, 'Z', Order.ATOMIC) || '0';
        const l = arduinoGenerator.valueToCode(block, 'LABEL', Order.ATOMIC) || '1';
        return `knn_add(${x}, ${y}, ${z}, ${l});\n`;
    });

    registerBlock('tinyml_knn_classify', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_TINYML_KNN_PREDICT);
            this.appendValueInput("X").setCheck("Number").appendField(Blockly.Msg.ARD_TINYML_INPUT_1);
            this.appendValueInput("Y").setCheck("Number").appendField(Blockly.Msg.ARD_TINYML_INPUT_2);
            this.appendValueInput("Z").setCheck("Number").appendField(Blockly.Msg.ARD_TINYML_INPUT_3);
            this.setOutput(true, "Number");
            this.setColour(280);
        }
    }, (block: any) => {
        const x = arduinoGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
        const y = arduinoGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
        const z = arduinoGenerator.valueToCode(block, 'Z', Order.ATOMIC) || '0';
        return [`knn_classify(${x}, ${y}, ${z})`, Order.ATOMIC];
    });

};

export const TinyMLModule: BlockModule = {
    id: 'core.tinyml',
    name: 'Edge AI (TinyML)',
    category: 'Logic',
    init
};
