import { arduinoGenerator, Order } from '../../../generators/arduino-base';

export const defineGenerators = () => {

    arduinoGenerator.forBlock['tinyml_knn_init'] = function (block: any) {
        arduinoGenerator.functions_['knn_struct'] = `
struct KNNPoint {
  float features[3];
  int label;
};

KNNPoint knn_data[50];
int knn_count = 0;

int knn_classify(float f0, float f1, float f2, int k) {
  float distances[50];
  int best_label = -1;
  float min_dist = 99999.0;
  
  // Simple 1-NN implementation for now (K=1)
  for(int i=0; i<knn_count; i++) {
     float d = sqrt( pow(f0 - knn_data[i].features[0], 2) + 
                     pow(f1 - knn_data[i].features[1], 2) + 
                     pow(f2 - knn_data[i].features[2], 2) );
     if(d < min_dist) {
         min_dist = d;
         best_label = knn_data[i].label;
     }
  }
  return best_label;
}

void knn_add(float x, float y, float z, int label) {
   if(knn_count < 50) {
      knn_data[knn_count].features[0] = x;
      knn_data[knn_count].features[1] = y;
      knn_data[knn_count].features[2] = z;
      knn_data[knn_count].label = label;
      knn_count++;
   }
}
`;
        arduinoGenerator.addSetup('knn_reset', `knn_count = 0;`);
        return '';
    };

    arduinoGenerator.forBlock['tinyml_knn_add'] = function (block: any) {
        const x = arduinoGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
        const y = arduinoGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
        const z = arduinoGenerator.valueToCode(block, 'Z', Order.ATOMIC) || '0';
        const l = arduinoGenerator.valueToCode(block, 'LABEL', Order.ATOMIC) || '1';
        return `knn_add(${x}, ${y}, ${z}, ${l});\n`;
    };

    arduinoGenerator.forBlock['tinyml_knn_classify'] = function (block: any) {
        const x = arduinoGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
        const y = arduinoGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
        const z = arduinoGenerator.valueToCode(block, 'Z', Order.ATOMIC) || '0';
        return [`knn_classify(${x}, ${y}, ${z}, 1)`, Order.ATOMIC];
    };
};
