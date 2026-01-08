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
