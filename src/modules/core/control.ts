/**
 * ============================================================
 * 控制系统模块 (Control Systems Module)
 * ============================================================
 * 
 * 提供 PID 控制器相关积木:
 * - pid_create: 创建 PID 控制器实例
 * - pid_compute: 执行 PID 计算
 * - pid_tunings: 调整 Kp/Ki/Kd 参数
 * 
 * 使用 PID_v1 库实现闭环控制算法。
 * 
 * @file src/modules/core/control.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, cleanName } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册自动控制系统相关的积木定义及其代码生成器。
 */
const init = () => {

    // =========================================================================
    // PID 控制器创建 (PID Setup)
    // 实例化一个 PID 对象，并将其绑定到特定的输入、输出和目标值。
    // PID 库要求输入/输出/目标值通过引用传递，以便库能实时更新这些变量。
    // =========================================================================
    registerBlock('pid_create', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PID_SETUP); // 设置 PID 控制器
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PID_NAME) // 名称
                .appendField(new Blockly.FieldTextInput("myPID"), "NAME");
            this.appendValueInput("INPUT")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_INPUT); // 输入值 (如传感器数据)
            this.appendValueInput("OUTPUT")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_OUTPUT); // 输出值 (如电机 PWM)
            this.appendValueInput("SETPOINT")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_SETPOINT); // 目标值
            this.appendValueInput("KP")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KP || "Kp"); // 比例系数
            this.appendValueInput("KI")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KI || "Ki"); // 积分系数
            this.appendValueInput("KD")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KD || "Kd"); // 微分系数
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_PID_SETUP_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));

        // 获取输入、输出和目标值的变量名
        // 注意：在 PID 库中，这三个必须是全局浮点变量，此处生成器会添加 & 取地址符
        const input = arduinoGenerator.valueToCode(block, 'INPUT', Order.ATOMIC) || 'inputVar';
        const output = arduinoGenerator.valueToCode(block, 'OUTPUT', Order.ATOMIC) || 'outputVar';
        const setpoint = arduinoGenerator.valueToCode(block, 'SETPOINT', Order.ATOMIC) || 'setpointVar';

        // 获取三个调节参数
        const kp = arduinoGenerator.valueToCode(block, 'KP', Order.ATOMIC) || '1.0';
        const ki = arduinoGenerator.valueToCode(block, 'KI', Order.ATOMIC) || '0.0';
        const kd = arduinoGenerator.valueToCode(block, 'KD', Order.ATOMIC) || '0.0';

        // 引入 Arduino PID 库
        arduinoGenerator.addInclude('pid_lib', '#include <PID_v1.h>');

        // 定义全局 PID 对象
        // 参数形式: PID myPID(&Input, &Output, &Setpoint, Kp, Ki, Kd, DIRECT);
        arduinoGenerator.addVariable('pid_' + name, `PID ${name}(&${input}, &${output}, &${setpoint}, ${kp}, ${ki}, ${kd}, DIRECT);`);

        // 在 setup() 中开启 PID 模式
        arduinoGenerator.addSetup('pid_begin_' + name, `${name}.SetMode(AUTOMATIC);`);

        return '';
    });

    // =========================================================================
    // 执行 PID 计算 (PID Compute)
    // 在主循环中不断调用，根据当前的输入和目标值更新输出。
    // =========================================================================
    registerBlock('pid_compute', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PID_COMPUTE) // 执行计算
                .appendField(new Blockly.FieldTextInput("myPID"), "NAME");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_PID_COMPUTE_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        return `${name}.Compute();\n`;
    });

    // =========================================================================
    // 动态调整参数 (PID Tunings)
    // 允许在运行时（而非仅在 setup 中）动态修改 Kp/Ki/Kd 参数。
    // =========================================================================
    registerBlock('pid_tunings', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_PID_TUNINGS) // 动态调优
                .appendField(new Blockly.FieldTextInput("myPID"), "NAME");
            this.appendValueInput("KP")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KP || "Kp");
            this.appendValueInput("KI")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KI || "Ki");
            this.appendValueInput("KD")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_PID_KD || "Kd");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(20);
            this.setTooltip(Blockly.Msg.ARD_PID_TUNINGS_TOOLTIP);
        }
    }, (block: any) => {
        const name = cleanName(block.getFieldValue('NAME'));
        const kp = arduinoGenerator.valueToCode(block, 'KP', Order.ATOMIC) || '1.0';
        const ki = arduinoGenerator.valueToCode(block, 'KI', Order.ATOMIC) || '0.0';
        const kd = arduinoGenerator.valueToCode(block, 'KD', Order.ATOMIC) || '0.0';
        return `${name}.SetTunings(${kp}, ${ki}, ${kd});\n`;
    });
};

/**
 * 控制系统模块定义
 * 提供基于工业标准 PID 库的闭环控制能力。
 */
export const ControlModule: BlockModule = {
    id: 'core.control',
    name: 'Control Systems',
    init
};
