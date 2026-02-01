/**
 * ============================================================
 * 国际化工具函数 (I18n Utilities)
 * ============================================================
 * 
 * 提供国际化字符串处理的辅助函数。
 * 
 * 主要函数:
 * - getI18nString(): 从 I18nString 对象或普通字符串提取当前语言的文本
 * 
 * @file src/utils/i18n_utils.ts
 * @module EmbedBlocks/Frontend/Utils
 */

import { I18nString } from '../types/board';

/**
 * Extracts the appropriate string from an I18nString or a plain string
 * based on the current language.
 */
export const getI18nString = (val: string | I18nString | undefined, lang: string): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['en'] || Object.values(val)[0] || '';
};
