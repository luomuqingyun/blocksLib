/**
 * ============================================================
 * Arduino 代码生成器基类 (Arduino Generator Base)
 * ============================================================
 * 
 * 扩展自 Blockly 的 Generator 类，专门用于生成 C/C++ 代码。
 * 这是整个代码生成系统的核心，所有积木块的代码生成都依赖于此。
 * 
 * 核心功能:
 * - 管理代码缩进和格式化
 * - 统一处理 Include、Macro、Variable、Function 等代码片段
 * - 生成标准的 setup() 和 loop() 结构
 * - 支持多平台 (Arduino/ESP32/STM32)
 * 
 * 代码生成流程:
 * 1. init(): 初始化状态，重置 CodeBuilder
 * 2. 遍历工作区积木块，调用各自的生成器函数
 * 3. 生成器函数调用 addInclude/addSetup/addLoop 等方法
 * 4. finish(): 使用 CodeBuilder 拼接最终代码
 * 
 * 代理方法:
 * 大部分 add* 方法都代理到 CodeBuilder 实例，
 * 解决了传统字符串拼接的 Include 冲突和顺序问题。
 * 
 * @file src/generators/arduino-base.ts
 * @module EmbedBlocks/Frontend/Generators
 */

import * as Blockly from 'blockly';
import { Order } from './utils/generator_constants';
import { ArduinoGenerator } from './utils/generator_types';
import { CodeBuilder } from './utils/CodeBuilder';

/**
 * 核心代码生成器实例
 * 扩展自 Blockly.Generator，添加 Arduino 特定功能
 */
export const arduinoGenerator = new Blockly.Generator('Arduino') as ArduinoGenerator;

// 内部代码构建器实例，用于汇总和去重各个代码片段
const builder = new CodeBuilder();

// 将优先级常量 (Order) 绑定到生成器实例上，以确保向后兼容
// 允许在生成器逻辑中使用 this.ORDER_ATOMIC 等语法
Object.assign(arduinoGenerator, Order);
for (const key in Order) {
  // @ts-ignore
  arduinoGenerator['ORDER_' + key] = Order[key];
}

/**
 * 生成器初始化 (Initialization)
 * 在每次点击“编译”或“运行”触发代码生成时首先调用。
 * 重置所有内部字典和标记，确保代码生成的幂等性。
 */
arduinoGenerator.init = function (workspace: any) {
  console.log('[ArduinoGenerator] init called for workspace');

  // 初始化各类代码容器
  this.definitions_ = Object.create(null);      // 存储简单的代码定义
  this.functions_ = Object.create(null);        // 存储积木生成的函数名
  this.pins_ = Object.create(null);             // 存储引脚状态（INPUT/OUTPUT）
  this.times_ = Object.create(null);            // 存储时间戳相关宏
  this.loopDepth_ = 0;                          // 跟踪循环嵌套深度
  this.functionPrototypes_ = Object.create(null); // 存储 C++ 函数原型

  // 初始化用户自定义代码片段容器
  this.userSetupCode_ = null;                   // 用户直接写入的 setup 代码
  this.userLoopCode_ = null;                    // 用户直接写入的 loop 代码
  this.hasExplicitSetup_ = false;               // 是否声明了明确的 setup 积木
  this.hasExplicitLoop_ = false;                // 是否声明了明确的 loop 积木

  this.setups_ = Object.create(null);           // 兼容性 setups 字典
  this.loops_ = Object.create(null);            // 兼容性 loops 字典
  this.family_ = 'arduino';                     // 默认芯片家族设为 Arduino

  // 重置 CodeBuilder 并添加默认的 Arduino.h
  builder.reset();
  builder.addInclude('arduino_h', '#include <Arduino.h>');
};

/**
 * 设置当前开发板系列 (Set Target Family)
 * 不同的芯片家族（如 ESP32, ESP8266, STM32）会触发不同的内部逻辑和库重定向。
 * 
 * @param family - 例如 'arduino', 'esp32', 'esp8266', 'stm32' 等
 */
arduinoGenerator.setFamily = function (family: string) {
  this.family_ = family;
  console.log('[ArduinoGenerator] Set family to:', family);
};

/**
 * 获取当前选择的芯片家族
 */
arduinoGenerator.getFamily = function () {
  return this.family_;
};

// ---------------------------------------------------------------------------
// 代理方法到 CodeBuilder (Proxy Methods)
// ---------------------------------------------------------------------------
// 以下方法将请求转发给 CodeBuilder 实例，实现对 Include, Macro, Setup 等代码片段的
// 统一管理和去重。这是解决 "生成器崩溃" 问题的关键修复。

