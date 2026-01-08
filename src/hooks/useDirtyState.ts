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
export function useDirtyState(config: DirtyStateConfig): DirtyStateResult {
    const { currentFilePath, blocklyRef, getCode, getProjectMetadata } = config;

    const [isDirty, setIsDirty] = useState<boolean>(false);
    const [workspaceVersion, setWorkspaceVersion] = useState<number>(0);

    /**
     * 标记工作区为脏状态并递增版本号
     * 版本号变化会触发自动备份
     */
    const markWorkspaceDirty = useCallback(() => {
        setIsDirty(true);
        setWorkspaceVersion(v => v + 1);
    }, []);

    // ============================================================
    // 自动备份机制 (Auto-Backup Mechanism)
    // ============================================================

    useEffect(() => {
        if (!isDirty || !currentFilePath || !window.electronAPI) return;

        const timer = setTimeout(async () => {
            const state = blocklyRef.current?.getXml();
            if (!state) return;

            const metadata = getProjectMetadata();
            console.log(`[useDirtyState] Triggering Auto-Backup (Ver: ${workspaceVersion})`);

            await window.electronAPI.backupProject(currentFilePath, {
                blocklyState: state,
                code: getCode(),
                boardId: metadata?.boardId || '',
                buildConfig: metadata?.buildConfig
            });
        }, 50); // 高频备份确保数据安全

        return () => clearTimeout(timer);
    }, [isDirty, workspaceVersion, currentFilePath, blocklyRef, getCode, getProjectMetadata]);

    // ============================================================
    // 窗口关闭前强制备份 (Force Backup on Window Exit)
    // ============================================================

    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isDirty && currentFilePath && window.electronAPI && blocklyRef.current) {
                const state = blocklyRef.current.getXml();
                if (state) {
                    const metadata = getProjectMetadata();
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
