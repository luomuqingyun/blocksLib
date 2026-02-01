/**
 * ============================================================
 * 输入焦点保护工具 (Input Focus Protection Utilities)
 * ============================================================
 * 
 * 提供全局可用的输入焦点检测和保护功能。
 * 用于确保键盘事件不会错误地干扰用户输入。
 * 
 * 使用方法:
 * 1. 导入 isActiveElementEditable 检测当前焦点是否在可编辑元素
 * 2. 在需要保护的组件上添加 data-input-protect="true" 属性
 * 
 * @file src/utils/input_protection.ts
 * @module EmbedBlocks/Frontend/Utils
 */

import React from 'react';

/**
 * 检测当前焦点元素是否为可编辑区域
 * 
 * 这是防止键盘事件干扰用户输入的核心函数。
 * 涵盖所有已知的输入场景:
 * - 标准表单元素 (INPUT, TEXTAREA, SELECT)
 * - contenteditable 元素
 * - ARIA role 为文本输入的元素
 * - Monaco Editor
 * - 对话框/模态框内的元素
 * - 自定义标记的输入组件
 * 
 * @param el 要检测的元素，默认为 document.activeElement
 * @returns 是否为可编辑区域
 */
export const isActiveElementEditable = (el?: Element | null): boolean => {
    const element = el ?? document.activeElement;
    if (!element) return false;

    const htmlEl = element as HTMLElement;
    const tagName = element.tagName.toUpperCase();

    // 1. 标准表单输入元素
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return true;
    }

    // 2. contenteditable 元素
    if (htmlEl.isContentEditable) {
        return true;
    }

    // 3. ARIA role 为文本输入的元素
    const role = element.getAttribute('role');
    if (role === 'textbox' || role === 'searchbox' || role === 'combobox' || role === 'spinbutton') {
        return true;
    }

    // 4. Monaco Editor 内部元素
    if (element.closest('.monaco-editor')) {
        return true;
    }

    // 5. 对话框/模态框内的输入元素
    const inDialog = element.closest('[role="dialog"]') || element.closest('[role="alertdialog"]');
    if (inDialog) {
        // 检查是否是交互元素（不只是按钮）
        const isButton = tagName === 'BUTTON' || element.closest('button');
        const isLink = tagName === 'A' || element.closest('a');
        if (!isButton && !isLink) {
            return true;
        }
    }

    // 6. 自定义输入组件标记
    if (htmlEl.dataset?.inputProtect === 'true' || element.closest('[data-input-protect="true"]')) {
        return true;
    }

    // 7. 常见的搜索和输入容器
    if (element.closest('.unified-search-container') ||
        element.closest('.search-input') ||
        element.closest('.settings-modal') ||
        element.closest('.project-settings-modal') ||
        element.closest('.serial-monitor-input')) {
        return true;
    }

    return false;
};

/**
 * 检测是否为 Blockly 内部输入元素
 * 
 * @param el 要检测的元素，默认为 document.activeElement
 * @returns 是否为 Blockly 内部输入
 */
export const isBlocklyInputElement = (el?: Element | null): boolean => {
    const element = el ?? document.activeElement;
    if (!element) return false;

    // Blockly 的 HTML 输入框
    if (element.classList.contains('blocklyHtmlInput')) {
        return true;
    }

    // Blockly 的 Widget 容器
    if (element.closest('.blocklyWidgetDiv')) {
        return true;
    }

    // Blockly 的工具提示
    if (element.closest('.blocklyTooltipDiv')) {
        return true;
    }

    // Blockly 的上下文菜单
    if (element.closest('.blocklyContextMenu')) {
        return true;
    }

    // Blockly 的下拉菜单
    if (element.closest('.blocklyDropdownDiv')) {
        return true;
    }

    return false;
};

/**
 * 检测当前是否应该阻止全局快捷键
 * 
 * 结合 isActiveElementEditable 和 isBlocklyInputElement 的逻辑:
 * - 如果焦点在非 Blockly 的可编辑区域，应该阻止全局快捷键
 * - 如果焦点在 Blockly 内部输入框，让 Blockly 自己处理
 * 
 * @returns 是否应该阻止全局快捷键
 */
export const shouldBlockGlobalShortcuts = (): boolean => {
    const el = document.activeElement;
    return isActiveElementEditable(el) && !isBlocklyInputElement(el);
};

/**
 * 创建一个保护键盘事件的 HOC 函数
 * 用于包装 onKeyDown 处理器，自动阻止事件冒泡当焦点在输入元素时
 * 
 * @param handler 原始的键盘事件处理器
 * @returns 包装后的处理器
 */
export const protectKeyboardHandler = (
    handler: (e: React.KeyboardEvent) => void
): ((e: React.KeyboardEvent) => void) => {
    return (e: React.KeyboardEvent) => {
        // 阻止事件冒泡到全局，防止 Blockly 拦截
        e.stopPropagation();
        handler(e);
    };
};

/**
 * 用于调试的焦点日志函数
 * 在控制台输出当前焦点元素的详细信息
 */
export const logFocusState = (): void => {
    const el = document.activeElement as HTMLElement;
    if (!el) {
        console.log('[FocusDebug] No active element');
        return;
    }

    let desc = el.tagName;
    if (el.id) desc += `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
        desc += `.${el.className.split(' ')[0]}`;
    }

    console.log('[FocusDebug]', {
        element: desc,
        isEditable: isActiveElementEditable(el),
        isBlockly: isBlocklyInputElement(el),
        shouldBlock: shouldBlockGlobalShortcuts()
    });
};
