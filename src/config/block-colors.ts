/**
 * Block 颜色配置 (Block Color Configuration)
 * 
 * 统一管理所有 Block 的颜色值，包括：
 * - 变量作用域颜色
 * - 工具箱分类颜色 (从 theme.ts 导入)
 */

// ============================================================
// 1. 变量/类型作用域颜色 (Variable/Type Scope Colors)
// ============================================================

export const BLOCK_COLORS = {
    // --- 变量作用域 ---
    /** 全局变量 (Global Variable) */
    GLOBAL: 330,
    /** 局部变量 (Local Variable) */
    LOCAL: 120,
    /** 函数参数 (Function Parameter) */
    PARAM: 230,
    /** 未知作用域 (Unknown Scope) */
    UNKNOWN: 0,

    // --- 复杂类型 ---
    /** 结构体/枚举/数组 (Struct/Enum/Array) */
    STRUCT: 260,
    /** 宏定义 (Macro/Constant) */
    MACRO: 180,

    // --- 函数相关 ---
    /** 函数定义 (Function Definition) */
    FUNCTION: 290,
    /** 系统函数 (System Function) */
    SYSTEM: 290,
} as const;

// ============================================================
// 2. 工具箱分类颜色 (Toolbox Category Colors)
// ============================================================
// 从 theme.ts 导出，保持向后兼容
export { CATEGORY_COLORS, getCategoryColor } from './theme';

// ============================================================
// 3. 便捷别名 (Convenience Aliases)
// ============================================================

/** 变量相关颜色 (Variable Colors) */
export const VAR_COLORS = {
    GLOBAL: BLOCK_COLORS.GLOBAL,
    LOCAL: BLOCK_COLORS.LOCAL,
    PARAM: BLOCK_COLORS.PARAM,
    UNKNOWN: BLOCK_COLORS.UNKNOWN,
    STRUCT: BLOCK_COLORS.STRUCT,
    MACRO: BLOCK_COLORS.MACRO,
} as const;

/**
 * 根据变量作用域获取颜色
 * @param scope - 作用域类型
 * @returns 颜色值
 */
export function getVarScopeColor(scope: 'GLOBAL' | 'LOCAL' | 'PARAM' | 'MACRO' | 'UNKNOWN'): number {
    switch (scope) {
        case 'GLOBAL': return BLOCK_COLORS.GLOBAL;
        case 'LOCAL': return BLOCK_COLORS.LOCAL;
        case 'PARAM': return BLOCK_COLORS.PARAM;
        case 'MACRO': return BLOCK_COLORS.MACRO;
        default: return BLOCK_COLORS.UNKNOWN;
    }
}
