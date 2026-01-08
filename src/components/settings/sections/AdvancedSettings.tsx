import React from 'react';
import { RotateCcw, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AdvancedSettingsProps {
    config: any;
    handleSave: (key: string, value: any) => void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ config, handleSave }) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <h3 className="text-sm font-bold text-yellow-500 mb-2 flex items-center gap-2">
                    <RotateCcw size={16} />
                    {t('settings.restoreFactoryDefaults')}
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                    {t('settings.confirmRestoreFactory')}
                </p>

                {/* Clear History Checkbox in Advanced Restore */}
                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="checkbox"
                        id="chkClearHistory"
                        className="w-4 h-4 rounded bg-[#333] border-slate-600"
                        checked={config.advanced?.clearHistoryOnRestore || false}
                        onChange={(e) => handleSave('advanced.clearHistoryOnRestore', e.target.checked)}
                    />
                    <label htmlFor="chkClearHistory" className="text-xs text-slate-300 select-none cursor-pointer">
                        {t('settings.optionClearHistory')}
                    </label>
                </div>

                <button
                    onClick={async () => {
                        if (confirm(t('settings.confirmRestoreFactory'))) {
                            const status = await window.electronAPI.getSerialStatus();
                            if (status.connected) {
                                await window.electronAPI.closeSerial();
                            }
                            await window.electronAPI.restoreDefaults(undefined, config.advanced?.clearHistoryOnRestore || false);
                            window.location.reload();
                        }
                    }}
                    className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs transition-colors border border-red-900/50"
                >
                    {t('settings.restoreFactoryDefaults')}
                </button>
            </div>

            <div className="p-4 bg-[#252526] border border-slate-700 rounded-lg">
                <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                    <FolderOpen size={16} />
                    {t('settings.openConfigFolder')}
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                    {t('settings.openConfigFolderDesc')}
                </p>
                <button
                    onClick={() => window.electronAPI.openConfigDir()}
                    className="px-3 py-2 bg-[#333] hover:bg-[#444] rounded text-xs text-slate-300 transition-colors border border-slate-600"
                >
                    {t('settings.openConfigFolder')}
                </button>
            </div>
        </div>
    );
};
