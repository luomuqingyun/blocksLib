import { describe, it, expect, beforeEach } from 'vitest';
import { arduinoGenerator } from './arduino-base';
import * as Blockly from 'blockly';

describe('arduinoGenerator', () => {
    beforeEach(() => {
        // Mock workspace for init - using type assertion for test purposes
        const mockWorkspace = {} as Blockly.Workspace;
        arduinoGenerator.init(mockWorkspace);
    });

    it('should map Servo library based on family', () => {
        arduinoGenerator.setFamily('esp32');
        arduinoGenerator.addInclude('servo_lib', '#include <Servo.h>');
        let code = arduinoGenerator.finish('');
        expect(code).toContain('#include <ESP32Servo.h>');

        arduinoGenerator.init({} as Blockly.Workspace); // Reset
        arduinoGenerator.setFamily('arduino');
        arduinoGenerator.addInclude('servo_lib', '#include <Servo.h>');
        code = arduinoGenerator.finish('');
        expect(code).toContain('#include <Servo.h>');
    });

    it('should map WiFi library based on family', () => {
        arduinoGenerator.setFamily('esp8266');
        arduinoGenerator.addInclude('wifi_lib', '#include <WiFi.h>');
        const code = arduinoGenerator.finish('');
        expect(code).toContain('#include <ESP8266WiFi.h>');
    });

    it('should add includes correctly', () => {
        arduinoGenerator.addInclude('test_inc', '#include <Test.h>');
        const code = arduinoGenerator.finish('');
        expect(code).toContain('#include <Test.h>');
    });

    it('should add macros with correct prefix', () => {
        arduinoGenerator.addMacro('MY_MACRO', '#define MY_MACRO 10');
        const code = arduinoGenerator.finish('');
        expect(code).toContain('// Macros');
        expect(code).toContain('#define MY_MACRO 10');
    });

    it('should add types correctly', () => {
        arduinoGenerator.addType('MyStruct', 'struct MyStruct { int x; };');
        const code = arduinoGenerator.finish('');
        expect(code).toContain('// Types');
        expect(code).toContain('struct MyStruct { int x; };');
    });

    it('should add variables correctly', () => {
        arduinoGenerator.addVariable('myVar', 'int myVar = 0;');
        const code = arduinoGenerator.finish('');
        expect(code).toContain('// Globals');
        expect(code).toContain('int myVar = 0;');
    });

    it('should maintain correct section order', () => {
        arduinoGenerator.addInclude('a', '#include <a>');
        arduinoGenerator.addMacro('b', '#define b 1');
        arduinoGenerator.addType('c', 'struct c {};');
        arduinoGenerator.addVariable('d', 'int d;');

        const code = arduinoGenerator.finish('');
        const includeIdx = code.indexOf('#include <a>');
        const macroIdx = code.indexOf('#define b 1');
        const typeIdx = code.indexOf('struct c {};');
        const varIdx = code.indexOf('int d;');

        expect(includeIdx).toBeLessThan(macroIdx);
        expect(macroIdx).toBeLessThan(typeIdx);
        expect(typeIdx).toBeLessThan(varIdx);
    });

    it('should handle setups and loops', () => {
        arduinoGenerator.addSetup('init', 'Serial.begin(9600);');
        arduinoGenerator.addLoop('blink', 'digitalWrite(13, HIGH);');

        const code = arduinoGenerator.finish('// user code');
        expect(code).toContain('void setup() {');
        expect(code).toContain('Serial.begin(9600);');
        expect(code).toContain('void loop() {');
        expect(code).toContain('digitalWrite(13, HIGH);');
    });
});
