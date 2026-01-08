import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin, cleanName } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // --- Ultrasonic Sensor (HC-SR04) ---
    // Inputs: Trigger Pin, Echo Pin
    registerBlock('sensor_ultrasonic', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ULTRASONIC);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_TRIG)
                .appendField(new Blockly.FieldTextInput("12"), "TRIG");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_ECHO)
                .appendField(new Blockly.FieldTextInput("11"), "ECHO");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_ULTRASONIC_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const trig = block.getFieldValue('TRIG');
        const echo = block.getFieldValue('ECHO');

        reservePin(block, trig, 'OUTPUT');
        reservePin(block, echo, 'INPUT');

        arduinoGenerator.addSetup(`ultrasonic_${trig}_${echo}`, `pinMode(${trig}, OUTPUT);\npinMode(${echo}, INPUT);`);

        // Define helper function to keep loop code clean
        arduinoGenerator.addFunction('readUltrasonicDistance', `
long readUltrasonicDistance(int triggerPin, int echoPin) {
  digitalWrite(triggerPin, LOW);
  delayMicroseconds(2);
  digitalWrite(triggerPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(triggerPin, LOW);
  return pulseIn(echoPin, HIGH) * 0.034 / 2;
}`);

        return [`readUltrasonicDistance(${trig}, ${echo})`, Order.ATOMIC];
    });

    // --- DHT Sensor ---
    // Inputs: Pin, Type
    registerBlock('sensor_dht', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_DHT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("2"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_TYPE)
                .appendField(new Blockly.FieldDropdown([["DHT11", "DHT11"], ["DHT22", "DHT22"], ["DHT21", "DHT21"]]), "TYPE");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_READ)
                .appendField(new Blockly.FieldDropdown([[Blockly.Msg.ARD_SENSOR_TEMPERATURE, "readTemperature"], [Blockly.Msg.ARD_SENSOR_HUMIDITY, "readHumidity"]]), "CMD");
            this.setOutput(true, "Number");
            this.setColour(180);
            this.setTooltip(Blockly.Msg.ARD_SENSOR_DHT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const type = block.getFieldValue('TYPE');
        const cmd = block.getFieldValue('CMD');
        const name = `dht_${pin}`;

        reservePin(block, pin, 'INPUT');

        arduinoGenerator.addInclude('dht_lib', '#include "DHT.h"');
        arduinoGenerator.addVariable(`def_${name}`, `DHT ${name}(${pin}, ${type});`);
        arduinoGenerator.addSetup(`setup_${name}`, `${name}.begin();`);

        return [`${name}.${cmd}()`, Order.ATOMIC];
    });

};

export const SensorsModule: BlockModule = {
    id: 'hardware.sensors',
    name: 'Generic Sensors',
    category: 'Sensors',
    init
};
