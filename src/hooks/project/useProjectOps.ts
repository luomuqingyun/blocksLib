/**
 * ============================================================
 * 项目操作 Hook (Project Operations Hook)
 * ============================================================
 * 
 * 封装项目文件系统操作:
 * - 新建/打开/保存/另存为项目
 * - 导入导出 Blockly JSON
 * - 项目元数据管理
 * - 备份恢复提示
 * 
 * @file src/hooks/project/useProjectOps.ts
 * @module EmbedBlocks/Frontend/Hooks/Project
 */

import { useCallback } from 'react';
import { BoardRegistry } from '../../registries/BoardRegistry';
import { BlocklyWrapperHandle } from '../../components/BlocklyWrapper';

interface ProjectMetadata {
    version: string;
    name: string;
    boardId: string;
    createdAt: number;
    lastModified: number;
    buildConfig?: any;
}

export interface ProjectState {
    path: string | null;
    metadata: ProjectMetadata | null;
    isDirty: boolean;
    code: string;
}

interface ProjectOpsProps {
    blocklyRef: React.RefObject<BlocklyWrapperHandle>;
    projectState: ProjectState;
    setPath: (path: string | null) => void;
    setMetadata: (metadata: ProjectMetadata | null) => void;
    setIsDirty: (dirty: boolean) => void;
    setCode: (code: string) => void;
    setPendingXml: (xml: string | null) => void;
    markWorkspaceDirty: () => void;
    setIsNewProjectOpen: (open: boolean) => void;
    setIsSaveAsOpen: (open: boolean) => void;
}

