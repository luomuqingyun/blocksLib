/**
 * ============================================================
 * 国际化配置 (Internationalization Configuration)
 * ============================================================
 * 
 * 使用 i18next 实现多语言支持:
 * - 自动检测浏览器语言
 * - 支持中文 (zh/zh-CN) 和英文 (en)
 * - 英文作为后备语言
 * 
 * 翻译文件位置: src/locales/*.json
 * 
 * @file src/i18n.ts
 * @module EmbedBlocks/Frontend/I18n
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import zh from './locales/zh.json';

i18n
    // 使用浏览器语言检测器
    .use(LanguageDetector)
    // 绑定 react-i18next
    .use(initReactI18next)
    // 初始化配置
    .init({
        debug: true,
        fallbackLng: 'en', // 后备语言
        interpolation: {
            escapeValue: false, // React 自动处理转义
        },
        resources: {
            en: {
                translation: en
            },
            zh: {
                translation: zh
            },
            'zh-CN': {
                translation: zh
            }
        },
        load: 'languageOnly' // 只加载主语言代码 (如 'zh' 而非 'zh-CN')
    });

export default i18n;

