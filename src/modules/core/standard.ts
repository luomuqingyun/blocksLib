/**
 * ============================================================
 * 标准积木生成器 (Standard Block Generators)
 * ============================================================
 * 
 * 为 Blockly 内置的标准积木注册 Arduino/C++ 代码生成器:
 * - 逻辑: controls_if, logic_compare, logic_operation, logic_negate, logic_boolean
 * - 循环: controls_repeat_ext, controls_whileUntil, controls_for
 * - 数学: math_number, math_arithmetic, math_single, math_random, math_bitwise
 * - 文本: text, text_print
 * 
 * @file src/modules/core/standard.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerGeneratorOnly, cleanName } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 为 Blockly 内置的标准积木（Logic, Loops, Math, Text）注册 Arduino/C++ 代码生成器。
 */
const init = () => {

    // =========================================================================
    // 逻辑分类 (Logic)
    // =========================================================================

    /** If-Else 分支结构 */
    registerGeneratorOnly('controls_if', function (block: any) {
        let n = 0;
        let code = '';
        // 获取第一个 IF 分支的条件和代码块
        let conditionCode = arduinoGenerator.valueToCode(block, 'IF0', Order.NONE) || 'false';
        let branchCode = arduinoGenerator.statementToCode(block, 'DO0');
        code += `if (${conditionCode}) {\n${branchCode}}`;

        // 处理中途的 Else-If 分支
        if (block.elseifCount_) {
            for (let i = 1; i <= block.elseifCount_; i++) {
                conditionCode = arduinoGenerator.valueToCode(block, 'IF' + i, Order.NONE) || 'false';
                branchCode = arduinoGenerator.statementToCode(block, 'DO' + i);
                code += ` else if (${conditionCode}) {\n${branchCode}}`;
            }
        }
        // 处理最后的 Else 分支
        if (block.elseCount_) {
            branchCode = arduinoGenerator.statementToCode(block, 'ELSE');
            code += ` else {\n${branchCode}}`;
        }
        return code + '\n';
    });

    /** 比较运算 (==, !=, <, <=, >, >=) */
    registerGeneratorOnly('logic_compare', function (block: any) {
        const OPERATORS: any = { 'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>=' };
        const op = OPERATORS[block.getFieldValue('OP')];
        const a = arduinoGenerator.valueToCode(block, 'A', Order.EQUALITY) || '0';
        const b = arduinoGenerator.valueToCode(block, 'B', Order.EQUALITY) || '0';
        return [`${a} ${op} ${b}`, Order.RELATIONAL];
    });

    /** 逻辑运算 (AND, OR) */
    registerGeneratorOnly('logic_operation', function (block: any) {
        const op = (block.getFieldValue('OP') === 'AND') ? '&&' : '||';
        const order = (op === '&&') ? Order.LOGICAL_AND : Order.LOGICAL_OR;
        let a = arduinoGenerator.valueToCode(block, 'A', order);
        let b = arduinoGenerator.valueToCode(block, 'B', order);
        if (!a && !b) { a = 'false'; b = 'false'; } else { a = a || 'false'; b = b || 'false'; }
        return [`${a} ${op} ${b}`, order];
    });

    /** 逻辑非 (Not) */
    registerGeneratorOnly('logic_negate', function (block: any) {
        const arg = arduinoGenerator.valueToCode(block, 'BOOL', Order.UNARY_PREFIX) || 'true';
        return [`!${arg}`, Order.UNARY_PREFIX];
    });

    /** 布尔常量 (True/False) */
    registerGeneratorOnly('logic_boolean', function (block: any) {
        return [(block.getFieldValue('BOOL') === 'TRUE') ? 'true' : 'false', Order.ATOMIC];
    });

    // =========================================================================
    // 循环分类 (Loops)
    // =========================================================================

    /** 计数循环 (Repeat n times) */
    registerGeneratorOnly('controls_repeat_ext', function (block: any) {
        // 增加循环深度计数，用于生成唯一的迭代变量名 (i, i2, i3...)，防止嵌套冲突
        arduinoGenerator.loopDepth_++;
        const repeats = arduinoGenerator.valueToCode(block, 'TIMES', Order.ATOMIC) || '0';
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        let loopVar = 'i';
        if (arduinoGenerator.loopDepth_ > 1) loopVar = 'i' + arduinoGenerator.loopDepth_;

        const code = `for (int ${loopVar} = 0; ${loopVar} < ${repeats}; ${loopVar}++) {\n${branch}}\n`;
        arduinoGenerator.loopDepth_--;
        return code;
    });

    /** 条件循环 (While / Until) */
    registerGeneratorOnly('controls_whileUntil', function (block: any) {
        const mode = block.getFieldValue('MODE');
        const until = mode === 'UNTIL';
        let argument0 = arduinoGenerator.valueToCode(block, 'BOOL', until ? Order.UNARY_PREFIX : Order.NONE) || 'false';
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        // Until 是 C 语言中 while(!cond) 的别名
        if (until) {
            if (argument0.match(/^\w+$/)) argument0 = '!' + argument0;
            else argument0 = '!(' + argument0 + ')';
        }
        return `while (${argument0}) {\n${branch}}\n`;
    });

    /** 范围循环 (For) */
    registerGeneratorOnly('controls_for', function (block: any) {
        const variable0 = cleanName(block.getField('VAR').getText());
        const from = arduinoGenerator.valueToCode(block, 'FROM', Order.ASSIGNMENT) || '0';
        const to = arduinoGenerator.valueToCode(block, 'TO', Order.ASSIGNMENT) || '0';
        const by = arduinoGenerator.valueToCode(block, 'BY', Order.ASSIGNMENT) || '1';
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        return `for (int ${variable0} = ${from}; ${variable0} <= ${to}; ${variable0} += ${by}) {\n${branch}}\n`;
    });

    // =========================================================================
    // 数学分类 (Math)
    // =========================================================================

    /** 数字常量 */
    registerGeneratorOnly('math_number', function (block: any) {
        return [parseFloat(block.getFieldValue('NUM')), Order.ATOMIC];
    });

    /** 基础四则运算 */
    registerGeneratorOnly('math_arithmetic', function (block: any) {
        const OP: any = { 'ADD': ['+', Order.ADDITIVE], 'MINUS': ['-', Order.ADDITIVE], 'MULTIPLY': ['*', Order.MULTIPLICATIVE], 'DIVIDE': ['/', Order.MULTIPLICATIVE] };
        const tuple = OP[block.getFieldValue('OP')];
        const operator = tuple ? tuple[0] : '+';
        const order = tuple ? tuple[1] : Order.ADDITIVE;
        const a = arduinoGenerator.valueToCode(block, 'A', order) || '0';
        const b = arduinoGenerator.valueToCode(block, 'B', order) || '0';
        return [`${a} ${operator} ${b}`, order];
    });

    /** 单目数学运算 (平方根、绝对值等) */
    registerGeneratorOnly('math_single', function (block: any) {
        const operator = block.getFieldValue('OP');
        let code;
        let arg;
        if (operator === 'NEG') {
            arg = arduinoGenerator.valueToCode(block, 'NUM', Order.UNARY_PREFIX) || '0';
            if (arg[0] === '-') arg = ' ' + arg;
            return ['-' + arg, Order.UNARY_PREFIX];
        }
        arg = arduinoGenerator.valueToCode(block, 'NUM', Order.NONE) || '0';
        // 映射到 C 语言标准库函数 (math.h)
        switch (operator) {
            case 'ABS': code = 'abs(' + arg + ')'; break;
            case 'ROOT': code = 'sqrt(' + arg + ')'; break;
            case 'LN': code = 'log(' + arg + ')'; break;
            case 'EXP': code = 'exp(' + arg + ')'; break;
            case 'POW10': code = 'pow(10, ' + arg + ')'; break;
            case 'ROUND': code = 'round(' + arg + ')'; break;
            case 'ROUNDUP': code = 'ceil(' + arg + ')'; break;
            case 'ROUNDDOWN': code = 'floor(' + arg + ')'; break;
            default: code = '0'; break;
        }
        return [code, Order.UNARY_POSTFIX];
    });

    /** 映射函数 (Map) - Arduino 专属 API */
    registerGeneratorOnly('math_map', function (block: any) {
        const value = arduinoGenerator.valueToCode(block, 'VALUE', Order.NONE) || '0';
        const fromLow = arduinoGenerator.valueToCode(block, 'FROM_LOW', Order.NONE) || '0';
        const fromHigh = arduinoGenerator.valueToCode(block, 'FROM_HIGH', Order.NONE) || '1024';
        const toLow = arduinoGenerator.valueToCode(block, 'TO_LOW', Order.NONE) || '0';
        const toHigh = arduinoGenerator.valueToCode(block, 'TO_HIGH', Order.NONE) || '255';
        return [`map(${value}, ${fromLow}, ${fromHigh}, ${toLow}, ${toHigh})`, Order.ATOMIC];
    });

    /** 数值约束 (Constrain) - Arduino 专属 API */
    registerGeneratorOnly('math_constrain', function (block: any) {
        const value = arduinoGenerator.valueToCode(block, 'VALUE', Order.NONE) || '0';
        const low = arduinoGenerator.valueToCode(block, 'LOW', Order.NONE) || '0';
        const high = arduinoGenerator.valueToCode(block, 'HIGH', Order.NONE) || '255';
        return [`constrain(${value}, ${low}, ${high})`, Order.ATOMIC];
    });

    /** 随机数 (Random) */
    registerGeneratorOnly('math_random', function (block: any) {
        const min = arduinoGenerator.valueToCode(block, 'MIN', Order.NONE) || '0';
        const max = arduinoGenerator.valueToCode(block, 'MAX', Order.NONE) || '100';
        return [`random(${min}, ${max})`, Order.ATOMIC];
    });

    /** 位运算 (&, |, ^, ~, <<, >>) */
    registerGeneratorOnly('math_bitwise', function (block: any) {
        const OPS: any = {
            'AND': ['&', Order.BITWISE_AND],
            'OR': ['|', Order.BITWISE_OR],
            'XOR': ['^', Order.BITWISE_XOR],
            'NOT': ['~', Order.UNARY_PREFIX],
            'SHL': ['<<', Order.SHIFT],
            'SHR': ['>>', Order.SHIFT]
        };
        const opStr = block.getFieldValue('OP');
        const tuple = OPS[opStr];
        const operator = tuple ? tuple[0] : '&';
        const order = tuple ? tuple[1] : Order.BITWISE_AND;

        if (opStr === 'NOT') {
            const val = arduinoGenerator.valueToCode(block, 'A', Order.UNARY_PREFIX) || '0';
            return [`~${val}`, Order.UNARY_PREFIX];
        }

        const a = arduinoGenerator.valueToCode(block, 'A', order) || '0';
        const b = arduinoGenerator.valueToCode(block, 'B', order) || '0';
        return [`${a} ${operator} ${b}`, order];
    });

    // =========================================================================
    // 文本分类 (Text)
    // =========================================================================

    /** 字符串常量 */
    registerGeneratorOnly('text', function (block: any) {
        // 使用 quote_ 辅助函数处理字符串中的特殊字符和引号转义
        const code = arduinoGenerator.quote_(block.getFieldValue('TEXT'));
        return [code, Order.ATOMIC];
    });

    /** 打印到串口 (Print) */
    registerGeneratorOnly('text_print', function (block: any) {
        const msg = arduinoGenerator.valueToCode(block, 'TEXT', Order.NONE) || '""';
        return `Serial.println(${msg});\n`;
    });
};

/**
 * 标准模块定义
 * 将 Blockly 核心库中的基础积木转换为等效的 C++ 代码。
 */
export const StandardModule: BlockModule = {
    id: 'core.standard',
    name: 'Standard Generators',
    init
};
