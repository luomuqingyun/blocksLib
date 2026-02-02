/**
 * ============================================================
 * 通用提示输入模态框 (Prompt Modal Component)
 * ============================================================
 * 
 * 用于替代 Blockly 原生的 prompt 对话框，提供更好的用户体验。
 * 
 * 功能:
 * - 显示标题和输入框
 * - 支持默认值预填充
 * - 支持按 Enter 键确认
 * - 取消和确认按钮使用 Blockly 国际化文本
 * 
 * 使用场景:
 * - 重命名变量/函数时的输入
 * - Blockly 需要用户输入文本的场景
 * 
 * @file src/components/PromptModal.tsx
 * @module EmbedBlocks/Frontend/Components/PromptModal
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BaseModal } from './BaseModal';
import * as Blockly from 'blockly';

/** 提示模态框属性 */
interface PromptModalProps {
  /** 模态框是否打开 */
  isOpen: boolean;
  /** 模态框标题 */
  title: string;
  /** 输入框默认值 */
  defaultValue: string;
  /** 确认回调，传入用户输入的值 */
  onConfirm: (value: string) => void;
  /** 关闭回调 */
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, title, defaultValue, onConfirm, onClose }) => {
  // 输入框的当前值
  const [value, setValue] = useState(defaultValue);

  // 当 defaultValue 或 isOpen 变化时，重置输入框值
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue, isOpen]);

  // 未打开时不渲染
  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-96 p-6 transform transition-all scale-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 输入框 - 支持 Enter 键确认 */}
        <input
          type="text"
          className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6 text-slate-700"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Enter 键触发确认
            if (e.key === 'Enter') onConfirm(value);
          }}
          autoFocus
        />

        {/* 按钮区域 - 使用 Blockly 国际化文本 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors font-medium"
          >
            {(Blockly as any).Msg?.ARD_BTN_CANCEL || "Cancel"}
          </button>
          <button
            onClick={() => onConfirm(value)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors font-medium"
          >
            {(Blockly as any).Msg?.ARD_BTN_CONFIRM || "Confirm"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};