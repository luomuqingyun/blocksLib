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
        if (!workspaceRef.current || !stateStr) return;
        try {
            if (stateStr.trim().startsWith('<xml')) {
                workspaceRef.current.clear();
                const xmlDom = Blockly.utils.xml.textToDom(stateStr);
                Blockly.Xml.domToWorkspace(xmlDom, workspaceRef.current);
            } else {
                const state = JSON.parse(stateStr);
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
                if (state && Array.isArray(state.blocks)) stateToLoad = { blocks: state };

                workspaceRef.current.clear();
                Blockly.serialization.workspaces.load(stateToLoad, workspaceRef.current);
                if (pendingViewState.current) {
                    Blockly.svgResize(workspaceRef.current);
                    attemptViewRestore();
                }
            }
            ensureDefaultBlocks();
        } catch (e) {
            console.error("[WorkspacePersistence] Failed to load state", e);
        }
    }, [workspaceRef, currentFilePath, attemptViewRestore, ensureDefaultBlocks]);

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
