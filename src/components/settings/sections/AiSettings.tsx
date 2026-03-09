/**
 * ============================================================
 * AI 设置区域组件 (AI Settings Section Component)
 * ============================================================
 * 
 * 设置模态框中的 AI 助手 (OpenClaw) 配置标签页。
 * 
 * 功能:
 * - 启用/禁用 AI 助手
 * - 配置 OpenClaw 路径 (可选)
 * - 快捷执行 openclaw setup
 * 
 * @file src/components/settings/sections/AiSettings.tsx
 * @module EmbedBlocks/Frontend/Components/Settings
 */

import React from 'react';
import { Bot, Sparkles, Terminal, ShieldCheck, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AiSettingsProps {
    config: any;
    handleSave: (key: string, value: any) => void;
}

export const AiSettings: React.FC<AiSettingsProps> = ({ config, handleSave }) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-8">
            {/* 核心开关 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400">
                        <Bot size={20} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-300 block">{t('settings.aiEnabled', 'Enable AI Assistant')}</label>
                        <span className="text-xs text-slate-500">{t('settings.aiEnabledDesc', 'Use OpenClaw for automated programming and assistance')}</span>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={config.ai?.enabled ?? true}
                        onChange={(e) => handleSave('ai.enabled', e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>

            <div className="h-px bg-slate-700/50 w-full" />

            {/* 核心配置表单 */}
            <div className="space-y-4 ml-2">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 block">{t('settings.aiProvider')}</label>
                        <select
                            value={config.ai?.provider || 'deepseek'}
                            onChange={(e) => handleSave('ai.provider', e.target.value)}
                            className="w-full bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-purple-500 outline-none"
                        >
                            <option value="deepseek">DeepSeek</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="gemini">Google Gemini</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 block">{t('settings.aiModel')}</label>
                        <input
                            type="text"
                            placeholder="e.g. deepseek-chat"
                            value={config.ai?.model || ''}
                            onChange={(e) => handleSave('ai.model', e.target.value)}
                            className="w-full bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-purple-500 outline-none"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 block">{t('settings.aiApiKey')}</label>
                    <div className="relative">
                        <input
                            type="password"
                            placeholder="sk-..."
                            value={config.ai?.apiKey || ''}
                            onChange={(e) => handleSave('ai.apiKey', e.target.value)}
                            className="w-full bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-purple-500 outline-none pr-10"
                        />
                        <div className="absolute right-3 top-2.5 text-slate-500">
                            <Key size={14} />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 block">{t('settings.aiApiBaseUrl', 'API Base URL')}</label>
                    <input
                        type="text"
                        placeholder="https://api.deepseek.com"
                        value={config.ai?.baseUrl || ''}
                        onChange={(e) => handleSave('ai.baseUrl', e.target.value)}
                        className="w-full bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-purple-500 outline-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 block">{t('settings.aiCustomPath', 'Custom Engine Path (Optional)')}</label>
                    <input
                        type="text"
                        placeholder={t('settings.aiPathPlaceholder', 'Default: System Auto-detect (openclaw)')}
                        value={config.ai?.customPath || ''}
                        onChange={(e) => handleSave('ai.customPath', e.target.value)}
                        className="w-full bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-purple-500 outline-none placeholder:text-slate-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                        {t('settings.aiCustomPathDesc', 'Leave empty to auto-detect global openclaw. Set only for manual override.')}
                    </p>
                </div>
            </div>

            <div className="h-px bg-slate-700/50 w-full" />

            {/* 隐私与安全说明 */}
            <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-green-400" /> {t('settings.aiSecurity')}
                </label>
                <div className="ml-2 p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg space-y-4">
                    <div className="flex gap-3">
                        <div className="text-blue-400 mt-0.5">
                            <ShieldCheck size={16} />
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            {t('settings.aiPrivacyDesc')}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="text-amber-500 mt-0.5">
                            <ShieldCheck size={16} /> {/* Using AlertTriangle would be better if imported */}
                        </div>
                        <p className="text-xs text-amber-500/80 leading-relaxed">
                            {t('settings.aiSecurityWarning')}
                        </p>
                    </div>
                </div>
            </div>
            {/* 提示：API Key 仅本地存储，确保安全 */}
        </div>
    );
};
