/**
 * ============================================================
 * Blockly 工作区持久化 Hook (Workspace Persistence Hook)
 * ============================================================
 * 
 * 管理 Blockly 工作区状态的保存和加载。
 * 
 * 功能:
 * - 加载工作区状态 (支持 XML 和 JSON 格式)
 * - 保存工作区状态 (JSON 格式)
 * - 保持视图状态 (滚动位置、缩放比例)
 * - 确保默认积木块存在 (arduino_entry_root)
 * - 本地存储视图状态 (按文件路径)
 * 
 * 状态格式:
 * - JSON: { blocks: {...}, viewState: {scrollX, scrollY, scale} }
 * - XML: 旧版 Blockly XML 格式 (向后兼容)
 * 
 * @file src/components/blockly/hooks/useWorkspacePersistence.ts
 * @module EmbedBlocks/Frontend/Hooks
 */

import { useRef, useCallback, MutableRefObject } from 'react';
import * as Blockly from 'blockly';
import { validateBlock } from '../../../utils/block_validation';
export const useWorkspacePersistence = (
    workspaceRef: MutableRefObject<any>,
    currentFilePath: string | null | undefined,
    setIsReadyForEdits: (ready: boolean) => void,
    onXmlLoaded?: () => void
) => {
    // 待恢复的视图状态 (滚动位置、缩放比例)
    const pendingViewState = useRef<{ scrollX: number; scrollY: number; scale: number } | null>(null);
    // 工作区是否已销毁标志 (防止异步操作在销毁后执行)
    const isDisposed = useRef(false);

    /**
     * 确保工作区中存在默认程序入口积木块
     * 如果没有 arduino_entry_root 或旧版 setup/loop 积木块，自动创建
     */
    const ensureDefaultBlocks = useCallback(() => {
        if (!workspaceRef.current) return;
        const blocks = workspaceRef.current.getAllBlocks(false);
        // 检查是否存在各类入口积木块
        const hasUnified = blocks.some((b: any) => b.type === 'arduino_entry_root');
        const hasSetup = blocks.some((b: any) => b.type === 'arduino_functions_setup');
        const hasLoop = blocks.some((b: any) => b.type === 'arduino_functions_loop');

        // 如果都不存在，创建默认的统一入口积木块
        if (!hasUnified && !hasSetup && !hasLoop) {
            Blockly.Events.disable(); // 禁用事件以避免触发保存
            try {
                const rootBlock = workspaceRef.current.newBlock('arduino_entry_root');
                rootBlock.initSvg();
                rootBlock.render();
                rootBlock.moveBy(50, 50); // 移动到工作区左上角
                validateBlock(rootBlock);
            } finally {
                Blockly.Events.enable();
            }
        }
    }, [workspaceRef]);

    /**
     * 尝试恢复视图状态 (滚动位置和缩放比例)
     * 使用重试机制确保工作区已完全渲染
     * 
     * @param retries 剩余重试次数
     */
    const attemptViewRestore = useCallback((retries = 5) => {
        const vs = pendingViewState.current;
        if (!vs || !workspaceRef.current) return;

        const metrics = workspaceRef.current.getMetrics();
        // 检查工作区是否已有有效尺寸
        if (metrics && metrics.viewWidth > 0 && metrics.viewHeight > 0) {
            workspaceRef.current.setScale(vs.scale); // 恢复缩放比例
            setTimeout(() => {
                if (workspaceRef.current && !isDisposed.current) {
                    Blockly.svgResize(workspaceRef.current);
                    workspaceRef.current.translate(vs.scrollX, vs.scrollY); // 恢复滚动位置
                    setTimeout(() => {
                        if (!isDisposed.current) {
                            setIsReadyForEdits(true);
                            if (onXmlLoaded) onXmlLoaded();
                        }
                    }, 300);
                }
            }, 100);
            pendingViewState.current = null;
        } else if (retries > 0) {
            // 工作区未就绪，延迟重试
            setTimeout(() => attemptViewRestore(retries - 1), 100);
        } else {
            // 重试耗尽，直接设置就绪状态
            setIsReadyForEdits(true);
            if (onXmlLoaded) onXmlLoaded();
        }
    }, [workspaceRef, setIsReadyForEdits, onXmlLoaded]);

    /**
     * 加载工作区状态
     * 支持 XML 格式 (旧版) 和 JSON 格式 (新版)
     * 
     * @param stateStr 状态字符串 (XML 或 JSON)
     */
    const loadWorkspaceState = useCallback((stateStr: string) => {
        console.log('[loadWorkspaceState] Called with stateStr length:', stateStr?.length);
        console.log('[loadWorkspaceState] stateStr preview:', stateStr?.substring(0, 200));
        if (!workspaceRef.current || !stateStr) {
            console.warn('[loadWorkspaceState] Early return - workspaceRef:', !!workspaceRef.current, 'stateStr:', !!stateStr);
            return;
        }
        try {
            // 检测是否为 XML 格式 (向后兼容旧版保存格式)
            if (stateStr.trim().startsWith('<xml')) {
                console.log('[loadWorkspaceState] Loading XML format');
                workspaceRef.current.clear();
                const xmlDom = Blockly.utils.xml.textToDom(stateStr);
                Blockly.Xml.domToWorkspace(xmlDom, workspaceRef.current);
            } else {
                // JSON 格式 (新版)
                console.log('[loadWorkspaceState] Loading JSON format');
                const state = JSON.parse(stateStr);
                console.log('[loadWorkspaceState] Parsed state keys:', Object.keys(state));
                console.log('[loadWorkspaceState] state.blocks type:', typeof state.blocks);
                console.log('[loadWorkspaceState] state.blocks.blocks type:', typeof state.blocks?.blocks);
                console.log('[loadWorkspaceState] Blocks count:', state.blocks?.blocks?.length);

                let savedViewState = state.viewState;

                // 尝试从本地存储读取视图状态 (优先级更高)
                if (currentFilePath) {
                    try {
                        const normalizedPath = currentFilePath.replace(/\\/g, '/').toLowerCase();
                        const localKey = `viewstate:${normalizedPath}`;
                        const localData = localStorage.getItem(localKey);
                        if (localData) {
                            savedViewState = JSON.parse(localData);
                        }
                    } catch (e) { }
                }

                // 保存视图状态以便后续恢复
                if (savedViewState) {
                    pendingViewState.current = savedViewState;
                    delete state.viewState;
                }
                // 处理旧格式: blocks 是数组而非对象
                let stateToLoad = state;
                if (state && Array.isArray(state.blocks)) {
                    console.log('[loadWorkspaceState] Wrapping state.blocks in { blocks: state }');
                    stateToLoad = { blocks: state };
                }
                console.log('[loadWorkspaceState] Final stateToLoad keys:', Object.keys(stateToLoad));

                // 清空并加载新状态
                workspaceRef.current.clear();
                console.log('[loadWorkspaceState] Workspace cleared, loading state...');
                Blockly.serialization.workspaces.load(stateToLoad, workspaceRef.current);
                console.log('[loadWorkspaceState] State loaded, blocks count:', workspaceRef.current.getAllBlocks().length);
                if (pendingViewState.current) {
                    Blockly.svgResize(workspaceRef.current);
                    attemptViewRestore();
                } else {
                    // [FIX] When no viewState to restore, we must still set isReadyForEdits
                    // Otherwise code generation never triggers!
                    console.log('[loadWorkspaceState] No viewState, setting isReadyForEdits=true directly');
                    setIsReadyForEdits(true);
                    if (onXmlLoaded) onXmlLoaded();
                }
            }
            ensureDefaultBlocks();
        } catch (e) {
            console.error("[WorkspacePersistence] Failed to load state", e);
        }
    }, [workspaceRef, currentFilePath, attemptViewRestore, ensureDefaultBlocks, setIsReadyForEdits, onXmlLoaded]);

    /**
     * 保存工作区状态为 JSON 字符串
     * 包含积木块数据和视图状态
     * 
     * @returns JSON 格式的工作区状态字符串
     */
    const saveWorkspaceState = useCallback(() => {
        if (!workspaceRef.current) return '';
        // 序列化积木块状态
        const rawState = Blockly.serialization.workspaces.save(workspaceRef.current);
        // 获取当前视图状态
        const metrics = workspaceRef.current.getMetrics();
        const viewState = {
            scrollX: workspaceRef.current.scrollX,
            scrollY: workspaceRef.current.scrollY,
            scale: workspaceRef.current.scale,
            viewWidth: metrics ? metrics.viewWidth : 0,
            viewHeight: metrics ? metrics.viewHeight : 0
        };
        // 合并积木块状态和视图状态
        return JSON.stringify({ ...rawState, viewState });
    }, [workspaceRef]);

    return {
        loadWorkspaceState,
        saveWorkspaceState,
        attemptViewRestore,
        ensureDefaultBlocks,
        isDisposed
    };
};
