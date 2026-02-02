/**
 * @file src/generators/utils/LibraryMapper.ts
 * @module EmbedBlocks/Frontend/Generators/Utils
 */

/**
 * 跨平台库自动映射器 (Cross-Platform Library Mapper)
 * 
 * 解决 P0 级严重性问题：硬编码的平台差异逻辑。
 * 核心功能是根据目标芯片家族 (family) 自动替换库引用。
 */
export class LibraryMapper {
    /**
     * 针对不同平台的映射表 (Mapping Rules)
     * Key 为原始头文件名称 (包含括号/引号), Value 为目标头文件内容
     */
    private static readonly RULES: Record<string, Record<string, string>> = {
        'esp32': {
            '<Servo.h>': '#include <ESP32Servo.h>',
            '<WiFi.h>': '#include <WiFi.h>',
        },
        'esp8266': {
            '<WiFi.h>': '#include <ESP8266WiFi.h>',
            '<Servo.h>': '#include <Servo.h>',
        }
    };

    /**
     * 根据芯片家族重定向 Include 代码 (Map Library)
     * 
     * @param family 芯片家族 (如 'arduino', 'esp32', 'esp8266')
     * @param originalCode 原始生成的 #include 语句或头文件名称
     * @returns 映射后的最终代码
     */
    public static mapInclude(family: string, originalCode: string): string {
        const platformRules = this.RULES[family];
        if (!platformRules) return originalCode;

        for (const [header, replacement] of Object.entries(platformRules)) {
            // 支持完整匹配 (#include <Servo.h>) 或部分匹配 (<Servo.h>)
            if (originalCode.includes(header)) {
                return replacement;
            }
        }

        return originalCode;
    }
}
