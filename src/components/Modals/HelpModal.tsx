import React from 'react';
import { X, BookOpen, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { BaseModal } from '../BaseModal';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    helpPath?: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title, content, helpPath }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={onClose}>
            <div className="bg-[#1e1e1e] w-[900px] h-[750px] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700/50 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-[#252526]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <BookOpen size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                {title}
                            </h2>
                            <p className="text-xs text-slate-500">{t('help.description')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 relative bg-[#1e1e1e] overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <MarkdownRenderer content={content} />
                    </div>

                    {/* Bottom overlay for a "premium" finish */}
                    <div className="absolute bottom-6 right-8 z-10">
                        <div className="flex items-center gap-4 bg-[#252526]/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-700/50 shadow-2xl scale-95 hover:scale-100 transition-transform">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t('help.docVersion') || "Document Version 1.0"}</span>
                            <div className="w-[1px] h-3 bg-slate-700" />
                            <button
                                className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1.5 transition-colors font-medium"
                                onClick={() => {
                                    if (helpPath && window.electronAPI) {
                                        window.electronAPI.openExternal(helpPath);
                                    }
                                }}
                            >
                                <ExternalLink size={14} />
                                {t('help.openExternal')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-[#252526] border-t border-slate-700/50 flex justify-end items-center gap-4">
                    <span className="text-xs text-slate-500">{t('help.copyright')}</span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-sm transition-all font-medium border border-slate-600/50"
                    >
                        {t('common.close') || 'Close'}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
