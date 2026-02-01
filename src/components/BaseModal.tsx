/**
 * ============================================================
 * 基础模态框组件 (Base Modal Component)
 * ============================================================
 * 
 * 所有弹窗的基座组件，提供:
 * - 半透明模糊背景遮罩
 * - 点击遮罩关闭
 * - ESC 键关闭
 * - 开启/关闭动画效果
 * - 阻止背景滚动
 * 
 * 所有业务模态框 (SettingsModal, ExtensionsModal, NewProjectModal 等)
 * 均应基于此组件构建。
 * 
 * @file src/components/BaseModal.tsx
 * @module EmbedBlocks/Frontend/Components/BaseModal
 */

import React, { useEffect, useRef } from 'react';

/** 基础模态框属性 */
interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
    overlayClassName?: string;
}

/**
 * BaseModal: 处理所有弹窗的通用逻辑
 * - 模糊背景遮罩
 * - 点击外部关闭
 * - ESC 键关闭
 * - 动画容器
 */
export const BaseModal: React.FC<BaseModalProps> = ({

    isOpen,
    onClose,
    children,
    className = "",
    overlayClassName = ""
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // ESC key listener
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className={`fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-md transition-all duration-300 ${overlayClassName}`}
            onClick={handleOverlayClick}
        >
            <div
                ref={modalRef}
                className={`animate-in fade-in zoom-in duration-200 outline-none ${className}`}
                tabIndex={-1}
            >
                {children}
            </div>
        </div>
    );
};
