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
 * 从 I18nString 对象或普通字符串中提取适合当前语言的文本 (Extract I18n String)
 * 
 * 逻辑优先级:
 * 1. 匹配当前指定语言 (lang) 的文本。
 * 2. 如果不存在，则尝试匹配英文 ('en') 作为回退。
 * 3. 如果依然没有，则返回对象中的第一个可用值。
 * 4. 如果输入为空，返回空字符串。
 * 
 * @param val 输入值 (可以是普通字符串或带有语言 key 的对象)
 * @param lang 当前环境语言标识 (如 'zh-hans', 'en' 等)
 * @returns 最终提取出的字符串
 */
export const getI18nString = (val: string | I18nString | undefined, lang: string): string => {
    if (!val) return '';
    // 如果直接是字符串，则直接返回
    if (typeof val === 'string') return val;

    // 如果是对象，则按优先级查找匹配语言
    return val[lang] || val['en'] || Object.values(val)[0] || '';
};
