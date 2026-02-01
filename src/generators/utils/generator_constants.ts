/**
 * ============================================================
 * 生成器常量 - 运算符优先级 (Generator Constants)
 * ============================================================
 * 
 * 定义 C/C++ 运算符的优先级顺序，用于生成器在代码输出时
 * 正确添加括号以保证表达式语义正确。
 * 
 * 数值越小优先级越高 (ATOMIC 最高，NONE 最低)
 * 
 * @file src/generators/utils/generator_constants.ts
 * @module EmbedBlocks/Frontend/Generators/Utils
 */

export const Order = {
    ATOMIC: 0, UNARY_POSTFIX: 1, UNARY_PREFIX: 2, MULTIPLICATIVE: 3, ADDITIVE: 4,
    SHIFT: 5, RELATIONAL: 6, EQUALITY: 7, BITWISE_AND: 8, BITWISE_XOR: 9,
    BITWISE_OR: 10, LOGICAL_AND: 11, LOGICAL_OR: 12, CONDITIONAL: 13,
    ASSIGNMENT: 14, NONE: 99
};
