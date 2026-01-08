import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BaseModal } from './BaseModal';
import * as Blockly from 'blockly';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  defaultValue: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, title, defaultValue, onConfirm, onClose }) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue, isOpen]);

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

        <input
          type="text"
          className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6 text-slate-700"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm(value);
          }}
          autoFocus
        />

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