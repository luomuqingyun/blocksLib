/**
 * ============================================================
 * 高级设置区域组件 (Advanced Settings Section Component)
 * ============================================================
 * 
 * 设置模态框中的高级设置标签页内容。
 * 
 * 功能:
 * - 恢复出厂默认设置
 * - 可选清除历史记录
 * - 打开配置文件夹
 * 
 * @file src/components/settings/sections/AdvancedSettings.tsx
 * @module EmbedBlocks/Frontend/Components/Settings
 */

import React from 'react';
import { RotateCcw, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** 高级设置组件属性 */
interface AdvancedSettingsProps {
    /** 当前配置对象 */
    config: any;
    /** 保存配置回调 */
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

                {/* 恢复时清除历史记录选项 */}
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

                {/* 恢复默认设置按钮 */}
                <button
                    onClick={async () => {
                        // 确认对话框
                        if (confirm(t('settings.confirmRestoreFactory'))) {
                            // 如果串口连接中，先关闭
                            const status = await window.electronAPI.getSerialStatus();
                            if (status.connected) {
                                await window.electronAPI.closeSerial();
                            }
                            // 执行恢复默认设置
                            await window.electronAPI.restoreDefaults(undefined, config.advanced?.clearHistoryOnRestore || false);
                            // 重新加载页面以应用新设置
                            window.location.reload();
                        }
                    }}
                    className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs transition-colors border border-red-900/50"
                >
                    {t('settings.restoreFactoryDefaults')}
                </button>
            </div>

            {/* 打开配置文件夹卡片 */}
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
