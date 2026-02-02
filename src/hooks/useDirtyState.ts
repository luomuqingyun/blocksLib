/**
 * 脏状态管理 Hook (Dirty State Management Hook)
 * 
 * 管理项目的未保存状态、工作区版本和自动备份机制。
 */
/// <reference types="../vite-env" />
import { useState, useCallback, useEffect } from 'react';
import { BlocklyWrapperHandle } from '../components/BlocklyWrapper';

interface DirtyStateConfig {
    /** 当前项目路径 */
    currentFilePath: string | null;
    /** Blockly 工作区引用 */
    blocklyRef: React.RefObject<BlocklyWrapperHandle>;
    /** 获取当前代码 */
    getCode: () => string;
    /** 获取项目元数据 */
    getProjectMetadata: () => { boardId?: string; buildConfig?: any } | null;
}

interface DirtyStateResult {
    /** 是否有未保存的更改 */
    isDirty: boolean;
    /** 设置脏状态 */
    setIsDirty: (dirty: boolean) => void;
    /** 标记工作区已修改 (触发备份) */
    markWorkspaceDirty: () => void;
    /** 工作区版本号 (用于备份触发) */
    workspaceVersion: number;
}

/**
 * 管理项目脏状态和自动备份
 */
/**
 * 管理项目脏状态、版本控制和自动备份的核心 Hook
 */
export function useDirtyState(config: DirtyStateConfig): DirtyStateResult {
    const { currentFilePath, blocklyRef, getCode, getProjectMetadata } = config;

    // isDirty: 标记项目是否有未保存的更改
    const [isDirty, setIsDirty] = useState<boolean>(false);

    // workspaceVersion: 追踪工作区的更改次数
    // 每次积木变动或配置修改都会递增此值，从而触发 useEffect 进行备份
    const [workspaceVersion, setWorkspaceVersion] = useState<number>(0);

    /**
     * 标记工作区为“脏”并触发新的版本
     * 此方法通常在积木块变动监听器（Blockly Listener）中被调用
     */
    const markWorkspaceDirty = useCallback(() => {
        setIsDirty(true);
        setWorkspaceVersion(v => v + 1);
    }, []);

    // ============================================================
    // 自动备份机制 (Auto-Backup Mechanism)
    // ============================================================
    // 实现原理：
    // 每当工作区版本 (workspaceVersion) 发生变化且处于 dirty 状态时，
    // 会设置一个极短时间的计时器。如果短时间内没有新的变动，则向主进程发送备份请求。
    useEffect(() => {
        // 如果没有修改、没有项目路径或环境不支持 IPC，则跳过
        if (!isDirty || !currentFilePath || !window.electronAPI) return;

        const timer = setTimeout(async () => {
            const state = blocklyRef.current?.getXml();
            if (!state) return;

            const metadata = getProjectMetadata();
            console.log(`[useDirtyState] Triggering Auto-Backup (Ver: ${workspaceVersion})`);

            // 执行异步备份：保存 XML 结构、源码以及配置元数据
            await window.electronAPI.backupProject(currentFilePath, {
                blocklyState: state,
                code: getCode(),
                boardId: metadata?.boardId || '',
                buildConfig: metadata?.buildConfig
            });
        }, 50); // 使用 50ms 超短抖动时间，由于备份操作通常是向硬盘写入 .swp 文件，这样可以确保数据极速同步

        // 清理函数：如果 50ms 内发生了新的输入，取消上一次备份排队
        return () => clearTimeout(timer);
    }, [isDirty, workspaceVersion, currentFilePath, blocklyRef, getCode, getProjectMetadata]);

    // ============================================================
    // 窗口关闭前强制备份 (Force Backup on Window Exit)
    // ============================================================
    // 核心逻辑：
    // 当用户由于意外点击关闭按钮或刷新浏览器导致组件卸载时，
    // 强制同步保存一次当前的 XML 状态到备份文件，防止最后一秒的劳动成果丢失。
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isDirty && currentFilePath && window.electronAPI && blocklyRef.current) {
                const state = blocklyRef.current.getXml();
                if (state) {
                    const metadata = getProjectMetadata();
                    // 注意：此处是同步触发 IPC 消息发送，保证在进程销毁前送达
                    window.electronAPI.backupProject(currentFilePath, {
                        blocklyState: state,
                        code: getCode(),
                        boardId: metadata?.boardId || '',
                        buildConfig: metadata?.buildConfig
                    });
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, currentFilePath, blocklyRef, getCode, getProjectMetadata]);

    return {
        isDirty,
        setIsDirty,
        markWorkspaceDirty,
        workspaceVersion
    };
}
