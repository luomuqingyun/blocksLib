import { useRef, useCallback, MutableRefObject } from 'react';
import * as Blockly from 'blockly';
import { validateBlock } from '../../../utils/block_validation';

/**
 * Hook to manage Blockly workspace state (XML/JSON) and viewport persistence.
 */
export const useWorkspacePersistence = (
    workspaceRef: MutableRefObject<any>,
    currentFilePath: string | null | undefined,
    setIsReadyForEdits: (ready: boolean) => void,
    onXmlLoaded?: () => void
) => {
    const pendingViewState = useRef<{ scrollX: number; scrollY: number; scale: number } | null>(null);
    const isDisposed = useRef(false);

    const ensureDefaultBlocks = useCallback(() => {
        if (!workspaceRef.current) return;
        const blocks = workspaceRef.current.getAllBlocks(false);
        const hasUnified = blocks.some((b: any) => b.type === 'arduino_entry_root');
        const hasSetup = blocks.some((b: any) => b.type === 'arduino_functions_setup');
        const hasLoop = blocks.some((b: any) => b.type === 'arduino_functions_loop');

        if (!hasUnified && !hasSetup && !hasLoop) {
            Blockly.Events.disable();
            try {
                const rootBlock = workspaceRef.current.newBlock('arduino_entry_root');
                rootBlock.initSvg();
                rootBlock.render();
                rootBlock.moveBy(50, 50);
                validateBlock(rootBlock);
            } finally {
                Blockly.Events.enable();
            }
        }
    }, [workspaceRef]);

    const attemptViewRestore = useCallback((retries = 5) => {
        const vs = pendingViewState.current;
        if (!vs || !workspaceRef.current) return;

        const metrics = workspaceRef.current.getMetrics();
        if (metrics && metrics.viewWidth > 0 && metrics.viewHeight > 0) {
            workspaceRef.current.setScale(vs.scale);
            setTimeout(() => {
                if (workspaceRef.current && !isDisposed.current) {
                    Blockly.svgResize(workspaceRef.current);
                    workspaceRef.current.translate(vs.scrollX, vs.scrollY);
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
            setTimeout(() => attemptViewRestore(retries - 1), 100);
        } else {
            setIsReadyForEdits(true);
            if (onXmlLoaded) onXmlLoaded();
        }
    }, [workspaceRef, setIsReadyForEdits, onXmlLoaded]);

    const loadWorkspaceState = useCallback((stateStr: string) => {
        console.log('[loadWorkspaceState] Called with stateStr length:', stateStr?.length);
        console.log('[loadWorkspaceState] stateStr preview:', stateStr?.substring(0, 200));
        if (!workspaceRef.current || !stateStr) {
            console.warn('[loadWorkspaceState] Early return - workspaceRef:', !!workspaceRef.current, 'stateStr:', !!stateStr);
            return;
        }
        try {
            if (stateStr.trim().startsWith('<xml')) {
                console.log('[loadWorkspaceState] Loading XML format');
                workspaceRef.current.clear();
                const xmlDom = Blockly.utils.xml.textToDom(stateStr);
                Blockly.Xml.domToWorkspace(xmlDom, workspaceRef.current);
            } else {
                console.log('[loadWorkspaceState] Loading JSON format');
                const state = JSON.parse(stateStr);
                console.log('[loadWorkspaceState] Parsed state keys:', Object.keys(state));
                console.log('[loadWorkspaceState] state.blocks type:', typeof state.blocks);
                console.log('[loadWorkspaceState] state.blocks.blocks type:', typeof state.blocks?.blocks);
                console.log('[loadWorkspaceState] Blocks count:', state.blocks?.blocks?.length);

                let savedViewState = state.viewState;

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

                if (savedViewState) {
                    pendingViewState.current = savedViewState;
                    delete state.viewState;
                }
                let stateToLoad = state;
                if (state && Array.isArray(state.blocks)) {
                    console.log('[loadWorkspaceState] Wrapping state.blocks in { blocks: state }');
                    stateToLoad = { blocks: state };
                }
                console.log('[loadWorkspaceState] Final stateToLoad keys:', Object.keys(stateToLoad));

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

    const saveWorkspaceState = useCallback(() => {
        if (!workspaceRef.current) return '';
        const rawState = Blockly.serialization.workspaces.save(workspaceRef.current);
        const metrics = workspaceRef.current.getMetrics();
        const viewState = {
            scrollX: workspaceRef.current.scrollX,
            scrollY: workspaceRef.current.scrollY,
            scale: workspaceRef.current.scale,
            viewWidth: metrics ? metrics.viewWidth : 0,
            viewHeight: metrics ? metrics.viewHeight : 0
        };
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
