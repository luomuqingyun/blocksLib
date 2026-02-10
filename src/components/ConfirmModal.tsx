/**
 * ============================================================
 * 通用确认模态框 (Confirm Modal Component)
 * ============================================================
 */

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { BaseModal } from './BaseModal';
import * as Blockly from 'blockly';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'warning';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen, title, message, onConfirm, onClose, confirmText, cancelText, type = 'warning'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
            case 'warning':
                return <AlertTriangle className="text-amber-500" size={24} />;
            default:
                return null;
        }
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-[400px] p-6 transform transition-all scale-100">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="text-slate-600 mb-8 mt-2 line-height-relaxed">
                    {message}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors font-medium"
                    >
                        {cancelText || (Blockly as any).Msg?.ARD_BTN_CANCEL || "Cancel"}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2 ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md shadow-sm transition-colors font-medium`}
                    >
                        {confirmText || (Blockly as any).Msg?.ARD_BTN_CONFIRM || "Confirm"}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
