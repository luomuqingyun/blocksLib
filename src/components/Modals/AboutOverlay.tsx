/**
 * ============================================================
 * 关于页面覆盖层 (About Overlay Component)
 * ============================================================
 * 
 * 全屏展示应用程序的关于信息，包括：
 * - 应用 Logo 和名称
 * - 版本号
 * - Markdown 格式的详细说明
 * - 版权信息和外部链接
 * 
 * 功能:
 * - 毛玻璃背景效果 (backdrop-filter: blur)
 * - 支持 ESC 键关闭
 * - 点击背景关闭
 * - 带有入场动画 (zoom-in + fade-in)
 * 
 * @file src/components/Modals/AboutOverlay.tsx
 * @module EmbedBlocks/Frontend/Components/Modals
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';

/** 关于页面覆盖层属性 */
interface AboutOverlayProps {
    /** 覆盖层是否显示 */
    isOpen: boolean;
    /** 关闭回调 */
    onClose: () => void;
    /** Markdown 格式的内容 */
    content: string;
}

export const AboutOverlay: React.FC<AboutOverlayProps> = ({ isOpen, onClose, content }) => {
    // ESC 键关闭监听
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-300"
            style={{ backgroundColor: 'rgba(15, 17, 26, 0.7)', backdropFilter: 'blur(12px)' }}
            onClick={onClose}
        >
            <div
                className="relative max-w-2xl w-full max-h-[85vh] bg-[#1a1c23]/80 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 关闭按钮 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
                >
                    <X size={20} />
                </button>

                {/* 头部区域: Logo 和标题 */}
                <div className="pt-12 pb-8 flex flex-col items-center border-b border-slate-700/30">
                    <img src="./EmbedBlocks.png" alt="EmbedBlocks Logo" className="w-20 h-20 object-contain drop-shadow-lg mb-4" />
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        EmbedBlocks Studio
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 font-mono uppercase tracking-[0.2em]">Version 1.0.0 Stable</p>
                </div>

                {/* 内容区域: 可滚动的 Markdown 文档 */}
                <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
                    <div className="prose prose-invert prose-blue max-w-none">
                        <MarkdownRenderer content={content} />
                    </div>
                </div>

                {/* 底部区域: 版权信息和链接 */}
                <div className="px-10 py-6 bg-black/20 flex justify-between items-center text-xs text-slate-500 border-t border-slate-700/30">
                    <div className="flex gap-4">
                        <span>© 2026 EmbedBlocks</span>
                        <a href="https://github.com/EmbedBlocks" target="_blank" rel="noreferrer" className="hover:text-blue-400 transition-colors">GitHub</a>
                        <a href="#" className="hover:text-blue-400 transition-colors">Terms</a>
                    </div>
                    <div className="flex items-center gap-1.5 grayscale opacity-50">
                        <span className="font-semibold text-slate-400">POWERED BY</span>
                        <span className="bg-slate-700 text-slate-300 px-1 rounded-sm text-[10px]">ELECTRON</span>
                        <span className="bg-slate-700 text-slate-300 px-1 rounded-sm text-[10px]">REACT</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
