import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BlocklyWrapperHandle } from '../components/BlocklyWrapper';
import { BoardRegistry } from '../registries/BoardRegistry';
import { useUI } from './UIContext';
import { ProjectBuildConfig } from '../types/board';

// Import refactored hooks
import { useProjectOps, ProjectState } from '../hooks/project/useProjectOps';
import { useAutoBackup } from '../hooks/project/useAutoBackup';
import { useSavePrompt } from '../hooks/useSavePrompt';

interface ProjectMetadata {
    version: string;
    name: string;
    boardId: string;
    createdAt: number;
    lastModified: number;
    buildConfig?: ProjectBuildConfig;
}

// ============================================================
// 文件系统上下文 (FileSystem Context)
// ============================================================

interface FileSystemContextType {
    code: string;
    setCode: (code: string) => void;
    projectMetadata: ProjectMetadata | null;
    updateProjectConfig: (config: ProjectBuildConfig) => void;
    updateProjectBoard: (boardId: string) => void;
    workDir: string;
    blocklyRef: React.RefObject<BlocklyWrapperHandle>;

    // 项目流程
    newProject: () => void;
    currentFilePath: string | undefined;

    // 状态管理
    isDirty: boolean;
    setIsDirty: (dirty: boolean) => void;
    markWorkspaceDirty: () => void;
    pendingXml: string | null;
    clearPendingXml: () => void;

    // 核心操作 (Exposed from hooks)
    createNewProject: (name: string, boardId: string, parentDir: string) => Promise<{ success: boolean; error?: string }>;
    saveProject: () => Promise<void>;
    saveProjectAs: () => Promise<void>;
    performSaveAs: (newName: string, parentDir: string) => Promise<{ success: boolean; error?: string }>;
    exportCode: () => Promise<void>;
    handleSetWorkDir: () => Promise<void>;
    importBlocklyJson: () => Promise<void>;
    openProjectByPath: (path: string) => Promise<{ success: boolean; error?: string }>;
    closeProject: () => Promise<void>;
    openProject: () => Promise<void>;

    // 弹窗逻辑 (Exposed from hooks)
    savePrompt: { isOpen: boolean; pendingAction: (() => void) | null };
    checkDirtyAndRun: (action: () => void) => void;
    handleSaveConfirm: () => Promise<void>;
    handleDontSave: () => void;
    handleCancelPrompt: () => void;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // --- 核心状态 (Core State) ---
    const [code, setCode] = useState<string>('');
    const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
    const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata | null>(null);
    const [workDir, setWorkDir] = useState<string>('');
    const [isDirty, setIsDirty] = useState<boolean>(false);
    const [workspaceVersion, setWorkspaceVersion] = useState<number>(0);
    const blocklyRef = useRef<BlocklyWrapperHandle>(null);
    const [pendingXml, setPendingXml] = useState<string | null>(null);

    const { setIsNewProjectOpen, setIsSaveAsOpen } = useUI();

    const markWorkspaceDirty = useCallback(() => {
        setIsDirty(true);
        setWorkspaceVersion(v => v + 1);
    }, []);

    // Memoize the state object to prevent unnecessary re-renders of consumers
    const projectState: ProjectState = useMemo(() => ({
        path: currentFilePath,
        metadata: projectMetadata as any,
        isDirty,
        code
    }), [currentFilePath, projectMetadata, isDirty, code]);

