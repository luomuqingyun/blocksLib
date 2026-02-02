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

/** 项目元数据接口 */
interface ProjectMetadata {
    version: string;        // 项目版本
    name: string;           // 项目名称
    boardId: string;        // 开发板 ID (如 arduino:avr:uno)
    createdAt: number;      // 创建时间戳
    lastModified: number;   // 最后修改时间戳
    buildConfig?: any;      // 编译配置（自定义编译标志、库等）
}

/** 项目整体状态接口 */
export interface ProjectState {
    path: string | null;            // 项目所在的物理路径
    metadata: ProjectMetadata | null; // 项目元数据
    isDirty: boolean;               // 是否有未保存的更改
    code: string;                   // 当前生成的 C++ 代码
}

/** useProjectOps 钩子的参数接口 */
interface ProjectOpsProps {
    blocklyRef: React.RefObject<BlocklyWrapperHandle>; // Blockly 控制引用的句柄
    projectState: ProjectState;                        // 当前项目状态
    setPath: (path: string | null) => void;           // 设置路径的回调
    setMetadata: (metadata: ProjectMetadata | null) => void; // 设置元数据的回调
    setIsDirty: (dirty: boolean) => void;             // 设置脏状态的回调
    setCode: (code: string) => void;                  // 设置代码内容的回调
    setPendingXml: (xml: string | null) => void;      // 设置待加载 XML 的回调
    markWorkspaceDirty: () => void;                   // 标记工作区为已修改的方法
    setIsNewProjectOpen: (open: boolean) => void;     // 控制“新建项目”模态框
    setIsSaveAsOpen: (open: boolean) => void;         // 控制“另存为”模态框
}

/**
 * 项目操作钩子
 * 提供新建、打开、保存、另存为等核心文件系统操作。
 */
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

    /**
     * 创建新项目
     * 1. 调用 Electron API 创建物理目录和基础文件。
     * 2. 注入默认的“主入口”积木块，确保新项目有初始代码。
     */
    const createNewProject = useCallback(async (name: string, boardId: string, parentDir: string) => {
        if (!window.electronAPI) return { success: false, error: 'Electron API not found' };
        try {
            const boardConfig = BoardRegistry.get(boardId);
            const result = await window.electronAPI.createProject(parentDir, name, boardId, boardConfig?.build);
            if (result.success && result.path) {
                // [修复] 为新项目添加默认的 arduino_entry_root 积木，避免初始代码为空
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

    /**
     * 通过对话框打开项目
     * 包含对“未保存备份 (.swp)”的自动检测和恢复提示。
     */
    const openProject = useCallback(async () => {
        try {
            if (!window.electronAPI) return;
            const result = await window.electronAPI.openProjectFolder();
            if (!result.cancelled && result.projectPath && result.data) {
                const projectPath = result.projectPath;
                let { metadata, xml, code } = result.data;

                // 检查是否存在由于宕机或强制退出留下的备份文件
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
                            // 标记为脏，以便用户在恢复后可以保存
                            setTimeout(() => markWorkspaceDirty(), 500);
                        }
                    } else {
                        // 如果用户放弃备份，则删除它
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

    /**
     * 通过指定路径打开项目（用于最近项目列表）
     */
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

    /**
     * 保存项目
     * 1. 确保项目已有物理路径，否则触发“另存为/新建”。
     * 2. 导出积木块 XML 状态。
     * 3. 智能合并编译配置：将用户自定义标志与板卡默认配置合并，并剔除 'default' 值。
     * 4. 写入磁盘并删除临时备份文件。
     */
    const saveProject = useCallback(async () => {
        if (!window.electronAPI) return;

        if (!currentFilePath) {
            setIsNewProjectOpen(true);
            return;
        }

        const state = blocklyRef.current?.getXml();
        if (!state) return;

        try {
            // 复杂的配置合并逻辑
            let finalBuildConfig = projectMetadata?.buildConfig || {};
            if (projectMetadata?.boardId) {
                const boardDef = BoardRegistry.get(projectMetadata.boardId);
                if (boardDef && boardDef.build) {
                    // 过滤掉值为 'default' 的选项，以避免污染配置
                    const sanitizedUserConfig = { ...finalBuildConfig };
                    Object.keys(sanitizedUserConfig).forEach(key => {
                        if (sanitizedUserConfig[key] === 'default' || sanitizedUserConfig[key] === undefined) {
                            delete sanitizedUserConfig[key];
                        }
                    });

                    // 将板卡默认配置作为基准，用户配置进行覆盖
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

            // 保存成功后，丢弃旧的自动备份文件
            if (currentFilePath && window.electronAPI) {
                await window.electronAPI.discardBackup(currentFilePath);
            }
        } catch (e) { console.error(e); }
    }, [currentFilePath, code, projectMetadata, setIsNewProjectOpen, blocklyRef, setIsDirty]);

    /**
     * 执行“另存为”操作
     * 复制整个项目目录，并更新内部路径和名称。
     */
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
