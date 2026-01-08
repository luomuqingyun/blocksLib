import React from 'react';
import { Globe, Folder, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GeneralSettingsProps {
    config: any;
    handleSave: (key: string, value: any) => void;
    handleSelectWorkDir: () => void;
    setConfig: React.Dispatch<React.SetStateAction<any>>;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
    config,
    handleSave,
    handleSelectWorkDir,
    setConfig
}) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-8">
            {/* Language */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Globe size={16} /> {t('settings.language')}
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

            {/* Work Directory */}
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

            {/* Project History Limit */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                    {t('settings.projectHistoryLimit')}
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={config.general?.projectHistoryLimit || 10}
                        onChange={(e) => handleSave('general.projectHistoryLimit', Number(e.target.value))}
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

            {/* Auto-clean No Match Recent Projects Toggle */}
            <div className="flex items-center justify-between">
                <div>
                    <label className="text-sm font-medium text-slate-300 block">{t('settings.autoCleanNoMatchRecent', 'Auto-clean No Match History Projects')}</label>
                    <span className="text-xs text-slate-500">{t('settings.autoCleanNoMatchRecentDesc', 'Remove invalid projects from history on startup')}</span>
                </div>
                <input
                    type="checkbox"
                    checked={config.general?.autoCleanNoMatchRecent ?? false}
                    onChange={e => handleSave('general.autoCleanNoMatchRecent', e.target.checked)}
                    className="w-5 h-5 bg-[#333] border-slate-600 rounded text-blue-600 focus:ring-blue-500"
                />
            </div>
        </div>
    );
};