    // 1. 初始化 (Initialize)
    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.getWorkDir().then(setWorkDir);
        }
    }, []);

    // 2. 项目配置更新逻辑 (Update Handlers)
    const updateProjectConfig = useCallback((config: ProjectBuildConfig) => {
        if (!projectMetadata) return;
        setProjectMetadata(prev => prev ? ({ ...prev, buildConfig: config }) : null);
        markWorkspaceDirty();
    }, [projectMetadata, markWorkspaceDirty]);

    const updateProjectBoard = useCallback((boardId: string) => {
        if (!projectMetadata) return;
        const newBoardConfig = BoardRegistry.get(boardId);
        if (!newBoardConfig) return;

        setProjectMetadata(prev => {
            if (!prev) return null;
            const currentConfig = prev.buildConfig || {};
            const template = newBoardConfig.build;
            const newConfig: ProjectBuildConfig = {
                ...currentConfig,
                envName: template.envName,
                platform: template.platform,
                board: template.board,
                framework: template.framework,
                upload_protocol: undefined,
            };
            return { ...prev, boardId, buildConfig: newConfig };
        });
        markWorkspaceDirty();
    }, [projectMetadata, markWorkspaceDirty]);

    // 3. 引入业务逻辑 Hooks (Inject Business Logic)

    const projectOps = useProjectOps({
        blocklyRef,
        projectState,
        setPath: setCurrentFilePath,
        setMetadata: setProjectMetadata as any,
        setIsDirty,
        setCode,
        setPendingXml,
        markWorkspaceDirty,
        setIsNewProjectOpen,
        setIsSaveAsOpen
    });

    const { saveProject, performSaveAs, openProjectByPath, createNewProject, openProject } = projectOps;

    // 自动备份 (Auto-Backup)
    useAutoBackup({
        isDirty,
        currentFilePath,
        workspaceVersion,
        code,
        projectMetadata,
        blocklyRef
    });

    // 弹窗提示 (Save Prompts)
    const discardBackup = useCallback(async () => {
        if (currentFilePath && window.electronAPI) {
            await window.electronAPI.discardBackup(currentFilePath);
        }
    }, [currentFilePath]);

    const savePromptOps = useSavePrompt({
        isDirty,
        saveProject,
        discardBackup
    });

    const { savePrompt, checkDirtyAndRun, handleSaveConfirm, handleDontSave, handleCancelPrompt } = savePromptOps;

    // 4. 其余辅助操作 (Utility Operations)
    const closeProject = useCallback(async () => {
        checkDirtyAndRun(() => {
            setCurrentFilePath(null);
            setProjectMetadata(null);
            setCode('');
            if (blocklyRef.current) blocklyRef.current.clear();
            setIsDirty(false);
            setPendingXml(null);
        });
    }, [checkDirtyAndRun]);

    const exportCode = useCallback(async () => {
        if (!window.electronAPI) return;
        try {
            const path = await window.electronAPI.saveCodeDialog();
            if (path) await window.electronAPI.saveFileContent(code, path);
        } catch (e) {
            console.error(e);
        }
    }, [code]);

    const importBlocklyJson = useCallback(async () => {
        if (!window.electronAPI) return;
        if (currentFilePath && !confirm("Importing will replace current blocks. Continue?")) return;

        const result = await window.electronAPI.openFileDialog({
            title: 'Import Blockly JSON',
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });

        if (result && result.content) {
            try {
                blocklyRef.current?.loadXml(result.content);
                markWorkspaceDirty();
                setTimeout(() => saveProject(), 100);
            } catch (e) {
                alert("Invalid JSON format");
            }
        }
    }, [saveProject, currentFilePath, markWorkspaceDirty]);

    const handleSetWorkDir = useCallback(async () => {
        if (!window.electronAPI) return;
        const path = await window.electronAPI.selectWorkDir();
        if (path) setWorkDir(path);
    }, []);

    const value = {
        code, setCode,
        currentFilePath: currentFilePath || undefined,
        projectMetadata,
        updateProjectConfig,
        updateProjectBoard,
        workDir,
        blocklyRef,
        isDirty,
        setIsDirty,
        markWorkspaceDirty,
        newProject: () => setIsNewProjectOpen(true),
        createNewProject,
        openProject,
        saveProject,
        saveProjectAs: async () => {
            if (!currentFilePath) setIsNewProjectOpen(true);
            else setIsSaveAsOpen(true);
        },
        performSaveAs,
        exportCode,
        handleSetWorkDir,
        importBlocklyJson,
        openProjectByPath,
        closeProject,
        pendingXml,
        clearPendingXml: () => setPendingXml(null),
        savePrompt,
        checkDirtyAndRun,
        handleSaveConfirm,
        handleDontSave,
        handleCancelPrompt
    };

    return (
        <FileSystemContext.Provider value={value}>
            {children}
        </FileSystemContext.Provider>
    );
};

export const useFileSystem = () => {
    const context = useContext(FileSystemContext);
    if (context === undefined) {
        throw new Error('useFileSystem must be used within a FileSystemProvider');
    }
    return context;
};
