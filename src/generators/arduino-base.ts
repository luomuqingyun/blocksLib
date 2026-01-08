import * as Blockly from 'blockly';
import { Order } from './utils/generator_constants';
import { ArduinoGenerator } from './utils/generator_types';
import { CodeBuilder } from './utils/CodeBuilder';

/**
 * 核心代码生成器基类 (Core Arduino Generator)
 * 扩展自 Blockly 的 Generator 类，专门用于生成 C/C++ 代码。
 * 负责管理代码缩进、变量定义、Setup/Loop 结构生成等。
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
 * Set the current board family for the generator.
 * @param family - 'arduino', 'esp32', 'stm32', etc.
 */
arduinoGenerator.setFamily = function (family: string) {
  this.family_ = family.toLowerCase();
};

/**
 * Get the current board family.
 */
arduinoGenerator.getFamily = function () {
  return this.family_ || 'arduino';
};

arduinoGenerator.addSetup = function (key: string, code: string) {
  builder.addSetup(key, code);
};

arduinoGenerator.addLoop = function (key: string, code: string) {
  builder.addLoop(key, code);
};

/**
 * Add an include statement with platform awareness.
 * @param key Unique identifier
 * @param code The #include code or a logical library name
 */
arduinoGenerator.addInclude = function (key: string, code: string) {
  let finalCode = code;

  // Smart Library Mapping
  if (code === '#include <Servo.h>' || key === 'servo_lib') {
    if (this.family_ === 'esp32') {
      finalCode = '#include <ESP32Servo.h>';
    } else if (this.family_ === 'stm32') {
      finalCode = '#include <Servo.h>';
    }
  } else if (code === '#include <WiFi.h>' || key === 'wifi_lib') {
    if (this.family_ === 'esp8266') {
      finalCode = '#include <ESP8266WiFi.h>';
    }
  }

  builder.addInclude(key, finalCode);
};

/**
 * Add a macro definition (uses 'macro_' prefix to ensure correct order).
 * @param key Unique identifier (will be prefixed if needed)
 * @param code The macro code
 */
arduinoGenerator.addMacro = function (key: string, code: string) {
  builder.addMacro(key, code);
};

/**
 * Add a type definition (uses 'struct_def_' prefix to ensure correct order).
 * @param key Unique identifier (will be prefixed if needed)
 * @param code The struct/enum code
 */
arduinoGenerator.addType = function (key: string, code: string) {
  builder.addType(key, code);
};

/**
 * Add a function definition.
 * @param key Unique identifier (will be prefixed if needed)
 * @param code The function code
 */
arduinoGenerator.addFunction = function (key: string, code: string) {
  builder.addFunction(key, code);
};

/**
 * Add a global variable definition.
 * @param key Unique identifier
 * @param code The variable declaration code
 */
arduinoGenerator.addVariable = function (key: string, code: string) {
  builder.addVariable(key, code);
};

arduinoGenerator.quote_ = function (string: string) {
  string = string.replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\\n')
    .replace(/"/g, '\\"');
  return '"' + string + '"';
};

// ----------------------------------------------------------------
// 完成代码生成 (Finish Code Generation)
// 拼接 Header, Includes, Defines, Variables, Setup, Loop
// 生成最终的 .ino/.cpp 文件内容
// ----------------------------------------------------------------
arduinoGenerator.finish = function (code: string) {
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
