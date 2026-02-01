/**
 * ============================================================
 * 编译构建上下文 (Build Context)
 * ============================================================
 * 
 * 管理编译和上传的全局状态:
 * - selectedBoard: 当前选择的开发板 ID
 * - logs: 编译输出日志
 * - isBuilding: 是否正在编译/上传
 * - buildProject(): 触发编译
 * - uploadProject(): 触发上传
 * 
 * 配置合并逻辑:
 * 1. 从 BoardRegistry 获取板卡默认配置
 * 2. 合并项目级别的 buildConfig 覆盖配置
 * 3. 生成最终的 PlatformIO 配置
 * 
 * @file src/contexts/BuildContext.tsx
 * @module EmbedBlocks/Frontend/Contexts/Build
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BoardRegistry } from '../registries/BoardRegistry';
import { useFileSystem } from './FileSystemContext';
import { useUI } from './UIContext';
import { useSerial } from './SerialContext';

/** 编译上下文类型定义 */
interface BuildContextType {

    selectedBoard: string;
    setSelectedBoard: (boardId: string) => void;
    logs: string[];
    isBuilding: boolean;
    buildProject: () => Promise<void>;
    uploadProject: (selectedPort: string) => Promise<void>;
}

const BuildContext = createContext<BuildContextType | undefined>(undefined);

