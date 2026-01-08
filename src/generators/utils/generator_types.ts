/**
 * ArduinoGenerator 扩展类型定义 (Arduino Generator Type Extensions)
 * 
 * 为动态扩展的 Blockly Generator 提供类型安全支持。
 */
import * as Blockly from 'blockly';

/**
 * Arduino Generator 扩展接口
 * 定义了所有动态添加到 Generator 实例上的方法和属性。
 */
export interface ArduinoGeneratorExtensions {
    // ----------------------------------------------------------------
    // 内部状态 (Internal State)
    // ----------------------------------------------------------------

    /** 当前开发板系列 ('arduino' | 'esp32' | 'stm32' 等) */
    family_: string;

    /** 定义集合 (includes, macros, types, variables) */
    definitions_: Record<string, string>;

    /** 函数集合 */
    functions_: Record<string, string>;

    /** 引脚模式映射 */
    pins_: Record<string, string>;

    /** Setup 代码集合 */
    setups_: Record<string, string>;

    /** Loop 代码集合 */
    loops_: Record<string, string>;

    /** 函数原型集合 */
    functionPrototypes_: Record<string, string>;

    /** 用户 Setup 代码 */
    userSetupCode_: string | null;

    /** 用户 Loop 代码 */
    userLoopCode_: string | null;

    /** 是否有显式 Setup Block */
    hasExplicitSetup_: boolean;

    /** 是否有显式 Loop Block */
    hasExplicitLoop_: boolean;

    /** 循环嵌套深度 */
    loopDepth_: number;

    // ----------------------------------------------------------------
    // 公共方法 (Public Methods)
    // ----------------------------------------------------------------

    /**
     * 设置当前开发板系列
     * @param family - 'arduino', 'esp32', 'stm32' 等
     */
    setFamily(family: string): void;

    /**
     * 获取当前开发板系列
     * @returns 当前系列名称
     */
    getFamily(): string;

    /**
     * 添加 #include 语句
     * @param key - 唯一标识符
     * @param code - include 代码 (支持平台智能映射)
     */
    addInclude(key: string, code: string): void;

    /**
     * 添加宏定义 (#define)
     * @param key - 宏名称
     * @param code - 完整宏代码
     */
    addMacro(key: string, code: string): void;

    /**
     * 添加类型定义 (struct/enum)
     * @param key - 类型名称
     * @param code - 完整类型定义代码
     */
    addType(key: string, code: string): void;

    /**
     * 添加函数定义
     * @param key - 函数名称
     * @param code - 完整函数代码
     */
    addFunction(key: string, code: string): void;

    /**
     * 添加全局变量定义
     * @param key - 变量名称
     * @param code - 变量声明代码
     */
    addVariable(key: string, code: string): void;

    /**
     * 添加 Setup 初始化代码
     * @param key - 唯一标识符
     * @param code - 初始化代码
     */
    addSetup(key: string, code: string): void;

    /**
     * 添加 Loop 循环代码
     * @param key - 唯一标识符
     * @param code - 循环代码
     */
    addLoop(key: string, code: string): void;

    /**
     * 字符串引号转义
     * @param str - 原始字符串
     * @returns 转义后的带引号字符串
     */
    quote_(str: string): string;

    /**
     * Order constants
     */
    ORDER_ATOMIC: number;
    ORDER_UNARY_POSTFIX: number;
    ORDER_UNARY_PREFIX: number;
    ORDER_MULTIPLICATIVE: number;
    ORDER_ADDITIVE: number;
    ORDER_SHIFT: number;
    ORDER_RELATIONAL: number;
    ORDER_EQUALITY: number;
    ORDER_BITWISE_AND: number;
    ORDER_BITWISE_XOR: number;
    ORDER_BITWISE_OR: number;
    ORDER_LOGICAL_AND: number;
    ORDER_LOGICAL_OR: number;
    ORDER_CONDITIONAL: number;
    ORDER_ASSIGNMENT: number;
    ORDER_NONE: number;
}

/**
 * 完整的 Arduino Generator 类型
 * 合并 Blockly.Generator 和扩展接口
 */
export type ArduinoGenerator = Blockly.Generator & ArduinoGeneratorExtensions;

// Re-export Order from existing constants
export { Order } from './generator_constants';

