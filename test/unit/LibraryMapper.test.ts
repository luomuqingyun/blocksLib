/**
 * ============================================================
 * 库映射器单元测试 (Library Mapper Unit Tests)
 * ============================================================
 * 
 * 测试 LibraryMapper 在不同目标平台下的头文件映射逻辑。
 * 
 * 测试覆盖:
 * - ESP32 平台自动重定向 (e.g. Servo -> ESP32Servo)
 * - ESP8266 平台库适配
 * - 未知平台或未匹配库的默认回退行为 (原样返回)
 * 
 * @file test/unit/LibraryMapper.test.ts
 * @module EmbedBlocks/Testing/Unit/Generator
 */

import { describe, it, expect } from 'vitest';
import { LibraryMapper } from '../../src/generators/utils/LibraryMapper';

describe('LibraryMapper', () => {
    /**
     * 测试用例: ESP32 Servo 库映射
     * 验证当目标平台为 ESP32 时，标准 <Servo.h> 是否被自动替换为 <ESP32Servo.h>。
     */
    it('redirects Servo.h to ESP32Servo.h for ESP32 (映射 Servo 库)', () => {
        const result = LibraryMapper.mapInclude('esp32', '#include <Servo.h>');
        expect(result).toBe('#include <ESP32Servo.h>');
    });

    /**
     * 测试用例: ESP8266 WiFi 库映射
     * 验证当目标平台为 ESP8266 时，<WiFi.h> 是否被正确映射到 <ESP8266WiFi.h>。
     */
    it('redirects WiFi.h to ESP8266WiFi.h for ESP8266 (映射 WiFi 库)', () => {
        const result = LibraryMapper.mapInclude('esp8266', '#include <WiFi.h>');
        expect(result).toBe('#include <ESP8266WiFi.h>');
    });

    /**
     * 测试用例: 未知芯片家族的处理
     * 验证对于未在映射表中定义的芯片家族 (如 custom_board)，是否保持原样返回，不进行修改。
     */
    it('returns original code for unknown family (未知芯片家族原样返回)', () => {
        const result = LibraryMapper.mapInclude('custom_board', '#include <Servo.h>');
        expect(result).toBe('#include <Servo.h>');
    });

    /**
     * 测试用例: 无匹配规则的处理
     * 验证即使是已知芯片家族 (如 ESP32)，如果引入的库没有对应的映射规则，是否原样保留。
     */
    it('returns original code if no rule matches (无规则匹配时原样返回)', () => {
        const result = LibraryMapper.mapInclude('esp32', '#include <UnknownLib.h>');
        expect(result).toBe('#include <UnknownLib.h>');
    });

    /**
     * 测试用例: 标准 Arduino 家族处理
     * 验证标准 Arduino 家族通常不需要映射，应保持标准库引用不变。
     */
    it('handles standard Arduino family without changes (标准 Arduino 家族无变化)', () => {
        const result = LibraryMapper.mapInclude('arduino', '#include <Servo.h>');
        expect(result).toBe('#include <Servo.h>');
    });
});
