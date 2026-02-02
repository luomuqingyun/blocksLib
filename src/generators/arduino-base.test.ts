import { describe, it, expect, beforeEach } from 'vitest';
import { arduinoGenerator } from './arduino-base';
import * as Blockly from 'blockly';

describe('arduinoGenerator', () => {
    beforeEach(() => {
        // 为测试初始化模拟工作区
        const mockWorkspace = {} as Blockly.Workspace;
        arduinoGenerator.init(mockWorkspace);
    });

    it('应当根据芯片家族自动映射 Servo 库', () => {
        // 测试 ESP32 家族下的库重定向
        arduinoGenerator.setFamily('esp32');
        arduinoGenerator.addInclude('servo_lib', '#include <Servo.h>');
        let code = arduinoGenerator.finish('');
        expect(code).toContain('#include <ESP32Servo.h>');

        // 测试标准 Arduino 家族下的库路径
        arduinoGenerator.init({} as Blockly.Workspace); // 重置生成器状态
        arduinoGenerator.setFamily('arduino');
        arduinoGenerator.addInclude('servo_lib', '#include <Servo.h>');
        code = arduinoGenerator.finish('');
        expect(code).toContain('#include <Servo.h>');
    });

    it('应当根据芯片家族自动映射 WiFi 库', () => {
        // 测试 ESP8266 家族下的库重定向
        arduinoGenerator.setFamily('esp8266');
        arduinoGenerator.addInclude('wifi_lib', '#include <WiFi.h>');
        const code = arduinoGenerator.finish('');
        expect(code).toContain('#include <ESP8266WiFi.h>');
    });

    it('应当能够正确添加包含文件 (#include)', () => {
        arduinoGenerator.addInclude('test_inc', '#include <Test.h>');
        const code = arduinoGenerator.finish('');
        expect(code).toContain('#include <Test.h>');
    });

    it('应当能够添加带有正确注释前缀的宏定义 (#define)', () => {
        arduinoGenerator.addMacro('MY_MACRO', '#define MY_MACRO 10');
        const code = arduinoGenerator.finish('');
        expect(code).toContain('// Macros');
        expect(code).toContain('#define MY_MACRO 10');
    });

    it('应当能够正确添加自定义类型 (struct/enum)', () => {
        arduinoGenerator.addType('MyStruct', 'struct MyStruct { int x; };');
        const code = arduinoGenerator.finish('');
        expect(code).toContain('// Types');
        expect(code).toContain('struct MyStruct { int x; };');
    });

    it('应当能够正确添加全局变量', () => {
        arduinoGenerator.addVariable('myVar', 'int myVar = 0;');
        const code = arduinoGenerator.finish('');
        expect(code).toContain('// Globals');
        expect(code).toContain('int myVar = 0;');
    });

    it('应当保持预设的代码区域顺序 (Include > Macro > Type > Global)', () => {
        arduinoGenerator.addInclude('a', '#include <a>');
        arduinoGenerator.addMacro('b', '#define b 1');
        arduinoGenerator.addType('c', 'struct c {};');
        arduinoGenerator.addVariable('d', 'int d;');

        const code = arduinoGenerator.finish('');
        const includeIdx = code.indexOf('#include <a>');
        const macroIdx = code.indexOf('#define b 1');
        const typeIdx = code.indexOf('struct c {};');
        const varIdx = code.indexOf('int d;');

        // 验证各部分在生成的字符串中的相对索引位置
        expect(includeIdx).toBeLessThan(macroIdx);
        expect(macroIdx).toBeLessThan(typeIdx);
        expect(typeIdx).toBeLessThan(varIdx);
    });

    it('应当正确处理 setup() 和 loop() 函数中的代码块', () => {
        arduinoGenerator.addSetup('init', 'Serial.begin(9600);');
        arduinoGenerator.addLoop('blink', 'digitalWrite(13, HIGH);');

        const code = arduinoGenerator.finish('// user code');
        expect(code).toContain('void setup() {');
        expect(code).toContain('Serial.begin(9600);');
        expect(code).toContain('void loop() {');
        expect(code).toContain('digitalWrite(13, HIGH);');
    });
});
