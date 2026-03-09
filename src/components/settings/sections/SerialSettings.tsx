/**
 * ============================================================
 * 串口设置区域组件 (Serial Settings Section Component)
 * ============================================================
 * 
 * 设置模态框中的串口设置标签页内容。
 * 
 * 功能:
 * - 发送历史记录限制
 * - 历史去重开关
 * - 行尾符选择 (None/LF/CR/CRLF)
 * - 编码选择 (UTF-8/GBK/ASCII/Latin1)
 * - Enter 发送开关
 * - 发送后清空输入开关
 * - 拼写检查开关
 * 
 * @file src/components/settings/sections/SerialSettings.tsx
 * @module EmbedBlocks/Frontend/Components/Settings
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSerial } from '../../../contexts/SerialContext';

/** 串口设置组件属性 */
interface SerialSettingsProps {
    /** 当前配置对象 */
    config: any;
    /** 保存配置回调 */
    handleSave: (key: string, value: any) => void;
}

export const SerialSettings: React.FC<SerialSettingsProps> = ({ config, handleSave }) => {
    const { t } = useTranslation();
    const {
        enterSends, setEnterSends,
        clearInputOnSend, setClearInputOnSend,
        historyDeduplication, setHistoryDeduplication,
        lineEnding, setLineEnding,
        encoding, setEncoding,
        reloadHistory,
        inputSpellCheck, setInputSpellCheck
    } = useSerial();

    /** 清除串口历史记录 */
    const handleClearHistory = async () => {
        let doClear = false;
        if (window.electronAPI.showConfirmDialog) {
            doClear = await window.electronAPI.showConfirmDialog({
                title: t('settings.clearHistory'),
                message: t('settings.confirmClearHistory'),
                buttons: ['Cancel', 'Clear History']
            });
        } else {
            doClear = confirm(t('settings.confirmClearHistory'));
        }

        if (doClear) {
            await window.electronAPI.updateHistory([]);
            await reloadHistory();
            alert(t('settings.historyCleared'));
        }
    };

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
            {/* 串口发送历史记录上限 */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                    {t('settings.historyLimit')}
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={config.serialSettings?.historyLimit || 100}
                        onChange={(e) => handleClampedSave('serialSettings.historyLimit', Number(e.target.value), 10, 1000)}
                        className="flex-1 bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-blue-500 outline-none"
                        min="10"
                        max="1000"
                    />
                    <button
                        onClick={handleClearHistory}
                        className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 px-4 py-2 rounded text-sm font-medium transition-all"
                    >
                        <Trash2 size={16} /> {t('settings.clearHistory')}
                    </button>
                </div>
                <p className="text-xs text-slate-500">{t('settings.historyLimitDesc')}</p>
            </div>

            {/* 历史记录去重 */}
            <div className="flex items-center justify-between">
                <div>
                    <label className="text-sm font-medium text-slate-300 block">{t('serial.historyDeduplication')}</label>
                    <span className="text-xs text-slate-500">{t('serial.historyDeduplicationDesc')}</span>
                </div>
                <input
                    type="checkbox"
                    checked={historyDeduplication}
                    onChange={e => setHistoryDeduplication(e.target.checked)}
                    className="w-5 h-5 bg-[#333] border-slate-600 rounded text-blue-600 focus:ring-blue-500"
                />
            </div>

            {/* 行为设置 */}
            <div className="space-y-4 pt-4 border-t border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('serial.inputBehavior')}</h3>

                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-sm font-medium text-slate-300 block">{t('serial.lineEnding')}</label>
                        <span className="text-xs text-slate-500">{t('serial.lineEndingDesc')}</span>
                    </div>
                    <select
                        className="bg-[#333] border border-slate-600 rounded px-2 py-1 text-slate-200 text-sm focus:border-blue-500 outline-none"
                        value={lineEnding}
                        onChange={(e) => setLineEnding(e.target.value as any)}
                    >
                        <option value="none">{t('serial.lineEndingNone')}</option>
                        <option value="lf">{t('serial.lineEndingLF')}</option>
                        <option value="cr">{t('serial.lineEndingCR')}</option>
                        <option value="crlf">{t('serial.lineEndingCRLF')}</option>
                    </select>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-sm font-medium text-slate-300 block">{t('serial.encoding')}</label>
                        <span className="text-xs text-slate-500">{t('serial.encodingDesc')}</span>
                    </div>
                    <select
                        className="bg-[#333] border border-slate-600 rounded px-2 py-1 text-slate-200 text-sm focus:border-blue-500 outline-none"
                        value={encoding}
                        onChange={(e) => setEncoding(e.target.value as any)}
                    >
                        <option value="utf-8">UTF-8</option>
                        <option value="gbk">{t('serial.encodingGBK')}</option>
                        <option value="ascii">ASCII</option>
                        <option value="latin1">Latin1 / ISO-8859-1</option>
                    </select>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-sm font-medium text-slate-300 block">{t('serial.enterSends')}</label>
                        <span className="text-xs text-slate-500">{t('serial.enterSendsDesc')}</span>
                    </div>
                    <input
                        type="checkbox"
                        checked={enterSends}
                        onChange={e => setEnterSends(e.target.checked)}
                        className="w-5 h-5 bg-[#333] border-slate-600 rounded text-blue-600 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-sm font-medium text-slate-300 block">{t('serial.clearInput')}</label>
                        <span className="text-xs text-slate-500">{t('serial.clearInputDesc')}</span>
                    </div>
                    <input
                        type="checkbox"
                        checked={clearInputOnSend}
                        onChange={e => setClearInputOnSend(e.target.checked)}
                        className="w-5 h-5 bg-[#333] border-slate-600 rounded text-blue-600 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-sm font-medium text-slate-300 block">{t('serial.inputSpellCheck')}</label>
                        <span className="text-xs text-slate-500">{t('serial.inputSpellCheckDesc')}</span>
                    </div>
                    <input
                        type="checkbox"
                        checked={inputSpellCheck}
                        onChange={e => setInputSpellCheck(e.target.checked)}
                        className="w-5 h-5 bg-[#333] border-slate-600 rounded text-blue-600 focus:ring-blue-500"
                    />
                </div>
            </div>
        </div>
    );
};