export const useProjectOps = (props: ProjectOpsProps) => {
    const {
        blocklyRef,
        projectState,
        setPath,
        setMetadata,
        setIsDirty,
        setCode,
        setPendingXml,
        markWorkspaceDirty,
        setIsNewProjectOpen,
        setIsSaveAsOpen
    } = props;

    const { path: currentFilePath, metadata: projectMetadata, code, isDirty } = projectState;

    const createNewProject = useCallback(async (name: string, boardId: string, parentDir: string) => {
        if (!window.electronAPI) return { success: false, error: 'Electron API not found' };
        try {
            const boardConfig = BoardRegistry.get(boardId);
            const result = await window.electronAPI.createProject(parentDir, name, boardId, boardConfig?.build);
            if (result.success && result.path) {
                // [FIX] Include default Entry Root block so new projects generate code immediately
                const defaultBlocklyState = JSON.stringify({
                    blocks: {
                        languageVersion: 0,
                        blocks: [{
                            type: "arduino_entry_root",
                            id: "default_entry_root",
                            x: 50,
                            y: 50
                        }]
                    }
                });
                if (blocklyRef.current) {
                    blocklyRef.current.loadXml(defaultBlocklyState);
                } else {
                    setPendingXml(defaultBlocklyState);
                }

                setPath(result.path);
                setMetadata({
                    version: '1.0.0',
                    name: name,
                    boardId: boardId,
                    createdAt: Date.now(),
                    lastModified: Date.now()
                });
                setIsDirty(false);
                return { success: true };
            } else {
                return { success: false, error: result.error || 'Unknown error' };
            }
        } catch (e) {
            console.error(e);
            return { success: false, error: String(e) };
        }
    }, [blocklyRef, setPath, setMetadata, setIsDirty, setPendingXml]);

    const openProject = useCallback(async () => {
        try {
            if (!window.electronAPI) return;
            const result = await window.electronAPI.openProjectFolder();
            if (!result.cancelled && result.projectPath && result.data) {
                const projectPath = result.projectPath;
                let { metadata, xml, code } = result.data;

                const backupCheck = await window.electronAPI.checkBackup(projectPath);
                if (backupCheck.hasBackup) {
                    const restore = confirm("检测到未保存的备份文件 (Unsaved Backup Found).\n\n是否恢复？(OK = Restore, Cancel = Discard)");
                    if (restore) {
                        const backupRes = await window.electronAPI.restoreBackup(projectPath);
                        if (backupRes.success && backupRes.data) {
                            const bd = backupRes.data;
                            if (bd.blocklyState) xml = bd.blocklyState;
                            if (bd.code) code = bd.code;
                            if (bd.boardId && metadata) metadata.boardId = bd.boardId;
                            if (bd.buildConfig && metadata) metadata.buildConfig = bd.buildConfig;
                            setTimeout(() => markWorkspaceDirty(), 500);
                        }
                    } else {
                        await window.electronAPI.discardBackup(projectPath);
                        setIsDirty(false);
                    }
                } else {
                    setIsDirty(false);
                }

                setPendingXml(xml);
                setCode(code);
                setPath(result.projectPath);
                setMetadata(metadata);
            }
        } catch (e) { console.error(e); }
    }, [markWorkspaceDirty, setCode, setPath, setIsDirty, setPendingXml, setMetadata]);

    const openProjectByPath = useCallback(async (path: string) => {
        try {
            if (!window.electronAPI) return { success: false, error: 'Electron API not found' };
            const result = await window.electronAPI.openProjectByPath(path);
            if (!result.cancelled && result.projectPath && result.data) {
                const projectPath = result.projectPath;
                let { metadata, xml, code } = result.data;

                const backupCheck = await window.electronAPI.checkBackup(projectPath);
                if (backupCheck.hasBackup) {
                    const restore = confirm("检测到未保存的备份文件 (Unsaved Backup Found).\n\n是否恢复？(OK = Restore, Cancel = Discard)");
                    if (restore) {
                        const backupRes = await window.electronAPI.restoreBackup(projectPath);
                        if (backupRes.success && backupRes.data) {
                            const bd = backupRes.data;
                            if (bd.blocklyState) xml = bd.blocklyState;
                            if (bd.code) code = bd.code;
                            if (bd.boardId && metadata) metadata.boardId = bd.boardId;
                            if (bd.buildConfig && metadata) metadata.buildConfig = bd.buildConfig;
                            setTimeout(() => markWorkspaceDirty(), 500);
                        }
                    } else {
                        await window.electronAPI.discardBackup(projectPath);
                        setIsDirty(false);
                    }
                } else {
                    setIsDirty(false);
                }

                setPendingXml(xml);
                setCode(code);
                setPath(result.projectPath);
                setMetadata(metadata);
                return { success: true };
            } else if (result.error) {
                return { success: false, error: result.error };
            }
            return { success: false, error: 'Cancelled or unknown error' };
        } catch (e) {
            console.error(e);
            return { success: false, error: String(e) };
        }
    }, [markWorkspaceDirty, setCode, setPath, setIsDirty, setPendingXml, setMetadata]);

    const saveProject = useCallback(async () => {
        if (!window.electronAPI) return;

        if (!currentFilePath) {
            setIsNewProjectOpen(true);
            return;
        }

        const state = blocklyRef.current?.getXml();
        if (!state) return;

        try {
            let finalBuildConfig = projectMetadata?.buildConfig || {};
            if (projectMetadata?.boardId) {
                const boardDef = BoardRegistry.get(projectMetadata.boardId);
                if (boardDef && boardDef.build) {
                    const sanitizedUserConfig = { ...finalBuildConfig };
                    Object.keys(sanitizedUserConfig).forEach(key => {
                        if (sanitizedUserConfig[key] === 'default' || sanitizedUserConfig[key] === undefined) {
                            delete sanitizedUserConfig[key];
                        }
                    });

                    finalBuildConfig = {
                        ...boardDef.build as any,
                        ...sanitizedUserConfig
                    };
                }
            }

            await window.electronAPI.saveProjectFolder(currentFilePath, {
                blocklyState: state,
                code: code,
                boardId: projectMetadata?.boardId,
                buildConfig: finalBuildConfig
            });
            setIsDirty(false);

            if (currentFilePath && window.electronAPI) {
                await window.electronAPI.discardBackup(currentFilePath);
            }
        } catch (e) { console.error(e); }
    }, [currentFilePath, code, projectMetadata, setIsNewProjectOpen, blocklyRef, setIsDirty]);

    const performSaveAs = useCallback(async (newName: string, parentDir: string) => {
        if (!currentFilePath || !window.electronAPI) return { success: false, error: 'No active project' };

        try {
            const result = await window.electronAPI.copyProject(currentFilePath, parentDir, newName);
            if (!result.success || !result.newPath) return { success: false, error: result.error || 'Copy failed' };

            setPath(result.newPath);

            if (projectMetadata) {
                setMetadata({ ...projectMetadata, name: newName, lastModified: Date.now() });
            }

            const state = blocklyRef.current?.getXml() || '';
            const finalBuildConfig = projectMetadata?.buildConfig;

            await window.electronAPI.saveProjectFolder(result.newPath, {
                blocklyState: state,
                code: code,
                boardId: projectMetadata?.boardId,
                buildConfig: finalBuildConfig
            });

            setIsDirty(false);
            return { success: true };

        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }, [currentFilePath, code, projectMetadata, blocklyRef, setPath, setMetadata, setIsDirty]);

    return {
        createNewProject,
        openProject,
        openProjectByPath,
        saveProject,
        performSaveAs
    };
};
