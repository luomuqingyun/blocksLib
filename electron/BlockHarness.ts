/**
 * ============================================================
 * 积木编译验证支架 (Block Compilation Harness)
 * ============================================================
 * 
 * 为单个积木提供编译所需的 C++ 上下文环境。
 * 解决“孤立积木无法编译”的问题。
 * 
 * 该支架的作用是将积木生成的代码片段（Snippet）放置在一个完整的 C++ 项目模板中。
 * 模板会包含必要的 #include、全局定义（Definitions）以及初始化逻辑（Setup），
 * 使其成为一个可被 PlatformIO 编译的合法 main.cpp 文件。
 */

/**
 * 支架模板接口，定义了一个 C++ 项目的基础骨架
 */
export interface HarnessTemplate {
    /** 模板预设的头文件列表 (例如: #include <WiFi.h>) */
    includes: string[];
    /** 模板预设的初始化代码 (例如: Serial.begin(115200);) */
    setup: string[];
    /** 模板预设的全局变量或对象定义 (例如: U8G2_SSD1306_128X64_... u8g2(...);) */
    definitions: string[];
}

/**
 * 积木校验支架类，提供模板管理和代码组装功能
 */
export class BlockHarness {
    /**
     * 预设的分类模板库。
     * 根据积木的功能属性（核心功能、WiFi、显示器等）提供不同的环境。
     */
    private static readonly TEMPLATES: Record<string, HarnessTemplate> = {
        // 核心模板：适用于大多数通用逻辑积木，仅包含基础 Arduino 环境
        'core': {
            includes: ['#include <Arduino.h>'],
            definitions: [],
            setup: ['Serial.begin(115200);']
        },
        // WiFi 模板：适用于网络相关积木，预设了 WiFi 头文件和模拟的凭据
        'wifi': {
            includes: ['#include <Arduino.h>', '#include <WiFi.h>'],
            definitions: ['const char* ssid = "test_wifi";', 'const char* password = "test_password";'],
            setup: ['WiFi.begin(ssid, password);']
        },
        // 显示器模板：适用于屏幕操作相关积木，预设了 U8g2 绘图引擎对象
        'display': {
            includes: ['#include <Arduino.h>', '#include <Wire.h>', '#include <U8g2lib.h>'],
            definitions: ['U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);'],
            setup: ['u8g2.begin();']
        }
    };

    /**
     * 智能模板推断函数。
     * 逻辑：首先检查 Block ID 关键字，其次扫描生成的代码片段中的关键字（如 "WiFi."）。
     * 
     * @param blockId 积木的唯一标识符
     * @param generatedCode 积木生成的原始 C++ 代码片段
     * @returns 最匹配的 HarnessTemplate
     */
    public static getTemplate(blockId: string, generatedCode: string): HarnessTemplate {
        const code = generatedCode || '';
        // 如果包含 WiFi 关键字，推断为 WiFi 积木
        if (blockId.includes('wifi') || code.includes('WiFi.')) return this.TEMPLATES.wifi;
        // 如果包含屏幕相关关键字，推断为显示积木
        if (blockId.includes('lcd') || blockId.includes('oled') || code.includes('u8g2')) return this.TEMPLATES.display;
        
        // 默认回退到核心基础模板
        return this.TEMPLATES.core;
    }

    /**
     * 核心逻辑：将积木代码与支架模板组装成完整的 main.cpp。
     * 
     * @param template 选定的支架底座模板
     * @param blockCode 积木生成的代码元数据（包含片段本身及其要求的副作用）
     * @returns 组装好的完整 C++ 源代码字符串
     */
    public static assembleMain(template: HarnessTemplate, blockCode: { snippet: string, includes?: string[], setup?: string[], definitions?: string[] }): string {
        // 1. 合并并去重所有生成的 Include 语句
        const allIncludes = new Set([
            ...template.includes,
            ...(blockCode.includes || [])
        ]);
        
        // 2. 合并全局定义
        const allDefinitions = [...template.definitions, ...(blockCode.definitions || [])];
        
        // 3. 合并初始化逻辑
        const allSetups = [...template.setup, ...(blockCode.setup || [])];

        // 4. 使用模板字符串构建标准的 Arduino Sketch 结构
        return `
${Array.from(allIncludes).join('\n')}

${allDefinitions.join('\n')}

void setup() {
  ${allSetups.join('\n  ')}
}

void loop() {
  ${blockCode.snippet || ''}
}
`.trim();
    }
}
