/**
 * ============================================================
 * 文件系统上下文 (FileSystem Context)
 * ============================================================
 * 
 * 管理项目文件和工作区状态:
 * - 项目元数据 (名称、板卡、构建配置)
 * - Blockly 工作区引用
 * - 生成的代码
 * - 脏状态追踪
 * - 自动备份机制
 * 
 * 核心操作:
 * - createNewProject(): 创建新项目
 * - openProject(): 打开项目
 * - saveProject(): 保存项目
 * - closeProject(): 关闭项目
 * 
 * 依赖的 Hooks:
 * - useProjectOps: 项目操作逻辑
 * - useAutoBackup: 自动备份逻辑
 * - useSavePrompt: 保存提示逻辑
 * 
 * @file src/contexts/FileSystemContext.tsx
 * @module EmbedBlocks/Frontend/Contexts/FileSystem
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BlocklyWrapperHandle } from '../components/BlocklyWrapper';
import { BoardRegistry } from '../registries/BoardRegistry';
import { useUI } from './UIContext';
import { ProjectBuildConfig } from '../types/board';

// 引入拆分的业务逻辑 Hooks
import { useProjectOps, ProjectState } from '../hooks/project/useProjectOps';
import { useAutoBackup } from '../hooks/project/useAutoBackup';
import { useSavePrompt } from '../hooks/useSavePrompt';

/** 项目元数据接口 */
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
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
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
    const [isLoading, setIsLoading] = useState<boolean>(false); // 初始化加载锁

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

    useEffect(() => {
        if (!window.electronAPI) return;
        window.electronAPI.getWorkDir().then(setWorkDir);

        // [New] 监听工作目录变更广播
        if (window.electronAPI.onConfigChanged) {
            const unsubscribe = window.electronAPI.onConfigChanged((key, value) => {
                if (key === 'general.workDir') {
                    console.log('[FileSystemContext] Syncing workDir due to broadcast:', value);
                    setWorkDir(value);
                }
            });
            return unsubscribe;
        }
    }, []);

    // 2. 项目配置更新逻辑 (Update Handlers)
    const updateProjectConfig = useCallback((config: ProjectBuildConfig) => {
        if (!projectMetadata) return;
        setProjectMetadata(prev => prev ? ({ ...prev, buildConfig: config }) : null);
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
        isLoading,    // 透传加载锁状态
        setIsLoading, // 透传加载锁控制
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
        blocklyRef,
        isLoading // 自动备份感知加载锁
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
            setIsLoading(true); // 关闭时也锁定，防止清理过程触发意外保存
            setCurrentFilePath(null);
            setProjectMetadata(null);
            setCode('');
            if (blocklyRef.current) blocklyRef.current.clear();
            setIsDirty(false);
            setPendingXml(null);
            setTimeout(() => setIsLoading(false), 500);
        });
    }, [checkDirtyAndRun]);

    /** 
     * 导出生成的 Arduino 源代码 (.ino) 
     * 弹出另存为对话框，并将代码内容写入文件
     */
    const exportCode = useCallback(async () => {
        if (!window.electronAPI) return;
        try {
            const path = await window.electronAPI.saveCodeDialog();
            if (path) await window.electronAPI.saveFileContent(code, path);
        } catch (e) {
            console.error("导出代码失败:", e);
        }
    }, [code]);

    /** 
     * 导入 Blockly JSON 数据 
     * 将外部 JSON 文件内容加载到当前工作区，并自动保存
     */
    const importBlocklyJson = useCallback(async () => {
        if (!window.electronAPI) return;
        // 如果当前已有开启的项目，提示用户导入将覆盖现有内容
        if (currentFilePath && !confirm("导入将替换当前的积木块。是否继续？")) return;

        const result = await window.electronAPI.openFileDialog({
            title: '导入 Blockly JSON',
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });

        if (result && result.content) {
            try {
                // 调用 Blockly 包装器的方法加载内容
                blocklyRef.current?.loadXml(result.content);
                // 标记工作区为已修改状态
                markWorkspaceDirty();
                // 延迟触发保存
                setTimeout(() => saveProject(), 100);
            } catch (e) {
                alert("无效的 JSON 格式");
            }
        }
    }, [saveProject, currentFilePath, markWorkspaceDirty]);

    /** 手动触发设置工作目录 */
    const handleSetWorkDir = useCallback(async () => {
        if (!window.electronAPI) return;
        const path = await window.electronAPI.selectWorkDir();
        if (path) setWorkDir(path);
    }, []);

    const value = {
        code, setCode,
        currentFilePath: currentFilePath || undefined,
        projectMetadata,        // 项目元数据 (如开发板和编译配置)
        updateProjectConfig,    // 更新编译配置
        workDir,                // 当前工作目录
        blocklyRef,             // Blockly 包装器引用
        isDirty,                // 工作区是否有未保存的更改
        setIsDirty,
        markWorkspaceDirty,      // 标记为脏数据
        newProject: () => setIsNewProjectOpen(true),
        createNewProject,        // 创建新项目逻辑
        openProject,             // 打开项目
        saveProject,             // 保存项目
        saveProjectAs: async () => {
            if (!currentFilePath) setIsNewProjectOpen(true);
            else setIsSaveAsOpen(true);
        },
        performSaveAs,           // 执行另存为操作
        exportCode,              // 导出代码
        handleSetWorkDir,        // 设置工作路径
        importBlocklyJson,       // 导入积木 JSON
        openProjectByPath,       // 根据路径打开项目
        closeProject,            // 关闭当前项目
        pendingXml,              // 待加载的 XML/JSON 数据
        clearPendingXml: () => setPendingXml(null),
        savePrompt,              // 保存提示框状态
        checkDirtyAndRun,        // 检查脏数据并执行操作 (用于安全关闭项目)
        handleSaveConfirm,       // 确认保存的回调
        handleDontSave,          // 不保存的回调
        handleCancelPrompt,      // 取消关闭操作
        isLoading,
        setIsLoading
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
