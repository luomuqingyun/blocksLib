import React, { useEffect, useRef } from 'react';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
    overlayClassName?: string;
}

/**
 * BaseModal handles the common logic for all popups:
 * - Overlay background with blur
 * - Click outside to close
 * - ESC key to close
 * - Animation container
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
