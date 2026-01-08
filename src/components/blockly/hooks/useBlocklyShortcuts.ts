import { useEffect } from 'react';
import * as Blockly from 'blockly';

/**
 * Hook to manage Blockly keyboard shortcuts and search triggers.
 * It patches the global ShortcutRegistry to ignore events when non-Blockly inputs are focused.
 */
export const useBlocklyShortcuts = (
    setSearchMode: (mode: 'workspace' | 'toolbox') => void,
    setIsSearchVisible: (visible: boolean) => void
) => {
    useEffect(() => {
        // @ts-ignore
        const registry = Blockly.ShortcutRegistry.registry;
        const originalOnKeyDown = registry.onKeyDown;

        // 1. Patch ShortcutRegistry to avoid interference with external inputs (like Monaco or standard inputs)
        registry.onKeyDown = function (workspace: any, e: KeyboardEvent) {
            const el = document.activeElement;
            if (el) {
                const tagName = el.tagName;
                const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || (el as HTMLElement).isContentEditable;
                const isMonaco = el.closest('.monaco-editor');
                const isBlocklyInput = el.classList.contains('blocklyHtmlInput') || el.closest('.blocklyWidgetDiv') || el.closest('.blocklyTooltipDiv');

                if ((isInput || isMonaco) && !isBlocklyInput) {
                    return false; // Skip Blockly handling
                }
            }
            return originalOnKeyDown.call(this, workspace, e);
        };

        // 2. Global listener for Search shortcuts (Ctrl+F, Ctrl+Shift+F)
        const searchShortcuts = (event: KeyboardEvent) => {
            const el = document.activeElement;
            const isTyping = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);

            if (isTyping && !el.classList.contains('blocklyHtmlInput')) {
                return;
            }

            // Ctrl+F -> Workspace Search
            if ((event.ctrlKey || event.metaKey) && event.key === 'f' && !event.shiftKey) {
                event.preventDefault();
                setSearchMode('workspace');
                setIsSearchVisible(true);
            }
            // Ctrl+Shift+F -> Toolbox Search
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'F') {
                event.preventDefault();
                setSearchMode('toolbox');
                setIsSearchVisible(true);
            }
        };

        document.addEventListener('keydown', searchShortcuts, false);

        return () => {
            document.removeEventListener('keydown', searchShortcuts, false);
            registry.onKeyDown = originalOnKeyDown;
        };
    }, [setSearchMode, setIsSearchVisible]);
};
