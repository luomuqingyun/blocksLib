/**
 * ============================================================
 * 通用设置区域组件 (General Settings Section Component)
 * ============================================================
 * 
 * 设置模态框中的通用设置标签页内容。
 * 
 * 功能:
 * - 语言选择 (系统/英语/中文)
 * - 工作目录选择
 * - 项目历史记录限制
 * - 自动清理无效历史记录
 * 
 * @file src/components/settings/sections/GeneralSettings.tsx
 * @module EmbedBlocks/Frontend/Components/Settings
 */

import React from 'react';
import { Globe, Folder, Trash2, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** 通用设置组件属性 */
interface GeneralSettingsProps {
    /** 当前配置对象 */
    config: any;
    /** 保存配置回调 */
    handleSave: (key: string, value: any) => void;
    /** 选择工作目录回调 */
    handleSelectWorkDir: () => void;
    /** 设置配置的回调 */
    setConfig: React.Dispatch<React.SetStateAction<any>>;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
    config,
    handleSave,
    handleSelectWorkDir,
    setConfig
}) => {
    const { t } = useTranslation();

    /** 
     * 处理数值变更并进行范围钳制 
     * @param key 配置键
     * @param value 输入值
     * @param min 最小值
     * @param max 最大值
     */
    const handleClampedSave = (key: string, value: number, min: number, max: number) => {
        const clamped = Math.max(min, Math.min(max, value));
        handleSave(key, clamped);
    };

    return (
        <div className="space-y-8">
            {/* 外观设置 (Appearance) */}
            <div className="space-y-6 bg-slate-800/20 p-4 rounded-lg border border-slate-700/50">
                <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2 mb-4">
                    <Monitor size={16} /> {t('settings.appearance')}
                </h3>

                {/* 主题切换 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400">{t('settings.theme')}</label>
                        <select
                            value={config.appearance?.theme || 'dark'}
                            onChange={(e) => handleSave('appearance.theme', e.target.value)}
                            className="w-full bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-blue-500 outline-none"
                        >
                            <option value="dark">{t('settings.themeDeep')}</option>
                            <option value="light">{t('settings.themeLight')}</option>
                        </select>
                    </div>

                    {/* 栅格开关 */}
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400">{t('settings.showGrid')}</label>
                        <div className="flex items-center h-[38px]">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.appearance?.showGrid ?? true}
                                    onChange={(e) => handleSave('appearance.showGrid', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">{t('settings.themeDesc')}</p>
            </div>

            {/* 语言设置 */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Globe size={16} /> {t('settings.language')}
                    <span className="text-[10px] text-blue-500 font-normal opacity-80">{t('settings.effectiveAfterRestart')}</span>
                </label>
                <select
                    value={config.general?.language || 'system'}
                    onChange={(e) => handleSave('general.language', e.target.value)}
                    className="w-full bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-blue-500 outline-none"
                >
                    <option value="system">{t('settings.langSystem')}</option>
                    <option value="en">English</option>
                    <option value="zh">中文 (Chinese)</option>
                </select>
                <p className="text-xs text-slate-500">{t('settings.langDesc')}</p>
            </div>

            {/* 工作目录设置 */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Folder size={16} /> {t('settings.workDir')}
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={config.general?.workDir || ''}
                        readOnly
                        className="flex-1 bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm font-mono text-opacity-70 cursor-not-allowed"
                    />
                    <button
                        onClick={handleSelectWorkDir}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                        {t('settings.browse')}
                    </button>
                </div>
                <p className="text-xs text-slate-500">{t('settings.workDirDesc')}</p>
            </div>

            {/* 历史记录保留数量 */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                    {t('settings.projectHistoryLimit')}
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={config.general?.projectHistoryLimit || 10}
                        onChange={(e) => handleClampedSave('general.projectHistoryLimit', Number(e.target.value), 1, 50)}
                        className="flex-1 bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-blue-500 outline-none"
                        min="1"
                        max="50"
                    />
                    <button
                        onClick={async () => {
                            if (confirm(t('settings.confirmClearProjectHistory', 'Are you sure you want to clear project history?'))) {
                                await window.electronAPI.setConfig('general.recentProjects', []);
                                setConfig((prev: any) => ({ ...prev, general: { ...prev.general, recentProjects: [] } }));
                            }
                        }}
                        className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 px-4 py-2 rounded text-sm font-medium transition-all"
                    >
                        <Trash2 size={16} /> {t('settings.clearProjectHistory', 'Clear History')}
                    </button>
                </div>
                <p className="text-xs text-slate-500">{t('settings.projectHistoryLimitDesc')}</p>
            </div>

            {/* 自动清理无效历史项目开关 (移至此处与历史记录限制归口) */}
            <div className="flex items-center justify-between">
                <div>
                    <label className="text-sm font-medium text-slate-300 block">
                        {t('settings.autoCleanNoMatchRecent', 'Auto-clean No Match History Projects')}
                        <span className="ml-2 text-[10px] text-blue-500 font-normal opacity-80">{t('settings.effectiveAfterRestart')}</span>
                    </label>
                    <span className="text-xs text-slate-500">{t('settings.autoCleanNoMatchRecentDesc', 'Remove invalid projects from history on startup')}</span>
                </div>
                <input
                    type="checkbox"
                    checked={config.general?.autoCleanNoMatchRecent ?? false}
                    onChange={e => handleSave('general.autoCleanNoMatchRecent', e.target.checked)}
                    className="w-5 h-5 bg-[#333] border-slate-600 rounded text-blue-600 focus:ring-blue-500"
                />
            </div>

            {/* 常用板卡收藏上限 */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                    {t('settings.favoriteLimit', 'Favorite Board Limit')}
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={config.general?.favoriteLimit || 10}
                        onChange={(e) => handleClampedSave('general.favoriteLimit', Number(e.target.value), 1, 50)}
                        className="flex-1 bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-blue-500 outline-none"
                        min="1"
                        max="50"
                    />
                    <button
                        onClick={async () => {
                            if (confirm(t('settings.confirmClearFavorites', 'Are you sure you want to clear all favorite boards?'))) {
                                await window.electronAPI.setConfig('general.favoriteBoardsCache', []);
                                setConfig((prev: any) => ({ ...prev, general: { ...prev.general, favoriteBoardsCache: [] } }));
                                alert(t('settings.favoritesCleared', 'All favorites cleared.'));
                            }
                        }}
                        className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 px-4 py-2 rounded text-sm font-medium transition-all"
                    >
                        <Trash2 size={16} /> {t('settings.clearFavorites', 'Clear')}
                    </button>
                </div>
                <p className="text-xs text-slate-500">{t('settings.favoriteLimitDesc', 'Maximum number of boards you can star')}</p>
            </div>
        </div>
    );
};
