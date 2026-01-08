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

interface ProjectOpsProps {
    blocklyRef: React.RefObject<BlocklyWrapperHandle>;
    currentFilePath: string | null;
    setCurrentFilePath: React.Dispatch<React.SetStateAction<string | null>>;
    setProjectMetadata: React.Dispatch<React.SetStateAction<ProjectMetadata | null>>;
    projectMetadata: ProjectMetadata | null;
    setCode: (code: string) => void;
    code: string;
    setIsDirty: (dirty: boolean) => void;
    setPendingXml: (xml: string | null) => void;
    markWorkspaceDirty: () => void;
    setIsNewProjectOpen: (open: boolean) => void;
    setIsSaveAsOpen: (open: boolean) => void;
}

export const useProjectOps = (props: ProjectOpsProps) => {
    const {
        blocklyRef,
        currentFilePath,
        setCurrentFilePath,
        setProjectMetadata,
        projectMetadata,
        setCode,
        code,
        setIsDirty,
        setPendingXml,
        markWorkspaceDirty,
        setIsNewProjectOpen,
        setIsSaveAsOpen
    } = props;

    const createNewProject = useCallback(async (name: string, boardId: string, parentDir: string) => {
        if (!window.electronAPI) return { success: false, error: 'Electron API not found' };
        try {
            const boardConfig = BoardRegistry.get(boardId);
            const result = await window.electronAPI.createProject(parentDir, name, boardId, boardConfig?.build);
            if (result.success && result.path) {
                const emptyState = '{"blocks":{ "languageVersion": 0, "blocks": [] }}';
                if (blocklyRef.current) {
                    blocklyRef.current.loadXml(emptyState);
                } else {
                    setPendingXml(emptyState);
                }

                setCurrentFilePath(result.path);
                setProjectMetadata({
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
    }, [blocklyRef, setCurrentFilePath, setProjectMetadata, setIsDirty, setPendingXml]);

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
                setCurrentFilePath(result.projectPath);
                setProjectMetadata(metadata);
            }
        } catch (e) { console.error(e); }
    }, [markWorkspaceDirty, setCode, setCurrentFilePath, setIsDirty, setPendingXml, setProjectMetadata]);

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
                setCurrentFilePath(result.projectPath);
                setProjectMetadata(metadata);
                return { success: true };
            } else if (result.error) {
                return { success: false, error: result.error };
            }
            return { success: false, error: 'Cancelled or unknown error' };
        } catch (e) {
            console.error(e);
            return { success: false, error: String(e) };
        }
    }, [markWorkspaceDirty, setCode, setCurrentFilePath, setIsDirty, setPendingXml, setProjectMetadata]);

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

            setCurrentFilePath(result.newPath);

            setProjectMetadata(prev => {
                if (!prev) return null;
                return { ...prev, name: newName, lastModified: Date.now() };
            });

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
    }, [currentFilePath, code, projectMetadata, blocklyRef, setCurrentFilePath, setProjectMetadata, setIsDirty]);

    return {
        createNewProject,
        openProject,
        openProjectByPath,
        saveProject,
        performSaveAs
    };
};
