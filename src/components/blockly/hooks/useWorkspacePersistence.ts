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
    // 是否需要待执行自动居中 (Scratch 风格)
    const pendingCenter = useRef(false);
    // 是否在本生命周期中已经完成过初次对齐
    const hasRestored = useRef(false);
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
        if (!workspaceRef.current || isDisposed.current) return;

        // 如果已经对齐过，或者没有对齐任务，直接退出
        if (hasRestored.current || !pendingCenter.current) return;

        const metrics = workspaceRef.current.getMetrics();
        // 检查工作区是否已有有效尺寸 (宽度高度大于 0 说明已渲染)
        if (metrics && metrics.viewWidth > 0 && metrics.viewHeight > 0) {
            console.log('[attemptViewRestore] Workspace ready, performing Scratch-style center...');

            // [关键优化] 立即标记已对齐，防止重叠触发
            hasRestored.current = true;
            pendingCenter.current = false;

            // 执行居中
            Blockly.svgResize(workspaceRef.current);
            workspaceRef.current.scrollCenter();

            // [关键加固] 居中后进行一小段时间的稳定化锁定 (缩短为 100ms)
            setTimeout(() => {
                if (workspaceRef.current && !isDisposed.current) {
                    Blockly.svgResize(workspaceRef.current);
                    setIsReadyForEdits(true);
                    if (onXmlLoaded) onXmlLoaded();
                    console.log('[attemptViewRestore] Centering stabilized.');
                }
            }, 100);
        } else if (retries > 0) {
            // 工作区未就绪 (例如处于隐藏状态或布局中)，延迟重试 (100ms)
            setTimeout(() => attemptViewRestore(retries - 1), 100);
        } else {
            // 重试耗尽，避免死锁
            console.warn('[attemptViewRestore] Max retries reached');
            hasRestored.current = true;
            pendingCenter.current = false;
            setIsReadyForEdits(true);
            if (onXmlLoaded) onXmlLoaded();
        }
    }, [workspaceRef, setIsReadyForEdits, onXmlLoaded]);
    /**
     * 将工作区视角居中对齐到现有的积木块 (类似 Scratch 行为)
     * 使用 scrollCenter 确保所有积木处于视口中心
     */
    const centerOnBlocks = useCallback(() => {
        if (!workspaceRef.current) return;
        console.log('[useWorkspacePersistence] Centering workspace on blocks...');
        try {
            // 确保同步最新的 SVG 尺寸
            Blockly.svgResize(workspaceRef.current);
            // Blockly 12+ 推荐的居中对齐方式
            workspaceRef.current.scrollCenter();
        } catch (e) {
            console.warn('[useWorkspacePersistence] Failed to center workspace:', e);
        }
    }, [workspaceRef]);

    /**
     * 重置对齐标志位
     * 在切换项目但复用同一个实例时调用，以允许新项目执行一次自动对齐
     */
    const resetCentering = useCallback(() => {
        hasRestored.current = false;
        pendingCenter.current = false;
        console.log('[WorkspacePersistence] Centering flag reset for new project.');
    }, []);

    /**
     * 加载工作区状态
     * 支持 XML 格式 (旧版) 和 JSON 格式 (新版)
     * 
     * @param stateStr 状态字符串 (XML 或 JSON)
     */
    const loadWorkspaceState = useCallback((stateStr: string) => {
        console.log('[loadWorkspaceState] Called with stateStr length:', stateStr?.length);
        if (!workspaceRef.current) return;

        // [关键修复] 如果 stateStr 为空，也不能直接 return
        // 必须确保默认积木加载并通知外界完成，否则会导致加载锁死锁
        if (!stateStr) {
            console.log('[loadWorkspaceState] Empty stateStr, ensuring default blocks and auto-centering...');
            Blockly.Events.disable();
            try {
                workspaceRef.current.clear();
                ensureDefaultBlocks();
            } finally {
                Blockly.Events.enable();
            }
            // 进入居中逻辑
            pendingCenter.current = true;
            attemptViewRestore();
            return;
        }

        try {
            // 检测是否为 XML 格式 (向后兼容旧版保存格式)
            if (stateStr.trim().startsWith('<xml')) {
                console.log('[loadWorkspaceState] Loading XML format');
                workspaceRef.current.clear();
                const xmlDom = Blockly.utils.xml.textToDom(stateStr);
                Blockly.Xml.domToWorkspace(xmlDom, workspaceRef.current);
                // [关键修复] XML 加载也需要进入居中/恢复流程
                pendingCenter.current = true;
                Blockly.svgResize(workspaceRef.current);
                attemptViewRestore();
            } else {
                // JSON 格式 (新版)
                console.log('[loadWorkspaceState] Loading JSON format');
                const state = JSON.parse(stateStr);

                // [MODIFIED] 彻底移除对 viewState 的读取，不再使用缓存位置
                // 如果 state 中有 viewState 字段，忽略它

                // --- 鲁棒性解包逻辑 (Robust Unfolding) ---
                let blocksState = state;

                // 1. 如果是项目文件封装格式 { metadata, blocks: { ... } }
                if (state.metadata && state.blocks) {
                    blocksState = state.blocks;
                }

                // 2. 补全 Workspace 序列化包裹
                // Blockly.serialization.workspaces.load 期望顶级 key 对应 serializer (如 'blocks')
                let finalState: any = {};
                if (Array.isArray(blocksState)) {
                    // 数组格式: [...] -> { blocks: { blocks: [...] } }
                    finalState = { blocks: { blocks: blocksState } };
                } else if (blocksState.blocks && Array.isArray(blocksState.blocks)) {
                    // 积木状态格式: { blocks: [...] } -> { blocks: { blocks: [...] } }
                    finalState = { blocks: blocksState };
                } else if (blocksState.blocks && blocksState.blocks.blocks) {
                    // 标准工作区格式: { blocks: { blocks: [...] } }
                    finalState = blocksState;
                } else {
                    // 兜底补包
                    finalState = blocksState.blocks ? blocksState : { blocks: blocksState };
                }

                // 清空并加载新状态
                Blockly.Events.disable();
                try {
                    workspaceRef.current.clear();
                    console.log('[loadWorkspaceState] Loading state (Robust Mode)...');
                    Blockly.serialization.workspaces.load(finalState, workspaceRef.current);
                    ensureDefaultBlocks();
                } finally {
                    Blockly.Events.enable();
                }

                // 统一进入异步居中流程（仅限本次 mount 后尚未居中的情况）
                if (!hasRestored.current) {
                    pendingCenter.current = true;
                    Blockly.svgResize(workspaceRef.current);
                    attemptViewRestore();
                } else {
                    setIsReadyForEdits(true);
                    if (onXmlLoaded) onXmlLoaded();
                }
            }
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
        // [MODIFED] 只保存积木数据，不再保存视口坐标
        const state = Blockly.serialization.workspaces.save(workspaceRef.current);
        return JSON.stringify(state);
    }, [workspaceRef]);

    return {
        loadWorkspaceState,
        saveWorkspaceState,
        attemptViewRestore,
        ensureDefaultBlocks,
        centerOnBlocks,
        resetCentering,
        isDisposed
    };
};
