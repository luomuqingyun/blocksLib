/**
 * ============================================================
 * 基础 I/O 模块 (Base I/O Module)
 * ============================================================
 * 
 * 定义 Arduino 基础输入输出积木:
 * - 数字读写 (digitalWrite, digitalRead, pinMode)
 * - 模拟读写 (analogRead, analogWrite/PWM)
 * - DAC 输出 (dac_write)
 * - 移位寄存器 (shiftOut, shiftIn)
 * 
 * 引脚选项根据当前板卡动态生成 (带定时器提示)。
 * 
 * @file src/modules/hardware/io.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import * as Blockly from 'blockly';
import { BoardRegistry } from '../../registries/BoardRegistry';

import { BlockModule } from '../../registries/ModuleRegistry';
import { FieldSlider } from '@blockly/field-slider';


/**
 * 模块初始化函数
 * 注册 Arduino 核心 I/O 相关积木，包括数字/模拟读写、PWM 及移位输出。
 */
const init = () => {

    /**
     * 生成数字 I/O 引脚下拉选项。
     * 优先从当前选中的开发板注册表 (BoardRegistry) 中获取引脚配置，
     * 若未选中板卡则返回通用 Arduino Uno 风格的默认引脚。
     */
    const generateDigitalOptions = (): [string, string][] => {
        const board = BoardRegistry.getCurrentBoard();
        const pins = board?.pin_options?.digital;
        if (pins && Array.isArray(pins) && pins.length > 0) {
            return pins.map((p: any): [string, string] => {
                const name = String(Array.isArray(p) ? p[0] : p);
                const value = String(Array.isArray(p) ? p[1] : p);
                return [name, value];
            });
        }
        return [
            ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
            ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["10", "10"], ["11", "11"],
            ["12", "12"], ["13", "13"], ["A0", "A0"], ["A1", "A1"], ["A2", "A2"],
            ["A3", "A3"], ["A4", "A4"], ["A5", "A5"]
        ];
    };

    /**
     * 生成 PWM (模拟输出) 引脚选项。
     * 除了获取引脚列表，还会根据板卡的硬件定义查找定时器/通道信息 (TIM Hint)，
     * 帮助用户避开引脚冲突。例如显示为 "PA0 (TIM2_CH1)"。
     */
    const generatePWMOptions = (): [string, string][] => {
        const board = BoardRegistry.getCurrentBoard();
        const pins = board?.pin_options?.pwm;
        const timData = board?.pinout?.TIM;

        if (pins && Array.isArray(pins) && pins.length > 0) {
            return pins.map((p: any): [string, string] => {
                const name = String(Array.isArray(p) ? p[0] : p);
                const value = String(Array.isArray(p) ? p[1] : p);

                // 硬件提示查找逻辑 (Hardware Hint Lookup)
                let hint = "";
                if (timData) {
                    for (const timerName in timData) {
                        const channels = timData[timerName];
                        for (const chName in channels) {
                            if (channels[chName].includes(value)) {
                                hint = ` (${timerName}_${chName})`;
                                break;
                            }
                        }
                        if (hint) break;
                    }
                }

                return [name + hint, value];
            });
        }
        return [
            ["3", "3"], ["5", "5"], ["6", "6"], ["9", "9"], ["10", "10"], ["11", "11"]
        ];
    };

    /** 生成模拟输入 (ADC) 引脚选项 */
    const generateAnalogOptions = (): [string, string][] => {
        const board = BoardRegistry.getCurrentBoard();
        const analogPins = board?.pin_options?.analog;

        if (analogPins && Array.isArray(analogPins) && analogPins.length > 0) {
            return analogPins.map((p: any) => {
                const name = String(Array.isArray(p) ? p[0] : p);
                const value = String(Array.isArray(p) ? p[1] : p);
                return [name, value];
            });
        }
        return [
            ["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"], ["A4", "A4"], ["A5", "A5"]
        ];
    };

    // =========================================================================
    // 数字写 (Digital Write)
    // =========================================================================
    registerBlock('arduino_digital_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DIG_WRITE) // 数字写
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "PIN")
                .appendField(Blockly.Msg.ARD_IO_TO) // 为
                .appendField(new Blockly.FieldDropdown([["HIGH", "HIGH"], ["LOW", "LOW"]]), "STATE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230); // 蓝色，代表基础硬件操作
            this.setTooltip(Blockly.Msg.ARD_IO_DIG_WRITE_TOOLTIP);
        }
    }, function (block: any) {
        const pin = block.getFieldValue('PIN');
        const state = block.getFieldValue('STATE');
        // 核心逻辑：reservePin 会在 setup() 中自动生成对应的 pinMode(pin, OUTPUT)
        reservePin(block, pin, 'OUTPUT');
        return `digitalWrite(${pin}, ${state});\n`;
    });

    // =========================================================================
    // 引脚电平翻转 (Digital Toggle)
    // =========================================================================
    registerBlock('arduino_digital_toggle', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DIG_TOGGLE || "翻转引脚")
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "PIN")
                .appendField(Blockly.Msg.ARD_IO_TO_STATE || "电平状态");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_IO_DIG_TOGGLE_TOOLTIP || "切换数字引脚的高低电平状态。");
        }
    }, function (block: any) {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'OUTPUT');

        // 由于不同架构平台 (如 STM32 HAL vs AVR libc) 对读取已被配置为 OUTPUT 的 GPIO 引脚 
        // 行为不同（有的返回 Latch 状态，有的未定义），不宜使用 !digitalRead(PIN)。
        // 稳妥的做法是针对被翻转的引脚生成一个专门的全局布尔变量来记录状态。

        // // 引入 generator (注意作用域)
        // const gen = block.workspace ? (arduinoGenerator as any) : undefined;
        // if (gen && typeof gen.addVariable === 'function') {
        //     const varName = `toggleState_${pin.replace(/[^a-zA-Z0-9]/g, '_')}`;
        //     gen.addVariable(varName, `bool ${varName} = false;`);
        //     return `${varName} = !${varName};\ndigitalWrite(${pin}, ${varName} ? HIGH : LOW);\n`;
        // }

        const safePinId = pin.replace(/[^a-zA-Z0-9]/g, '_');
        const varName = `toggleState_${safePinId}`;
        arduinoGenerator.addVariable(varName, `bool ${varName} = false;`);
        return `${varName} = !${varName};\ndigitalWrite(${pin}, ${varName} ? HIGH : LOW);\n`;
    });

    // =========================================================================
    // 数字读 (Digital Read)
    // =========================================================================
    registerBlock('arduino_digital_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DIG_READ) // 数字读
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "PIN");
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_IO_DIG_READ_TOOLTIP);
        }
    }, function (block: any) {
        const pin = block.getFieldValue('PIN');
        // 自动初始化引脚为 INPUT 模式
        reservePin(block, pin, 'INPUT');
        return [`digitalRead(${pin})`, Order.ATOMIC];
    });

    // =========================================================================
    /**
     * 模拟写/PWM (Analog Write)
     * 在指定的支持 PWM 的引脚上输出模拟信号 (PWM 波形)。
     * 取值范围通常为 0 (完全关闭) 到 255 (完全开启)，部分开发板如 ESP32 支持更高的分辨率。
     * 可用于 LED 亮度调节或电机速度控制。
     * @category 核心 I/O
     * @param {Number} NUM 占空比数值 (默认 0-255)
     */
    // =========================================================================
    registerBlock('arduino_analog_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ANA_WRITE) // 模拟写
                .appendField(new Blockly.FieldDropdown(generatePWMOptions), "PIN")
                .appendField(Blockly.Msg.ARD_IO_VAL); // 值
            const valueInput = this.appendValueInput("NUM").setCheck("Number");
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("在选定的引脚生成 PWM 波形。常用于调光。支持的引脚列表已经根据当前开发板过滤过了。");
            
            if (!this.workspace.isFlyout) {
                 setTimeout(() => {
                     if (valueInput.connection && !valueInput.connection.isConnected()) {
                         const numBlock = this.workspace.newBlock('math_number');
                         numBlock.setFieldValue('128', 'NUM');
                         numBlock.setShadow(true);
                         numBlock.initSvg();
                         numBlock.render();
                         valueInput.connection.connect(numBlock.outputConnection);
                     }
                 }, 50);
            }
        }
    }, function (block: any) {
        const pin = block.getFieldValue('PIN');
        const value = arduinoGenerator.valueToCode(block, 'NUM', Order.ATOMIC) || '0';

        // 依然注册为 OUTPUT。对于大多数板卡，analogWrite 前需要 pinMode 为 OUTPUT。
        reservePin(block, pin, 'OUTPUT');

        return `analogWrite(${pin}, ${value});\n`;
    });

    // =========================================================================
    /**
     * 发声/频率输出 (Tone)
     * 在指定引脚上生成特定频率（由占空比 50% 的方波构成）的音频信号，驱动无源蜂鸣器发声。
     * 可以指定发声的时长，若时长为 0 则持续发声。
     * @category 核心 I/O
     * @param {Number} FREQ 声音频率 (Hz)，例如 440 是标准音高 A。
     * @param {Number} DURATION 持续时间 (毫秒)，若填 0 则持续输出波形直到被停止。
     */
    // =========================================================================
    registerBlock('arduino_tone', {
        init: function () {
            const freqInput = this.appendValueInput("FREQ")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IO_TONE) // 播放声音
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "PIN")
                .appendField(Blockly.Msg.ARD_IO_FREQ); // 频率
            const durInput = this.appendValueInput("DURATION")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IO_DUR); // 持续时间
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("生成具有指定频率的方波信号给针脚，驱动扬声器或蜂鸣器。如果时长填0，必须配合使用“停止播放”。");
            
            if (!this.workspace.isFlyout) {
                 setTimeout(() => {
                     // 频率默认值
                     if (freqInput.connection && !freqInput.connection.isConnected()) {
                         const freqBlock = this.workspace.newBlock('math_number');
                         freqBlock.setFieldValue('1000', 'NUM');
                         freqBlock.setShadow(true);
                         freqBlock.initSvg();
                         freqBlock.render();
                         freqInput.connection.connect(freqBlock.outputConnection);
                     }
                     // 持续时间默认值
                     if (durInput.connection && !durInput.connection.isConnected()) {
                         const durBlock = this.workspace.newBlock('math_number');
                         durBlock.setFieldValue('500', 'NUM');
                         durBlock.setShadow(true);
                         durBlock.initSvg();
                         durBlock.render();
                         durInput.connection.connect(durBlock.outputConnection);
                     }
                 }, 50);
            }
        }
    }, function (block: any) {
        const pin = block.getFieldValue('PIN');
        const freq = arduinoGenerator.valueToCode(block, 'FREQ', Order.NONE) || '1000';
        const dur = arduinoGenerator.valueToCode(block, 'DURATION', Order.NONE) || '0';

        reservePin(block, pin, 'OUTPUT');

        // 如果时长为 0，代表持续播放直到被 noTone() 停止
        if (dur === '0') return `tone(${pin}, ${freq});\n`;
        return `tone(${pin}, ${freq}, ${dur});\n`;
    });

    // =========================================================================
    // 移位输出 (ShiftOut)
    // 用于扩展 IO，如控制 74HC595 移位寄存器。
    // =========================================================================
    registerBlock('io_shiftout', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_SHIFTOUT || "ShiftOut"); // 移位输出
            this.appendValueInput("DATA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IO_DATA_BYTE); // 字节数据
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DATA_PIN) // 数据引脚
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "DPIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_CLOCK_PIN) // 时钟引脚
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "CPIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ORDER) // 位序
                .appendField(new Blockly.FieldDropdown([["MSBFIRST", "MSBFIRST"], ["LSBFIRST", "LSBFIRST"]]), "ORDER");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_IO_SHIFTOUT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const dpin = block.getFieldValue('DPIN');
        const cpin = block.getFieldValue('CPIN');
        const order = block.getFieldValue('ORDER');
        const val = arduinoGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '0';

        reservePin(block, dpin, 'OUTPUT');
        reservePin(block, cpin, 'OUTPUT');

        // 显式在 setup 中添加 pinMode 配置
        arduinoGenerator.addSetup(`pin_${dpin}_mode`, `pinMode(${dpin}, OUTPUT);`);
        arduinoGenerator.addSetup(`pin_${cpin}_mode`, `pinMode(${cpin}, OUTPUT);`);

        return `shiftOut(${dpin}, ${cpin}, ${order}, ${val});\n`;
    });

    // =========================================================================
    // 移位输入 (ShiftIn)
    // =========================================================================
    registerBlock('io_shiftin', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_SHIFTIN || "ShiftIn"); // 移位输入
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DATA_PIN) // 数据引脚
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "DPIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_CLOCK_PIN) // 时钟引脚
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "CPIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ORDER) // 位序
                .appendField(new Blockly.FieldDropdown([["MSBFIRST", "MSBFIRST"], ["LSBFIRST", "LSBFIRST"]]), "ORDER");
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_IO_SHIFTIN_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const dpin = block.getFieldValue('DPIN');
        const cpin = block.getFieldValue('CPIN');
        const order = block.getFieldValue('ORDER');

        reservePin(block, dpin, 'INPUT');
        reservePin(block, cpin, 'OUTPUT');

        arduinoGenerator.addSetup(`pin_${dpin}_mode`, `pinMode(${dpin}, INPUT);`);
        arduinoGenerator.addSetup(`pin_${cpin}_mode`, `pinMode(${cpin}, OUTPUT);`);

        return [`shiftIn(${dpin}, ${cpin}, ${order})`, Order.ATOMIC];
    });

    // =========================================================================
    // 模拟读 (Analog Read)
    // =========================================================================
    registerBlock('arduino_analog_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ANA_READ) // 模拟读
                .appendField(new Blockly.FieldDropdown(generateAnalogOptions), "PIN");
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_IO_ANA_READ_TOOLTIP);
        }
    }, function (block: any) {
        const pin = block.getFieldValue('PIN');
        // reservePin 会处理某些板卡特定的 ADC 引脚配置
        reservePin(block, pin, 'ANALOG');
        return [`analogRead(${pin})`, Order.ATOMIC];
    });

    // =========================================================================
    /**
     * 等比数值映射 (Map)
     * 将一个数值从原有的数值范围等比缩放到另一个目标数值范围。
     * 例如将光敏电阻读取的数值框定在 0-1024 ，映射转换为 0-255 亮度值给 LED 调光。
     * @category 核心 I/O
     * @param {Number} VAL 要被转换映射的数值
     * @param {Number} F_LOW 原始数据范围的最小下限值
     * @param {Number} F_HIGH 原始数据范围的最大上限值
     * @param {Number} T_LOW 目标数据范围的最小下限值
     * @param {Number} T_HIGH 目标数据范围的最大上限值
     */
    // =========================================================================
    registerBlock('arduino_map', {
        init: function () {
            this.appendValueInput("VAL").setCheck("Number").appendField(Blockly.Msg.ARD_MAP); // 映射
            this.appendValueInput("F_LOW").setCheck("Number").appendField(Blockly.Msg.ARD_MAP_FROM); // 自范围低
            this.appendValueInput("F_HIGH").setCheck("Number").appendField(Blockly.Msg.ARD_MAP_TO); // 至范围高
            this.appendValueInput("T_LOW").setCheck("Number").appendField(Blockly.Msg.ARD_MAP_TO_NEW); // 映射到低
            this.appendValueInput("T_HIGH").setCheck("Number").appendField(Blockly.Msg.ARD_MAP_TO); // 至范围高
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip("从一个数值范围等比例映射缩放到另一个范围。例如: 将读取的 0-1024 的传感器变动映射转化为 0-255 用于控制 LED 亮度。");
        }
    }, function (block: any) {
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.NONE) || '0';
        const fl = arduinoGenerator.valueToCode(block, 'F_LOW', Order.NONE) || '0';
        const fh = arduinoGenerator.valueToCode(block, 'F_HIGH', Order.NONE) || '1024';
        const tl = arduinoGenerator.valueToCode(block, 'T_LOW', Order.NONE) || '0';
        const th = arduinoGenerator.valueToCode(block, 'T_HIGH', Order.NONE) || '255';
        return [`map(${val}, ${fl}, ${fh}, ${tl}, ${th})`, Order.ATOMIC];
    });
};

/**
 * 基础 I/O 模块定义
 * 提供了操作微控制器底层引脚的所有核心功能。
 */
export const IOModule: BlockModule = {
    id: 'hardware.io',
    name: 'Basic I/O',
    init
};
