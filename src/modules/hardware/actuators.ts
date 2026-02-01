/**
 * ============================================================
 * 执行器模块 (Actuators Module)
 * ============================================================
 * 
 * 提供通用执行器/输出设备积木:
 * - actuator_relay: 继电器开关控制
 * - actuator_solenoid: 电磁阀/电磁铁脉冲
 * - actuator_buzzer: 蜂鸣器 (tone)
 * - actuator_vibration: 振动马达
 * 
 * 均为数字输出控制。
 * 
 * @file src/modules/hardware/actuators.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // Generic Actuators
    // =========================================================================

    // RELAY
    registerBlock('actuator_relay', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACTUATOR_RELAY);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACTUATOR_STATE)
                .appendField(new Blockly.FieldDropdown([["ON (High)", "HIGH"], ["OFF (Low)", "LOW"]]), "STATE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(0);
            this.setTooltip(Blockly.Msg.ARD_RELAY_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const state = block.getFieldValue('STATE');
        reservePin(block, pin, 'OUTPUT');

        arduinoGenerator.addSetup(`pin_${pin}_mode`, `pinMode(${pin}, OUTPUT);`);
        return `digitalWrite(${pin}, ${state});\n`;
    });

    // SOLENOID
    registerBlock('actuator_solenoid', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACTUATOR_SOLENOID);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("3"), "PIN");
            this.appendValueInput("TIME")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ACTUATOR_DURATION);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(0);
            this.setTooltip(Blockly.Msg.ARD_SOLENOID_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const time = arduinoGenerator.valueToCode(block, 'TIME', Order.ATOMIC) || '1000';
        reservePin(block, pin, 'OUTPUT');
        arduinoGenerator.addSetup(`pin_${pin}_mode`, `pinMode(${pin}, OUTPUT);`);

        return `digitalWrite(${pin}, HIGH);\ndelay(${time});\ndigitalWrite(${pin}, LOW);\n`;
    });

    // BUZZER (Simpler than Tone block in base, just generic Digital/Tone wrapper)
    registerBlock('actuator_buzzer', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACTUATOR_BUZZER);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("8"), "PIN");
            this.appendValueInput("FREQ")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_AUDIO_FREQ);
            this.appendValueInput("DUR")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ACTUATOR_DURATION);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(0);
            this.setTooltip(Blockly.Msg.ARD_AUDIO_TONE_P_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const freq = arduinoGenerator.valueToCode(block, 'FREQ', Order.ATOMIC) || '1000';
        const dur = arduinoGenerator.valueToCode(block, 'DUR', Order.ATOMIC) || '500';
        reservePin(block, pin, 'OUTPUT');

        return `tone(${pin}, ${freq}, ${dur});\n`;
    });

    registerBlock('actuator_buzzer_notone', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACTUATOR_BUZZER_STOP);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("8"), "PIN");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(0);
            this.setTooltip(Blockly.Msg.ARD_AUDIO_STOP_P_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        return `noTone(${pin});\n`;
    });

    // VIBRATION MOTOR
    registerBlock('actuator_vibration', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACTUATOR_VIBRATION);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("5"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_ACTUATOR_STATE)
                .appendField(new Blockly.FieldDropdown([["ON", "HIGH"], ["OFF", "LOW"]]), "STATE");
            this.appendValueInput("TIME")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_ACTUATOR_DURATION_FOREVER);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(0);
            this.setTooltip(Blockly.Msg.ARD_VIBRATE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const state = block.getFieldValue('STATE');
        const time = arduinoGenerator.valueToCode(block, 'TIME', Order.ATOMIC) || '0';

        reservePin(block, pin, 'OUTPUT');
        arduinoGenerator.addSetup(`pin_${pin}_mode`, `pinMode(${pin}, OUTPUT);`);

        if (state === 'HIGH') {
            return `digitalWrite(${pin}, HIGH);\nif(${time}>0) {\n  delay(${time});\n  digitalWrite(${pin}, LOW);\n}\n`;
        } else {
            return `digitalWrite(${pin}, LOW);\n`;
        }
    });

};

export const ActuatorsModule: BlockModule = {
    id: 'hardware.actuators',
    name: 'Actuators',
    category: 'Actuators',
    init
};
