// @ts-ignore
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import * as Blockly from 'blockly';
import { BoardRegistry } from '../../registries/BoardRegistry';

import { BlockModule } from '../../registries/ModuleRegistry';
import { FieldSlider } from '@blockly/field-slider';

const init = () => {

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

    // 生成 PWM 引脚选项 (带硬件定时器提示)
    // 自动查找当前板子的 pinout.TIM 数据，显示如 "PA0 (TIM2_CH1)"
    const generatePWMOptions = (): [string, string][] => {
        const board = BoardRegistry.getCurrentBoard();
        const pins = board?.pin_options?.pwm;
        const timData = board?.pinout?.TIM;

        if (pins && Array.isArray(pins) && pins.length > 0) {
            return pins.map((p: any): [string, string] => {
                const name = String(Array.isArray(p) ? p[0] : p);
                const value = String(Array.isArray(p) ? p[1] : p);

                // 硬件提示查找逻辑 (Hardware Hint Lookup)
                // 遍历 pinout.TIM 结构，查找当前引脚所属的定时器和通道
                let hint = "";
                if (timData) {
                    for (const timerName in timData) {
                        const channels = timData[timerName];
                        for (const chName in channels) {
                            if (channels[chName].includes(value)) { // Fix: Search by value, not name
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

    registerBlock('arduino_digital_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DIG_WRITE)
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "PIN")
                .appendField(Blockly.Msg.ARD_IO_TO)
                .appendField(new Blockly.FieldDropdown([["HIGH", "HIGH"], ["LOW", "LOW"]]), "STATE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_IO_DIG_WRITE_TOOLTIP);
        }
    }, function (block: any) {
        const pin = block.getFieldValue('PIN');
        const state = block.getFieldValue('STATE');
        // 数字写 -> 必须生成 pinMode(OUTPUT)
        reservePin(block, pin, 'OUTPUT');
        return `digitalWrite(${pin}, ${state});\n`;
    });

    registerBlock('arduino_digital_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DIG_READ)
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "PIN");
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_IO_DIG_READ_TOOLTIP);
        }
    }, function (block: any) {
        const pin = block.getFieldValue('PIN');
        // 数字读 -> 必须生成 pinMode(INPUT)
        reservePin(block, pin, 'INPUT');
        return [`digitalRead(${pin})`, Order.ATOMIC];
    });

    registerBlock('arduino_analog_write', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ANA_WRITE)
                .appendField(new Blockly.FieldDropdown(generatePWMOptions), "PIN")
                .appendField(Blockly.Msg.ARD_IO_VAL);
            this.appendValueInput("NUM").setCheck("Number");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_IO_ANA_WRITE_TOOLTIP);
        }
    }, function (block: any) {
        const pin = block.getFieldValue('PIN');
        const value = arduinoGenerator.valueToCode(block, 'NUM', Order.ATOMIC) || '0';

        // 恢复原有逻辑：注册为 OUTPUT
        // 这样会在 setup() 中生成 pinMode(pin, OUTPUT)，与 Mixly 和官方示例保持一致
        reservePin(block, pin, 'OUTPUT');

        return `analogWrite(${pin}, ${value});\n`;
    });

    // ... analog_read stays the same ...

    registerBlock('arduino_tone', {
        init: function () {
            this.appendValueInput("FREQ")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IO_TONE)
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "PIN")
                .appendField(Blockly.Msg.ARD_IO_FREQ);
            this.appendValueInput("DURATION")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IO_DUR);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_IO_TONE_TOOLTIP);
        }
    }, function (block: any) {
        const pin = block.getFieldValue('PIN');
        const freq = arduinoGenerator.valueToCode(block, 'FREQ', Order.NONE) || '1000';
        const dur = arduinoGenerator.valueToCode(block, 'DURATION', Order.NONE) || '0';

        // Tone 一般也作为 OUTPUT 处理比较稳妥
        reservePin(block, pin, 'OUTPUT');

        if (dur === '0') return `tone(${pin}, ${freq});\n`;
        return `tone(${pin}, ${freq}, ${dur});\n`;
    });

    registerBlock('io_shiftout', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_SHIFTOUT || "ShiftOut");
            this.appendValueInput("DATA")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_IO_DATA_BYTE);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DATA_PIN)
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "DPIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_CLOCK_PIN)
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "CPIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ORDER)
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
        arduinoGenerator.addSetup(`pin_${dpin}_mode`, `pinMode(${dpin}, OUTPUT);`);
        arduinoGenerator.addSetup(`pin_${cpin}_mode`, `pinMode(${cpin}, OUTPUT);`);

        return `shiftOut(${dpin}, ${cpin}, ${order}, ${val});\n`;
    });

    registerBlock('io_shiftin', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_SHIFTIN || "ShiftIn");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_DATA_PIN)
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "DPIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_CLOCK_PIN)
                .appendField(new Blockly.FieldDropdown(generateDigitalOptions), "CPIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ORDER)
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

    registerBlock('arduino_analog_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_IO_ANA_READ)
                .appendField(new Blockly.FieldDropdown(generateAnalogOptions), "PIN");
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_IO_ANA_READ_TOOLTIP);
        }
    }, function (block: any) {
        const pin = block.getFieldValue('PIN');
        reservePin(block, pin, 'ANALOG');
        return [`analogRead(${pin})`, Order.ATOMIC];
    });

    registerBlock('arduino_map', {
        init: function () {
            this.appendValueInput("VAL").setCheck("Number").appendField(Blockly.Msg.ARD_MAP);
            this.appendValueInput("F_LOW").setCheck("Number").appendField(Blockly.Msg.ARD_MAP_FROM);
            this.appendValueInput("F_HIGH").setCheck("Number").appendField(Blockly.Msg.ARD_MAP_TO);
            this.appendValueInput("T_LOW").setCheck("Number").appendField(Blockly.Msg.ARD_MAP_TO_NEW);
            this.appendValueInput("T_HIGH").setCheck("Number").appendField(Blockly.Msg.ARD_MAP_TO);
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip(Blockly.Msg.ARD_IO_MAP_TOOLTIP);
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

export const IOModule: BlockModule = {
    id: 'hardware.io',
    name: 'Basic I/O',
    category: 'IO',
    init
};