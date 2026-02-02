/**
 * ============================================================
 * 保存提示模态框 (Save Prompt Modal Component)
 * ============================================================
 * 
 * 当用户尝试关闭或切换项目时，如果有未保存的更改，
 * 显示此对话框提示用户选择：保存、不保存、或取消操作。
 * 
 * 功能:
 * - 三按钮选择：保存 / 不保存 / 取消
 * - 醒目的警告图标和提示文本
 * - 支持暗色/亮色主题
 * 
 * @file src/components/SavePromptModal.tsx
 * @module EmbedBlocks/Frontend/Components/SavePromptModal
 */

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from './BaseModal';

/** 保存提示模态框属性 */
interface SavePromptModalProps {
    /** 模态框是否打开 */
    isOpen: boolean;
    /** 保存按钮回调 */
    onSave: () => void;
    /** 不保存按钮回调 */
    onDontSave: () => void;
    /** 取消按钮回调 */
    onCancel: () => void;
}

export const SavePromptModal: React.FC<SavePromptModalProps> = ({ isOpen, onSave, onDontSave, onCancel }) => {
    // 使用 i18next 进行多语言支持
    const { t } = useTranslation();

    // 如果模态框未处于打开状态，则不渲染任何内容
    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={onCancel}>
            {/* 提示框主体容器 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-[480px] p-6 transform transition-all scale-100 border border-slate-200 dark:border-slate-700">
                {/* 顶部标题与图标区域 */}
                <div className="flex items-start gap-4 mb-6">
                    {/* 橙色警告图标 */}
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full flex-shrink-0">
                        <AlertTriangle className="text-amber-600 dark:text-amber-500" size={24} />
                    </div>
                    {/* 文本描述区 */}
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                            {t('dialog.unsavedChangesTitle', '未保存的修改')}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300">
                            {t('dialog.unsavedChangesDesc', '该项目中有未保存的修改。您想在关闭前保存它们吗？')}
                        </p>
                    </div>
                    {/* 右上角关闭按钮 */}
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* 底部操作按钮区域 */}
                <div className="flex justify-end gap-3 pt-2">
                    {/* 取消关闭 */}
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors font-medium border border-slate-300 dark:border-slate-600"
                    >
                        {t('dialog.cancel', '取消')}
                    </button>
                    {/* 放弃保存并直接关闭 */}
                    <button
                        onClick={onDontSave}
                        className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors font-medium border border-transparent"
                    >
                        {t('dialog.dontSave', "不保存")}
                    </button>
                    {/* 保存并关闭 (主要操作，自动聚焦) */}
                    <button
                        onClick={onSave}
                        autoFocus
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors font-medium outline-none ring-offset-1 focus:ring-2 focus:ring-blue-500"
                    >
                        {t('dialog.save', '保存')}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
