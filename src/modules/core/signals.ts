/**
 * ============================================================
 * 信号处理模块 (Signal Processing Module)
 * ============================================================
 * 
 * 提供信号滤波和处理积木:
 * - filter_kalman_init: 卡尔曼滤波器初始化
 * - filter_kalman_update: 卡尔曼滤波器更新
 * - filter_lowpass: 低通滤波 (Alpha-Beta)
 * 
 * @file src/modules/core/signals.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册与信号处理、数据平滑相关的积木块。
 * 包含一阶低通滤波和轻量级卡尔曼滤波实现。
 */
const init = () => {

    // =========================================================================
    // 1. 卡尔曼滤波器初始化 (Kalman Filter Init)
    // 注入一个简单的一维卡尔曼滤波器 C++ 结构体。
    // =========================================================================
    registerBlock('filter_kalman_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SIG_KALMAN_INIT); // 初始化卡尔曼滤波
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_DISPLAY_NAME)
                .appendField(new Blockly.FieldTextInput("myFilter"), "NAME"); // 过滤器实例名
            this.appendValueInput("MEA_E")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_MEAS_E); // 测量误差 (R)
            this.appendValueInput("EST_E")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_EST_E); // 估计误差 (P)
            this.appendValueInput("Q")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_Q); // 过程噪声 (Q)
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230); // 属于数学/算法类，使用紫色调
            this.setTooltip(Blockly.Msg.ARD_KALMAN_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        const mea_e = arduinoGenerator.valueToCode(block, 'MEA_E', Order.ATOMIC) || '2.0';
        const est_e = arduinoGenerator.valueToCode(block, 'EST_E', Order.ATOMIC) || '2.0';
        const q = arduinoGenerator.valueToCode(block, 'Q', Order.ATOMIC) || '0.01';

        // 【生成的 C++ 代码核心逻辑】
        // 这是一个自包含的一维卡尔曼滤波结构体，不依赖外部库。
        arduinoGenerator.functions_['kalman_struct'] = `
/** 简易卡尔曼滤波结构体 */
struct SimpleKalman {
  float _err_measure;  // 测量误差
  float _err_estimate; // 估计误差
  float _q;            // 过程噪声
  float _current_estimate = 0;
  float _last_estimate = 0;
  float _kalman_gain = 0; // 卡尔曼增益

  void init(float mea_e, float est_e, float q) {
    _err_measure = mea_e;
    _err_estimate = est_e;
    _q = q;
  }

  /** 更新预测值 */
  float update(float mea) {
    // 1. 计算卡尔曼增益
    _kalman_gain = _err_estimate / (_err_estimate + _err_measure);
    // 2. 根据测量值更新当前估计
    _current_estimate = _last_estimate + _kalman_gain * (mea - _last_estimate);
    // 3. 更新估计误差
    _err_estimate =  (1.0 - _kalman_gain) * _err_estimate + fabs(_last_estimate-_current_estimate)*_q;
    _last_estimate = _current_estimate;
    return _current_estimate;
  }
};
`;
        // 声明全局对象，并在 setup() 中初始化参数
        arduinoGenerator.addVariable('kalman_obj_' + name, `SimpleKalman ${name};`);
        arduinoGenerator.addSetup('kalman_setup_' + name, `${name}.init(${mea_e}, ${est_e}, ${q});`);
        return '';
    });

    // =========================================================================
    // 2. 卡尔曼滤波器更新 (Kalman Filter Update)
    // 输入新的采样值，返回平滑后的数值。
    // =========================================================================
    registerBlock('filter_kalman_update', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SIG_KALMAN_UPD) // 更新卡尔曼滤波
                .appendField(new Blockly.FieldTextInput("myFilter"), "NAME"); // 指定实例名
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IO_VAL); // 测量值
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_KALMAN_UP_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        return [`${name}.update(${val})`, Order.ATOMIC];
    });

    // =========================================================================
    // 3. 低通滤波 (Low Pass Filter / Alpha-Beta)
    // 一阶 IIR 滤波器：Output = Alpha * New + (1 - Alpha) * Old
    // =========================================================================
    registerBlock('filter_lowpass', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SIG_LP_FILTER); // 低通平滑滤波
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_NEW); // 新值
            this.appendValueInput("OLD")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_OLD); // 上次平滑值
            this.appendValueInput("ALPHA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_SIG_ALPHA); // 系数 (0.0~1.0)
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_SIG_SMOOTH_TOOLTIP);
        }
    }, (block: any) => {
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        const old = arduinoGenerator.valueToCode(block, 'OLD', Order.ATOMIC) || '0';
        const alpha = arduinoGenerator.valueToCode(block, 'ALPHA', Order.ATOMIC) || '0.5';

        // Alpha 越大，对新值越敏感（实时性好，平滑差）；Alpha 越小，平滑度越高。
        return [`((${alpha} * ${val}) + ((1.0 - ${alpha}) * ${old}))`, Order.ATOMIC];
    });

};

/**
 * 信号处理模块定义
 * 旨在为传感器数据（如陀螺仪、气压计、距离传感器）提供实时消抖和平滑。
 */
export const SignalsModule: BlockModule = {
    id: 'core.signals',
    name: 'Signal Processing',
    init
};
