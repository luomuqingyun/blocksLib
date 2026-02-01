/**
 * ============================================================
 * 工具栏操作聚合 Hook (Toolbar Actions Hook)
 * ============================================================
 * 
 * 聚合工具栏所需的多个 Context 操作，减少组件对 Context 的直接依赖。
 * 将 TopBar 从 4 个 Context 14 个方法的直接调用简化为单一 Hook 调用。
 * 
 * 聚合的 Context:
 * - SerialContext: 串口相关状态和操作
 * - FileSystemContext: 项目相关状态和操作  
 * - UIContext: UI 模态框控制
 * - BuildContext: 编译构建操作
 * 
 * @file src/hooks/useToolbarActions.ts
 * @module EmbedBlocks/Frontend/Hooks
 */

import { useCallback } from 'react';
import { useSerial } from '../contexts/SerialContext';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useUI } from '../contexts/UIContext';
import { useBuild } from '../contexts/BuildContext';

/**
 * 串口相关状态和操作
 */
interface SerialState {
    ports: Array<{ path: string; friendlyName?: string; manufacturer?: string }>;
    selectedPort: string;
    setSelectedPort: (port: string) => void;
    refreshPorts: () => void;
}

/**
 * 项目相关状态和操作
 */
interface ProjectState {
    projectMetadata: { name?: string; boardId?: string } | null;
    newProject: () => void;
    openProject: () => void;
    saveProject: () => void;
    saveProjectAs: () => void;
    closeProject: () => void;
    exportCode: () => void;
    importBlocklyJson: () => void;
    updateProjectBoard: (boardId: string) => void;
}

/**
 * 构建相关状态和操作
 */
interface BuildState {
    selectedBoard: string;
    setSelectedBoard: (boardId: string) => void;
    buildProject: () => Promise<void>;
    uploadProject: (port: string) => Promise<void>;
}

/**
 * UI 相关操作
 */
interface UIActions {
    openSettings: () => void;
    openExtensions: () => void;
    openProjectSettings: () => void;
}

/**
 * useToolbarActions Hook 返回类型
 */
export interface ToolbarActionsResult {
    serial: SerialState;
    project: ProjectState;
    build: BuildState;
    ui: UIActions;
}

/**
 * 聚合工具栏所需的所有 Context 操作
 * 
 * @example
 * const { serial, project, build, ui } = useToolbarActions();
 * 
 * // 使用串口操作
 * <select value={serial.selectedPort} onChange={e => serial.setSelectedPort(e.target.value)}>
 * 
 * // 使用项目操作
 * <button onClick={project.saveProject}>Save</button>
 * 
 * // 使用构建操作
 * <button onClick={build.buildProject}>Build</button>
 */
export function useToolbarActions(): ToolbarActionsResult {
    // 获取各 Context
    const { ports, selectedPort, setSelectedPort, refreshPorts } = useSerial();
    const {
        newProject, openProject, saveProject, saveProjectAs,
        exportCode, importBlocklyJson, projectMetadata,
        closeProject, updateProjectBoard
    } = useFileSystem();
    const { setIsSettingsOpen, setIsExtensionsOpen, setIsProjectSettingsOpen } = useUI();
    const { selectedBoard, setSelectedBoard, buildProject, uploadProject } = useBuild();

    // UI 操作包装
    const openSettings = useCallback(() => setIsSettingsOpen(true), [setIsSettingsOpen]);
    const openExtensions = useCallback(() => setIsExtensionsOpen(true), [setIsExtensionsOpen]);
    const openProjectSettings = useCallback(() => setIsProjectSettingsOpen(true), [setIsProjectSettingsOpen]);

    return {
        serial: {
            ports,
            selectedPort,
            setSelectedPort,
            refreshPorts,
        },
        project: {
            projectMetadata,
            newProject,
            openProject,
            saveProject,
            saveProjectAs,
            closeProject,
            exportCode,
            importBlocklyJson,
            updateProjectBoard,
        },
        build: {
            selectedBoard,
            setSelectedBoard,
            buildProject,
            uploadProject,
        },
        ui: {
            openSettings,
            openExtensions,
            openProjectSettings,
        },
    };
}

export default useToolbarActions;