export const BuildProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { code, currentFilePath, projectMetadata, updateProjectBoard } = useFileSystem();
    const { setActiveTab } = useUI();
    const { isConnected: isSerialConnected, selectedPort: serialPort, toggleSerial } = useSerial();

    const [selectedBoard, _setLocalSelectedBoard] = useState(BoardRegistry.getAll()[0].id);
    const [logs, setLogs] = useState<string[]>([]);
    const [isBuilding, setIsBuilding] = useState(false);

    // Sync state with Project Metadata when loaded
    useEffect(() => {
        // Only update if boardId actually changed and is different from local state
        // This prevents potential loops if parent re-renders significantly
        if (projectMetadata?.boardId && projectMetadata.boardId !== selectedBoard) {
            // console.log('[Build] Syncing selectedBoard from metadata:', projectMetadata.boardId);
            _setLocalSelectedBoard(projectMetadata.boardId);
        }
    }, [projectMetadata?.boardId, selectedBoard]);

    const setSelectedBoard = useCallback((boardId: string) => {
        // 1. Update local state for immediate UI feedback
        _setLocalSelectedBoard(boardId);
        // 2. Propagate to Project Metadata (Persist)
        updateProjectBoard(boardId);
    }, [updateProjectBoard]);

    // Helper to get project root directory
    const getProjectRoot = () => {
        if (!currentFilePath) return undefined;
        // Simple directory extraction handling both separators
        return currentFilePath.replace(/[/\\][^/\\]+$/, '');
    };

    // Helper: Merge Board defaults with Project Overrides
    const getEffectiveConfig = useCallback(() => {
        const boardConfig = BoardRegistry.get(selectedBoard);
        if (!boardConfig) return null;

        const base = boardConfig.build || { envName: 'unknown', board: selectedBoard, platform: 'unknown', framework: 'arduino' };

        // If no project overrides, return base
        if (!projectMetadata?.buildConfig) return base;

        const project = projectMetadata.buildConfig;
        const mixed = { ...base };

        // 1. Build Flags
        let flagsIds: string[] = [];
        if (mixed['build_flags']) {
            flagsIds = mixed['build_flags'].split(' ').filter(x => x);
        }

        if (project.optimizationLevel) flagsIds.push(project.optimizationLevel);
        if (project.cppStandard) flagsIds.push(project.cppStandard);
        if (project.extraBuildFlags && Array.isArray(project.extraBuildFlags)) {
            flagsIds.push(...project.extraBuildFlags);
        }
        if (flagsIds.length > 0) mixed['build_flags'] = flagsIds.join(' ');

        // 2. Lib Deps
        if (project.lib_deps && Array.isArray(project.lib_deps) && project.lib_deps.length > 0) {
            mixed['lib_deps'] = project.lib_deps.join(', ');
        }

        // 3. Upload/Monitor
        if (project.upload_protocol && project.upload_protocol !== 'default') {
            mixed['upload_protocol'] = project.upload_protocol;
        }

        // Handle Interface Flags
        if (project.upload_interface) {
            let interfaceFlags = '';
            // J-Link specific
            if (project.upload_protocol === 'jlink') {
                interfaceFlags = `-transport ${project.upload_interface.toUpperCase()}`;
            }
            // ST-Link / OpenOCD specific
            else if (project.upload_protocol === 'stlink') {
                interfaceFlags = `-c transport select ${project.upload_interface.toLowerCase()}`;
            }

            if (interfaceFlags) {
                // Merge into upload_flags
                const existing = mixed['upload_flags'] || '';
                mixed['upload_flags'] = existing ? `${existing} ${interfaceFlags}` : interfaceFlags;
            }
        }

        if (project.debug_tool) {
            mixed['debug_tool'] = project.debug_tool;
        }
        if (project.debug_tool) {
            mixed['debug_tool'] = project.debug_tool;
        }
        if (project.monitor_speed) mixed['monitor_speed'] = project.monitor_speed;
        if (project.upload_speed) mixed['upload_speed'] = project.upload_speed;

        // 4. Custom INI
        if (project.customIni) {
            mixed['custom_ini_content'] = project.customIni;
        }

        return mixed;
    }, [selectedBoard, projectMetadata]);

    const buildProject = useCallback(async () => {
        if (!window.electronAPI) return;
        setLogs([]);
        setActiveTab('build');
        setIsBuilding(true);
        try {
            const config = getEffectiveConfig();
            if (!config) {
                setLogs(prev => [...prev, `Error: Board ${selectedBoard} not found`]);
                return;
            }
            // console.log('[Build] Using Config:', config);
            await window.electronAPI.buildProject(code, config, getProjectRoot());
        } catch (e: any) {
            setLogs(prev => [...prev, `Build Error: ${e.message}`]);
        } finally {
            setIsBuilding(false);
        }
    }, [code, getEffectiveConfig, setActiveTab, getProjectRoot]);

    const uploadProject = useCallback(async (targetPort: string) => {
        if (!window.electronAPI) return;
        setLogs([]);
        setActiveTab('build');
        setIsBuilding(true);

        // Collision Check: Web Serial
        let wasConnected = false;
        if (isSerialConnected && serialPort === targetPort) {
            setLogs(prev => [...prev, `[System] Pausing Serial Monitor for Upload...`]);
            await toggleSerial(); // Close
            wasConnected = true;
        }

        try {
            const config = getEffectiveConfig();
            if (!config) {
                setLogs(prev => [...prev, `Error: Board ${selectedBoard} not found`]);
                return;
            }
            await window.electronAPI.uploadProject(code, config, targetPort, getProjectRoot());
        } catch (e: any) {
            setLogs(prev => [...prev, `Upload Error: ${e.message}`]);
        } finally {
            setIsBuilding(false);
            // Restore Serial
            if (wasConnected) {
                setLogs(prev => [...prev, `[System] Resuming Serial Monitor...`]);
                // We need to wait a bit for port to be released by PIO? 
                // Usually PIO exits, but port might take ms to free.
                setTimeout(async () => {
                    await toggleSerial(); // Re-open
                }, 500);
            }
        }
    }, [code, getEffectiveConfig, setActiveTab, getProjectRoot, isSerialConnected, serialPort, toggleSerial]);

    useEffect(() => {
        if (window.electronAPI) {
            const cleanupLogs = window.electronAPI.onLog((msg: string) => {
                setLogs(prev => [...prev, msg]);
                setActiveTab('build'); // Auto focus on new logs
            });
            return () => { cleanupLogs(); };
        }
    }, [setActiveTab]);

    const value = {
        selectedBoard, setSelectedBoard,
        logs,
        isBuilding,
        buildProject,
        uploadProject
    };

    return (
        <BuildContext.Provider value={value}>
            {children}
        </BuildContext.Provider>
    );
};

export const useBuild = () => {
    const context = useContext(BuildContext);
    if (context === undefined) {
        throw new Error('useBuild must be used within a BuildProvider');
    }
    return context;
};
