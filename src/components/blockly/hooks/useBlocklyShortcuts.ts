/**
 * ============================================================
 * Blockly 快捷键管理 Hook (Blockly Shortcuts Management Hook)
 * ============================================================
 * 
 * 核心职责:
 * 1. 修补 Blockly 的 ShortcutRegistry，防止键盘事件被错误拦截
 * 2. 管理搜索快捷键 (Ctrl+F / Ctrl+Shift+F)
 * 
 * 输入保护策略:
 * - 多层次检测当前焦点元素是否为可编辑区域
 * - 涵盖所有已知的输入场景 (INPUT, TEXTAREA, SELECT, contenteditable, Monaco, etc.)
 * - 特别处理对话框和模态框内的输入
 * 
 * @file src/components/blockly/hooks/useBlocklyShortcuts.ts
 * @module EmbedBlocks/Frontend/Hooks
 */

import { useEffect } from 'react';
import * as Blockly from 'blockly';

/**
 * 全面检测当前焦点元素是否为可编辑区域
 * 这是防止输入问题的核心函数
 * 
 * @param el 当前焦点元素
 * @returns 是否为非 Blockly 的可编辑区域
 */
const isActiveElementEditable = (el: Element | null): boolean => {
    if (!el) return false;

    const htmlEl = el as HTMLElement;
    const tagName = el.tagName.toUpperCase();

    // 1. 标准表单输入元素
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return true;
    }

    // 2. contenteditable 元素
    if (htmlEl.isContentEditable) {
        return true;
    }

    // 3. ARIA role 为文本输入的元素
    const role = el.getAttribute('role');
    if (role === 'textbox' || role === 'searchbox' || role === 'combobox') {
        return true;
    }

    // 4. Monaco Editor 内部元素
    if (el.closest('.monaco-editor')) {
        return true;
    }

    // 5. 对话框/模态框内的元素 (通常需要键盘输入)
    if (el.closest('[role="dialog"]') || el.closest('[role="alertdialog"]')) {
        // 在对话框内，检查是否是可交互元素
        if (tagName === 'BUTTON' || el.closest('button')) {
            return false; // 按钮不需要阻止快捷键
        }
        return true; // 其他对话框内元素默认保护
    }

    // 6. 自定义输入组件标记 (data-input-protect)
    if (htmlEl.dataset?.inputProtect === 'true' || el.closest('[data-input-protect="true"]')) {
        return true;
    }

    // 7. 搜索组件内的输入
    if (el.closest('.unified-search-container') || el.closest('.search-input')) {
        return true;
    }

    return false;
};

/**
 * 检测是否为 Blockly 内部输入元素
 * 
 * @param el 当前焦点元素
 * @returns 是否为 Blockly 内部输入
 */
const isBlocklyInput = (el: Element | null): boolean => {
    if (!el) return false;

    // Blockly 的 HTML 输入框 (字段编辑器)
    if (el.classList.contains('blocklyHtmlInput')) {
        return true;
    }

    // Blockly 的 Widget 容器 (下拉菜单、颜色选择器等)
    if (el.closest('.blocklyWidgetDiv')) {
        return true;
    }

    // Blockly 的工具提示
    if (el.closest('.blocklyTooltipDiv')) {
        return true;
    }

    // Blockly 的上下文菜单
    if (el.closest('.blocklyContextMenu')) {
        return true;
    }

    return false;
};

/**
 * Blockly 快捷键管理 Hook
 * 
 * @param setSearchMode 设置搜索模式的函数
 * @param setIsSearchVisible 设置搜索可见性的函数
 */
export const useBlocklyShortcuts = (
    setSearchMode: (mode: 'workspace' | 'toolbox') => void,
    setIsSearchVisible: (visible: boolean) => void
) => {
    useEffect(() => {
        // @ts-ignore - Blockly 类型定义不完整
        const registry = Blockly.ShortcutRegistry.registry;
        const originalOnKeyDown = registry.onKeyDown;

        /**
         * 1. 修补 ShortcutRegistry.onKeyDown
         * 
         * 核心逻辑: 当焦点在非 Blockly 的可编辑区域时，跳过 Blockly 的快捷键处理
         */
        registry.onKeyDown = function (workspace: any, e: KeyboardEvent) {
            const el = document.activeElement;

            // 如果当前焦点在可编辑区域，且不是 Blockly 内部输入
            if (isActiveElementEditable(el) && !isBlocklyInput(el)) {
                // 跳过 Blockly 的快捷键处理，让事件正常传递
                return false;
            }

            // 否则，调用原始的 Blockly 快捷键处理
            return originalOnKeyDown.call(this, workspace, e);
        };

        /**
         * 2. 全局搜索快捷键监听器 (Ctrl+F, Ctrl+Shift+F)
         */
        const searchShortcuts = (event: KeyboardEvent) => {
            const el = document.activeElement;

            // 如果当前焦点在可编辑区域（非 Blockly），不触发搜索
            if (isActiveElementEditable(el) && !isBlocklyInput(el)) {
                return;
            }

            // Ctrl+F -> 工作区搜索
            if ((event.ctrlKey || event.metaKey) && event.key === 'f' && !event.shiftKey) {
                event.preventDefault();
                event.stopPropagation();
                setSearchMode('workspace');
                setIsSearchVisible(true);
            }

            // Ctrl+Shift+F -> 工具箱搜索
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'F') {
                event.preventDefault();
                event.stopPropagation();
                setSearchMode('toolbox');
                setIsSearchVisible(true);
            }
        };

        // 使用 capture 阶段确保优先处理
        document.addEventListener('keydown', searchShortcuts, true);

        // 清理函数
        return () => {
            document.removeEventListener('keydown', searchShortcuts, true);
            // 恢复原始的 onKeyDown
            registry.onKeyDown = originalOnKeyDown;
        };
    }, [setSearchMode, setIsSearchVisible]);
};
