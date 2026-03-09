/**
 * ============================================================
 * Blockly 快捷键管理 Hook (Blockly Shortcuts Management Hook)
 * ============================================================
 * 
 * 核心职责:
 * 1. 安全地修补 Blockly 的 ShortcutRegistry，防止键盘事件被错误拦截
 * 2. 管理搜索快捷键 (Ctrl+F / Ctrl+Shift+F)
 * 
 * 安全策略:
 * - 单例模式: 保证全局 Patch 只执行一次，避免 React 重渲染副作用
 * - 精准判定: 使用 e.target 而非 activeElement，避免焦点切换时序问题
 * - 白名单放行: 明确识别 Blockly 内部输入 (FieldInput)，确保其功能正常
 * 
 * @file src/components/blockly/hooks/useBlocklyShortcuts.ts
 * @module EmbedBlocks/Frontend/Hooks
 */

import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';

/** 全局 Patch 状态标记 (防止重复 Patch) */
let isBlocklyPatched = false;
/** 原始的 onKeyDown 处理器引用 */
let originalOnKeyDown: any = null;

/**
 * 检测目标元素是否为外部可编辑区域 (需阻止 Blockly 处理)
 * 
 * @param target 事件目标元素
 * @returns true=外部输入(需拦截), false=非输入或Blockly内部输入(放行)
 */
const isExternalEditable = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;

    const el = target as HTMLElement;
    const tagName = el.tagName.toUpperCase();

    // 1. [关键] 首先排除 Blockly 内部输入组件
    // FieldInput (数字/文本输入)
    if (el.classList.contains('blocklyHtmlInput') || el.closest('.blocklyHtmlInput')) return false;
    // 下拉菜单/颜色选择器等 Widget
    if (el.closest('.blocklyWidgetDiv')) return false;
    // 上下文菜单
    if (el.closest('.blocklyContextMenu')) return false;
    // 工具提示
    if (el.closest('.blocklyTooltipDiv')) return false;

    // 2. 检测具体的外部输入特征
    // 搜索组件输入框 (明确拦截)
    if (el.classList.contains('unified-search-input') || el.closest('.unified-search-input')) return true;

    // 标准表单元素
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        // [Phase 4] 即使获焦的是 Input，也需要二次确认识别它的保护状态
        return true;
    }

    // 内容可编辑区域
    if (el.isContentEditable) return true;

    // Monaco Editor
    if (el.closest('.monaco-editor')) return true;

    // 自定义输入保护
    if (el.dataset?.inputProtect === 'true' || el.closest('[data-input-protect="true"]')) return true;

    // ARIA roles
    const role = el.getAttribute('role');
    if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true;

    return false;
};

/**
 * 执行全局安全性 Patch
 * 仅在模块首次加载或首次调用 hook 时执行一次
 * 
 * 两层防御:
 * 1. 键盘层: 补丁 ShortcutRegistry.onKeyDown，阻止 Blockly 在外部输入时处理快捷键
 * 2. 鼠标层: 全局 capture 阶段拦截器，阻止 Blockly 的 mousedown 处理器窃取输入框焦点
 */
const applyGlobalPatch = () => {
    if (isBlocklyPatched) return;

    try {
        // ===== 键盘层防御 =====
        // @ts-ignore - Accessing internal registry
        const registry = Blockly.ShortcutRegistry.registry;

        // 保存原始引用
        if (!originalOnKeyDown) {
            originalOnKeyDown = registry.onKeyDown;
        }

        // 注入新的处理器
        registry.onKeyDown = function (workspace: any, e: KeyboardEvent) {
            // 使用 e.target 进行精准判定
            if (isExternalEditable(e.target)) {
                // 如果是外部输入，直接返回 false，阻止 Blockly 处理该事件
                // 这样事件可以继续冒泡或被原生输入框消费
                return false;
            }

            // 否则，调用原始处理器 (处理积木删除、撤销等快捷键)
            return originalOnKeyDown.call(this, workspace, e);
        };

        // ===== 鼠标层防御（集中式） =====
        // Blockly 在 document 上注册了 capture 阶段的 mousedown 监听器，
        // 会对所有鼠标点击调用 e.preventDefault()，杀死浏览器原生的输入框聚焦机制。
        //
        // 解决方案：在 document 上注册一个更高优先级的 capture 阶段拦截器，
        // 当点击目标落在外部可编辑元素上时，立即 stopImmediatePropagation()，
        // 阻止 Blockly 的 capture 监听器接收到该事件。
        //
        // stopImmediatePropagation 比 stopPropagation 更强：
        // - stopPropagation: 阻止事件传播到父/子节点
        // - stopImmediatePropagation: 阻止同一节点上其他监听器也接收该事件
        //
        // 由于 Blockly 的监听器也挂在 document 上，我们需要 stopImmediatePropagation。
        document.addEventListener('mousedown', (e: MouseEvent) => {
            if (isExternalEditable(e.target)) {
                e.stopImmediatePropagation();
            }
        }, true); // true = capture 阶段

        document.addEventListener('pointerdown', (e: PointerEvent) => {
            if (isExternalEditable(e.target)) {
                e.stopImmediatePropagation();
            }
        }, true);

        isBlocklyPatched = true;
        console.log('[useBlocklyShortcuts] Global Blockly shortcut + mouse patch applied successfully.');
    } catch (e) {
        console.error('[useBlocklyShortcuts] Failed to patch Blockly shortcuts:', e);
    }
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
    // 使用 ref 确保这些回调在闭包中是最新的，虽然 effect 只运行一次
    const handlersRef = useRef({ setSearchMode, setIsSearchVisible });
    useEffect(() => {
        handlersRef.current = { setSearchMode, setIsSearchVisible };
    }, [setSearchMode, setIsSearchVisible]);

    useEffect(() => {
        // 1. 确保 Patch 已应用 (幂等操作)
        applyGlobalPatch();

        /**
         * 2. 全局搜索快捷键监听器 (Ctrl+F, Ctrl+Shift+F)
         * 使用 capture=true 确保在任何其他处理之前捕获
         */
        const searchShortcuts = (event: KeyboardEvent) => {
            // 如果焦点在外部输入框中，且不是我们自己的搜索框 (防止在搜索框内按 Ctrl+F 导致重置)
            // 通常我们希望 Ctrl+F 总是能唤起搜索，除非用户正在打字且不希望被打断
            // 这里保留原逻辑：如果在任何输入框内，不触发 (除非是 ReadOnly)

            // 修正：Blockly 内部输入框也应该能唤起搜索
            const target = event.target as Element;
            // 如果是外部输入框 (非Blockly)，则不触发快捷键，以免干扰正常输入 (如在 Monaco 中查找)
            if (isExternalEditable(target)) {
                return;
            }

            // Ctrl+F -> 工作区搜索
            if ((event.ctrlKey || event.metaKey) && event.key === 'f' && !event.shiftKey) {
                event.preventDefault();
                event.stopPropagation();
                handlersRef.current.setIsSearchVisible(true);
                handlersRef.current.setSearchMode('workspace');
            }

            // Ctrl+Shift+F -> 工具箱搜索
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
                event.preventDefault();
                event.stopPropagation();
                handlersRef.current.setIsSearchVisible(true);
                handlersRef.current.setSearchMode('toolbox');
            }
        };

        document.addEventListener('keydown', searchShortcuts, true);

        return () => {
            document.removeEventListener('keydown', searchShortcuts, true);
            // 注意：我们不移除 global patch，因为它是全局单例的，移除可能导致其他组件出问题
            // 且 Blockly 实例通常贯穿整个应用生命周期
        };
    }, []);
};
