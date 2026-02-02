/**
 * ============================================================
 * 帮助文档模态框 (Help Modal Component)
 * ============================================================
 * 
 * 显示 Markdown 格式的帮助文档内容。
 * 
 * 功能:
 * - 可滚动的文档内容区域
 * - 支持在外部浏览器打开完整文档
 * - 显示文档版本信息
 * - 使用 MarkdownRenderer 渲染内容
 * 
 * @file src/components/Modals/HelpModal.tsx
 * @module EmbedBlocks/Frontend/Components/Modals
 */

import React from 'react';
import { X, BookOpen, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { BaseModal } from '../BaseModal';

/** 帮助模态框属性 */
interface HelpModalProps {
    /** 模态框是否打开 */
    isOpen: boolean;
    /** 关闭回调 */
    onClose: () => void;
    /** 帮助文档标题 */
    title: string;
    /** Markdown 格式的帮助内容 */
    content: string;
    /** 外部帮助文档路径 (可选) */
    helpPath?: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title, content, helpPath }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={onClose}>
            <div className="bg-[#1e1e1e] w-[900px] h-[750px] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700/50 flex flex-col overflow-hidden">
                {/* 标题栏 */}
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

                {/* 内容区域 - Markdown 文档 */}
                <div className="flex-1 relative bg-[#1e1e1e] overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <MarkdownRenderer content={content} />
                    </div>

                    {/* 底部悬浮按钮 - 打开外部文档 */}
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

                {/* 底部区域 - 版权信息 */}
                <div className="p-4 bg-[#252526] border-t border-slate-700/50 flex justify-end items-center gap-4">
                    <span className="text-xs text-slate-500">{t('help.copyright')}</span>

                </div>
            </div>
        </BaseModal>
    );
};
