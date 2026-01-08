import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SavePromptModalProps {
    isOpen: boolean;
    onSave: () => void;
    onDontSave: () => void;
    onCancel: () => void;
}

export const SavePromptModal: React.FC<SavePromptModalProps> = ({ isOpen, onSave, onDontSave, onCancel }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-[480px] p-6 transform transition-all scale-100 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full flex-shrink-0">
                        <AlertTriangle className="text-amber-600 dark:text-amber-500" size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                            {t('dialog.unsavedChangesTitle', 'Unsaved Changes')}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300">
                            {t('dialog.unsavedChangesDesc', 'You have unsaved changes in your project. Do you want to save them before closing?')}
                        </p>
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors font-medium border border-slate-300 dark:border-slate-600"
                    >
                        {t('dialog.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={onDontSave}
                        className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors font-medium border border-transparent"
                    >
                        {t('dialog.dontSave', "Don't Save")}
                    </button>
                    <button
                        onClick={onSave}
                        autoFocus
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors font-medium outline-none ring-offset-1 focus:ring-2 focus:ring-blue-500"
                    >
                        {t('dialog.save', 'Save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
