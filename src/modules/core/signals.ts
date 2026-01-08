// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // Simple Kalman Filter Implementation
    // Based on SimpleKalmanFilter library concepts but inlined for simplicity or using a struct

    registerBlock('filter_kalman_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SIG_KALMAN_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NAME)
                .appendField(new Blockly.FieldTextInput("myFilter"), "NAME");
            this.appendValueInput("MEA_E")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_MEAS_E);
            this.appendValueInput("EST_E")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_EST_E);
            this.appendValueInput("Q")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_Q);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230); // Math/Logic color
            this.setTooltip(Blockly.Msg.ARD_KALMAN_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        const mea_e = arduinoGenerator.valueToCode(block, 'MEA_E', Order.ATOMIC) || '2.0';
        const est_e = arduinoGenerator.valueToCode(block, 'EST_E', Order.ATOMIC) || '2.0';
        const q = arduinoGenerator.valueToCode(block, 'Q', Order.ATOMIC) || '0.01';

        arduinoGenerator.functions_['kalman_struct'] = `
struct SimpleKalman {
  float _err_measure;
  float _err_estimate;
  float _q;
  float _current_estimate = 0;
  float _last_estimate = 0;
  float _kalman_gain = 0;

  void init(float mea_e, float est_e, float q) {
    _err_measure = mea_e;
    _err_estimate = est_e;
    _q = q;
  }

  float update(float mea) {
    _kalman_gain = _err_estimate / (_err_estimate + _err_measure);
    _current_estimate = _last_estimate + _kalman_gain * (mea - _last_estimate);
    _err_estimate =  (1.0 - _kalman_gain) * _err_estimate + fabs(_last_estimate-_current_estimate)*_q;
    _last_estimate = _current_estimate;
    return _current_estimate;
  }
};
`;
        arduinoGenerator.addVariable('kalman_obj_' + name, `SimpleKalman ${name};`);
        arduinoGenerator.addSetup('kalman_setup_' + name, `${name}.init(${mea_e}, ${est_e}, ${q});`);
        return '';
    });

    registerBlock('filter_kalman_update', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SIG_KALMAN_UPD)
                .appendField(new Blockly.FieldTextInput("myFilter"), "NAME");
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IO_VAL);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_KALMAN_UP_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        return [`${name}.update(${val})`, Order.ATOMIC];
    });

    // Low Pass Filter (Alpha Beta)
    registerBlock('filter_lowpass', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SIG_LP_FILTER);
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_NEW);
            this.appendValueInput("OLD")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_OLD);
            this.appendValueInput("ALPHA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_ALPHA);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_SIG_SMOOTH_TOOLTIP);
        }
    }, (block: any) => {
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        const old = arduinoGenerator.valueToCode(block, 'OLD', Order.ATOMIC) || '0';
        const alpha = arduinoGenerator.valueToCode(block, 'ALPHA', Order.ATOMIC) || '0.5';

        return [`((${alpha} * ${val}) + ((1.0 - ${alpha}) * ${old}))`, Order.ATOMIC];
    });

};

export const SignalsModule: BlockModule = {
    id: 'core.signals',
    name: 'Signal Processing',
    category: 'Math',
    init
};
