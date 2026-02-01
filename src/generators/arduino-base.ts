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

// Internal CodeBuilder instance
const builder = new CodeBuilder();

// Use Object.assign to attach Order to the generator instance for backward compatibility
// inside generator logic (this.ORDER_ATOMIC etc)
Object.assign(arduinoGenerator, Order);
for (const key in Order) {
  // @ts-ignore
  arduinoGenerator['ORDER_' + key] = Order[key];
}

arduinoGenerator.init = function (workspace: any) {
  console.log('[ArduinoGenerator] init called for workspace');
  this.definitions_ = Object.create(null);
  this.functions_ = Object.create(null);
  this.pins_ = Object.create(null);
  this.times_ = Object.create(null);
  this.loopDepth_ = 0;
  this.functionPrototypes_ = Object.create(null);

  this.userSetupCode_ = null;
  this.userLoopCode_ = null;
  this.hasExplicitSetup_ = false;
  this.hasExplicitLoop_ = false;

  this.setups_ = Object.create(null);
  this.loops_ = Object.create(null);
  this.family_ = 'arduino'; // Default family

  builder.reset();
  builder.addInclude('arduino_h', '#include <Arduino.h>');
};

/**
 * 设置当前开发板系列
 * @param family - 'arduino', 'esp32', 'stm32' 等
 */
arduinoGenerator.setFamily = function (family: string) {
  this.family_ = family;
  console.log('[ArduinoGenerator] Set family to:', family);
};

/**
 * 获取当前开发板系列
 */
arduinoGenerator.getFamily = function () {
  return this.family_;
};

// ---------------------------------------------------------------------------
// 代理方法到 CodeBuilder (Proxy Methods)
// ---------------------------------------------------------------------------
// 以下方法将请求转发给 CodeBuilder 实例，实现对 Include, Macro, Setup 等代码片段的
// 统一管理和去重。这是解决 "生成器崩溃" 问题的关键修复。

arduinoGenerator.addInclude = function (key: string, code: string) {
  builder.addInclude(key, code);
};

arduinoGenerator.addMacro = function (key: string, code: string) {
  builder.addMacro(key, code);
};

arduinoGenerator.addType = function (key: string, code: string) {
  builder.addType(key, code);
};

arduinoGenerator.addVariable = function (key: string, code: string) {
  builder.addVariable(key, code);
};

arduinoGenerator.addFunction = function (key: string, code: string) {
  builder.addFunction(key, code);
};

arduinoGenerator.addPrototype = function (key: string, code: string) {
  builder.addPrototype(key, code);
};

arduinoGenerator.addSetup = function (key: string, code: string) {
  builder.addSetup(key, code);
};

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
 * 生成最终的 .ino/.cpp 文件内容
 */
arduinoGenerator.finish = function (code: string) {
  console.log('[ArduinoGenerator] finish called. Code length:', code.length);
  // Handle pin modes auto-initialization
  for (const pin in this.pins_) {
    const mode = this.pins_[pin];
    if (mode === 'OUTPUT' || mode === 'INPUT' || mode === 'INPUT_PULLUP') {
      builder.addSetup(`pin_${pin}_mode`, `pinMode(${pin}, ${mode});`);
    }
  }

  if (this.definitions_['serial_begin'] || (this.definitions_ && (this.definitions_ as any)['serial_begin'])) {
    builder.addSetup('serial_begin', 'Serial.begin(115200);');
  }

  // Handle prototypes if any
  for (const name in this.functionPrototypes_) {
    builder.addPrototype(name, this.functionPrototypes_[name]);
  }

  // Generate final code using builder
  const finalCode = builder.build(this.userSetupCode_ || '', (this.userLoopCode_ || '') + code, this.INDENT);
  console.log('[ArduinoGenerator] finalCode length:', finalCode.length);

  // Reset separate generation flags for next run
  this.userSetupCode_ = undefined;
  this.userLoopCode_ = undefined;
  this.hasExplicitSetup_ = false;
  this.hasExplicitLoop_ = false;

  return finalCode;
};

arduinoGenerator.scrub_ = function (block: any, code: string) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  const nextCode = arduinoGenerator.blockToCode(nextBlock);
  return code + nextCode;
};

// Re-export constants and helpers
export { Order } from './utils/generator_constants';
export { cleanName, registerBlock, registerGeneratorOnly, reservePin } from './utils/generator_utils';