/**
 * 添加包含文件 (#include)
 * 包含智能库映射逻辑：根据芯片家族自动选择对应的库实现
 */
arduinoGenerator.addInclude = function (key: string, code: string) {
  let finalCode = code;

  // 1. 根据芯片家族进行自动库映射 (Library Mapping)
  const family = (this as any).family_ || 'arduino';

  if (family === 'esp32') {
    // ESP32 平台映射
    if (code.includes('<Servo.h>')) finalCode = '#include <ESP32Servo.h>';
    else if (code.includes('<WiFi.h>')) finalCode = '#include <WiFi.h>'; // ESP32 默认就是 WiFi.h
  } else if (family === 'esp8266') {
    // ESP8266 平台映射
    if (code.includes('<WiFi.h>')) finalCode = '#include <ESP8266WiFi.h>';
    else if (code.includes('<Servo.h>')) finalCode = '#include <Servo.h>'; // ESP8266 通常使用标准 Servo.h
  }

  // 2. 交付给 CodeBuilder 进行去重和存储
  builder.addInclude(key, finalCode);
};

/** 添加宏定义 (#define) */
arduinoGenerator.addMacro = function (key: string, code: string) {
  builder.addMacro(key, code);
};

/** 添加类型定义 (struct/enum) */
arduinoGenerator.addType = function (key: string, code: string) {
  builder.addType(key, code);
};

/** 添加全局变量 */
arduinoGenerator.addVariable = function (key: string, code: string) {
  builder.addVariable(key, code);
};

/** 添加完整函数定义 */
arduinoGenerator.addFunction = function (key: string, code: string) {
  builder.addFunction(key, code);
};

/** 添加函数原型 */
arduinoGenerator.addPrototype = function (key: string, code: string) {
  builder.addPrototype(key, code);
};

/** 添加 Setup 初始化代码 (将由 CodeBuilder 注入 setup() 函数体) */
arduinoGenerator.addSetup = function (key: string, code: string) {
  builder.addSetup(key, code);
};

/** 添加 Loop 循环处理代码 (将由 CodeBuilder 注入 loop() 函数体) */
arduinoGenerator.addLoop = function (key: string, code: string) {
  builder.addLoop(key, code);
};

arduinoGenerator.quote_ = function (str: string) {
  str = str.replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\\n')
    .replace(/"/g, '\\"');
  return '"' + str + '"';
};


// ... existing helper methods ...

/**
 * 完成代码生成 (Finish Code Generation)
 * 拼接 Header, Includes, Defines, Variables, Setup, Loop
 * 
 * 流程:
 * 1. 自动根据引脚占用情况生成的 pinMode() 语句。
 * 2. 自动根据串口使用情况生成 Serial.begin()。
 * 3. 收集所有生成的函数原型。
 * 4. 调用 CodeBuilder 进行最终的代码拼接。
 */
arduinoGenerator.finish = function (code: string) {
  console.log('[ArduinoGenerator] finish called. Code length:', code.length);
  // 1. 自动处理引脚模式初始化 (Auto PinMode)
  for (const pin in this.pins_) {
    const mode = this.pins_[pin];
    if (mode === 'OUTPUT' || mode === 'INPUT' || mode === 'INPUT_PULLUP') {
      builder.addSetup(`pin_${pin}_mode`, `pinMode(${pin}, ${mode});`);
    }
  }

  // 2. 自动处理串口初始化
  if (this.definitions_['serial_begin'] || (this.definitions_ && (this.definitions_ as any)['serial_begin'])) {
    builder.addSetup('serial_begin', 'Serial.begin(115200);');
  }

  // 3. 处理函数原型
  for (const name in this.functionPrototypes_) {
    builder.addPrototype(name, this.functionPrototypes_[name]);
  }

  // 4. 使用 CodeBuilder 构建最终代码
  const finalCode = builder.build(this.userSetupCode_ || '', (this.userLoopCode_ || '') + code, this.INDENT);
  console.log('[ArduinoGenerator] finalCode length:', finalCode.length);

  // 重置状态，为下一次生成做准备
  this.userSetupCode_ = undefined;
  this.userLoopCode_ = undefined;
  this.hasExplicitSetup_ = false;
  this.hasExplicitLoop_ = false;

  return finalCode;
};

/**
 * 积木代码提取核心 (Scrub)
 * 负责处理当前积木及其后续连接积木的代码生成。
 */
arduinoGenerator.scrub_ = function (block: any, code: string) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  const nextCode = arduinoGenerator.blockToCode(nextBlock);
  return code + nextCode;
};

// Re-export constants and helpers
export { Order } from './utils/generator_constants';
export { cleanName, registerBlock, registerGeneratorOnly, reservePin } from './utils/generator_utils';
