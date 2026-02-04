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
    /** 当前选中的开发板 ID */
    selectedBoard: string;
    /** 设置选中开发板 */
    setSelectedBoard: (boardId: string) => void;
    /** 编译/上传输出的实时日志流 */
    logs: string[];
    /** 是否正处于编译或上传过程中 */
    isBuilding: boolean;
    /** 异步触发项目编译 */
    buildProject: () => Promise<void>;
    /** 异步触发项目上传至指定端口 */
    uploadProject: (selectedPort: string) => Promise<void>;
}

const BuildContext = createContext<BuildContextType | undefined>(undefined);

export const BuildProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { code, currentFilePath, projectMetadata, updateProjectBoard } = useFileSystem();
    const { setActiveTab } = useUI();
    const { isConnected: isSerialConnected, selectedPort: serialPort, toggleSerial } = useSerial();

    // [OPTIMIZATION] 不要在这里直接调用 BoardRegistry.getAll()，这会触发全量板卡初始化
    const [selectedBoard, _setLocalSelectedBoard] = useState('uno');
    const [logs, setLogs] = useState<string[]>([]);
    const [isBuilding, setIsBuilding] = useState(false);

    // ========== Effect: 加载项目时同步元数据中的开发板 ==========
    useEffect(() => {
        // 仅在 boardId 确实发生变化且与本地状态不一致时更新
        // 从而防止父组件频繁渲染导致的潜在循环更新
        if (projectMetadata?.boardId && projectMetadata.boardId !== selectedBoard) {
            _setLocalSelectedBoard(projectMetadata.boardId);
        }
    }, [projectMetadata?.boardId, selectedBoard]);

    /** 设置当前选中的开发板 */
    const setSelectedBoard = useCallback((boardId: string) => {
        // 1. 更新本地状态，以便 UI 立即响应
        _setLocalSelectedBoard(boardId);
        // 2. 同步更新项目元数据 (实现持久化保存)
        updateProjectBoard(boardId);
    }, [updateProjectBoard]);

    /** 获取项目根目录 (基于当前文件路径) */
    const getProjectRoot = () => {
        if (!currentFilePath) return undefined;
        // 简单的正则表达式提取，支持正斜杠和反斜杠
        return currentFilePath.replace(/[/\\][^/\\]+$/, '');
    };

    /** 
     * 核心 Helper: 将开发板默认配置与项目覆盖配置合并
     * 生成用于传递给 Electron/PlatformIO 的最终配置对象
     */
    const getEffectiveConfig = useCallback(() => {
        const boardConfig = BoardRegistry.get(selectedBoard);
        if (!boardConfig) return null;

        // 获取开发板的基础编译配置 (envName, board, platform, framework 等)
        const base = boardConfig.build || { envName: 'unknown', board: selectedBoard, platform: 'unknown', framework: 'arduino' };

        // 如果没有项目级的配置覆盖，直接返回基础配置
        if (!projectMetadata?.buildConfig) return base;

        const project = projectMetadata.buildConfig;
        const mixed = { ...base };

        // 1. 合并编译标志 (Build Flags)
        let flagsIds: string[] = [];
        // 首先保留开发板默认的编译标志
        if (typeof mixed['build_flags'] === 'string') {
            flagsIds = mixed['build_flags'].split(' ').filter(x => x);
        }

        // 追加项目设置中的优化等级、C++ 标准及额外标志
        if (project.optimizationLevel) flagsIds.push(project.optimizationLevel);
        if (project.cppStandard) flagsIds.push(project.cppStandard);
        if (project.extraBuildFlags && Array.isArray(project.extraBuildFlags)) {
            flagsIds.push(...project.extraBuildFlags);
        }
        // 将合并后的数组重新转为空格分隔的字符串
        if (flagsIds.length > 0) mixed['build_flags'] = flagsIds.join(' ');

        // 2. 合并库依赖 (Lib Deps)
        if (project.lib_deps && Array.isArray(project.lib_deps) && project.lib_deps.length > 0) {
            // 将数组形式的依赖项转为逗号分隔的字符串
            mixed['lib_deps'] = project.lib_deps.join(', ');
        }

        // 3. 上传与监控配置 (Upload/Monitor)
        // 如果用户指定了上传协议（且不是默认值），则覆盖默认值
        if (project.upload_protocol && project.upload_protocol !== 'default') {
            mixed['upload_protocol'] = project.upload_protocol;
        }

        // 处理上传接口标志 (Interface Flags，如 SWD/JTAG 切换)
        if (project.upload_interface) {
            let interfaceFlags = '';
            // J-Link 特有的传输层设置
            if (project.upload_protocol === 'jlink') {
                interfaceFlags = `-transport ${project.upload_interface.toUpperCase()}`;
            }
            // ST-Link / OpenOCD 特有的传输层设置
            else if (project.upload_protocol === 'stlink') {
                interfaceFlags = `-c transport select ${project.upload_interface.toLowerCase()}`;
            }

            if (interfaceFlags) {
                // 将接口标志合并进现有的 upload_flags 中
                const existing = mixed['upload_flags'] || '';
                mixed['upload_flags'] = existing ? `${existing} ${interfaceFlags}` : interfaceFlags;
            }
        }

        // 设置调试工具、串口波特率和上传速度
        if (project.debug_tool) {
            mixed['debug_tool'] = project.debug_tool;
        }
        if (project.monitor_speed) mixed['monitor_speed'] = project.monitor_speed;
        if (project.upload_speed) mixed['upload_speed'] = project.upload_speed;

        // [核心修复] 允许项目配置覆盖关键 PIO 标识 (用于 local_patch)
        if (project.board) mixed['board'] = project.board;
        if (project.platform) mixed['platform'] = project.platform;
        if (project.framework) mixed['framework'] = project.framework;
        if (project.local_patch !== undefined) mixed['local_patch'] = project.local_patch;

        // 4. 处理自定义 INI 内容 (追加自定义配置)
        if (project.customIni) {
            mixed['custom_ini_content'] = project.customIni;
        }

        return mixed;
    }, [selectedBoard, projectMetadata]);

    /** 触发项目编译 */
    const buildProject = useCallback(async () => {
        if (!window.electronAPI) return;
        setLogs([]); // 清空上次日志
        setActiveTab('build'); // 切换到编译日志选项卡
        setIsBuilding(true); // 设置编译状态
        try {
            const config = getEffectiveConfig();
            if (!config) {
                setLogs(prev => [...prev, `错误: 未找到开发板 ${selectedBoard} 的配置`]);
                return;
            }
            // 异步调用 Electron API 执行 PlatformIO 编译
            await window.electronAPI.buildProject(code, config, getProjectRoot());
        } catch (e: any) {
            setLogs(prev => [...prev, `编译过程中出错: ${e.message}`]);
        } finally {
            setIsBuilding(false);
        }
    }, [code, getEffectiveConfig, setActiveTab, getProjectRoot]);

    /** 触发项目上传 (烧录) */
    const uploadProject = useCallback(async (targetPort: string) => {
        if (!window.electronAPI) return;
        setLogs([]);
        setActiveTab('build');
        setIsBuilding(true);

        // 冲突检查: 如果 Web 串口监视器当前正占用该端口，需先暂停
        let wasConnected = false;
        if (isSerialConnected && serialPort === targetPort) {
            setLogs(prev => [...prev, `[系统] 正在暂停串口监视器以进行上传...`]);
            await toggleSerial(); // 关闭串口
            wasConnected = true;
        }

        try {
            const config = getEffectiveConfig();
            if (!config) {
                setLogs(prev => [...prev, `错误: 未找到开发板 ${selectedBoard} 的配置`]);
                return;
            }
            // 调用 Electron API 执行烧录
            await window.electronAPI.uploadProject(code, config, targetPort, getProjectRoot());
        } catch (e: any) {
            setLogs(prev => [...prev, `上传过程中出错: ${e.message}`]);
        } finally {
            setIsBuilding(false);
            // 恢复串口监视器连接
            if (wasConnected) {
                setLogs(prev => [...prev, `[系统] 正在恢复串口监视器...`]);
                // 延迟一小段时间，等待 PlatformIO 完全释放串口设备
                setTimeout(async () => {
                    await toggleSerial(); // 重新打开
                }, 500);
            }
        }
    }, [code, getEffectiveConfig, setActiveTab, getProjectRoot, isSerialConnected, serialPort, toggleSerial]);

    // ========== Effect: 监听来自主进程的编译日志并自动切换标签页 ==========
    useEffect(() => {
        if (window.electronAPI) {
            const cleanupLogs = window.electronAPI.onLog((msg: string) => {
                setLogs(prev => [...prev, msg]);
                setActiveTab('build'); // 收到新日志时自动聚焦到编译面板
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
