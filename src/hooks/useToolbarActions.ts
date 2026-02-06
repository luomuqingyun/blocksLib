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
}

/**
 * 构建相关状态和操作
 */
interface BuildState {
    selectedBoard: string;
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
    build: BuildState & { config: any; updateConfig: (key: string, value: any) => void };
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
    // 1. 从各 Context 中解构所需的状态和方法

    // 串口 Context: 管理串口列表、选中端口及刷新逻辑
    const { ports, selectedPort, setSelectedPort, refreshPorts } = useSerial();

    // 文件系统 Context: 管理项目生命周期 (新建、打开、保存、导出、元数据)
    const {
        newProject, openProject, saveProject, saveProjectAs,
        exportCode, importBlocklyJson, projectMetadata,
        closeProject
    } = useFileSystem();

    // UI Context: 控制各类设置与扩展模态框的显示
    const { setIsSettingsOpen, setIsExtensionsOpen, setIsProjectSettingsOpen } = useUI();

    // 编译构建 Context: 管理目标板卡、执行编译及上传任务
    const { selectedBoard, buildProject, uploadProject, config, setConfig } = useBuild();

    const updateConfig = useCallback(async (key: string, value: any) => {
        await window.electronAPI.setConfig(key, value);
        setConfig((prev: any) => {
            const newState = { ...prev };
            if (key.includes('.')) {
                const keys = key.split('.');
                let target = newState;
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!target[keys[i]]) target[keys[i]] = {};
                    target = target[keys[i]];
                }
                target[keys[keys.length - 1]] = value;
            } else {
                newState[key] = value;
            }
            return newState;
        });
        window.dispatchEvent(new Event('embedblocks:config-updated'));
    }, [setConfig]);

    // 2. UI 操作包装 (使用 useCallback 确保引用稳定)

    /** 打开全局设置模态框 */
    const openSettings = useCallback(() => setIsSettingsOpen(true), [setIsSettingsOpen]);

    /** 打开组件/扩展市场模态框 */
    const openExtensions = useCallback(() => setIsExtensionsOpen(true), [setIsExtensionsOpen]);

    /** 打开当前项目的特定配置（如编译参数、板卡选项） */
    const openProjectSettings = useCallback(() => setIsProjectSettingsOpen(true), [setIsProjectSettingsOpen]);

    // 3. 聚合并导出包含所有模块的单一对象
    return {
        // 串口模块
        serial: {
            ports,
            selectedPort,
            setSelectedPort,
            refreshPorts,
        },
        // 项目管理模块
        project: {
            projectMetadata,
            newProject,
            openProject,
            saveProject,
            saveProjectAs,
            closeProject,
            exportCode,
            importBlocklyJson,
        },
        // 编译上传模块
        build: {
            selectedBoard,
            buildProject,
            uploadProject,
            config,
            updateConfig
        },
        // UI 交互模块
        ui: {
            openSettings,
            openExtensions,
            openProjectSettings,
        },
    };
}

export default useToolbarActions;
