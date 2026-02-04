/**
 * ============================================================
 * 自动备份 Hook (Auto Backup Hook)
 * ============================================================
 * 
 * 管理项目的自动备份机制:
 * - 脏状态变化后延迟 3 秒触发备份
 * - 窗口关闭/刷新前强制备份
 * - 生成 .swp 临时文件，防止意外丢失
 * 
 * @file src/hooks/project/useAutoBackup.ts
 * @module EmbedBlocks/Frontend/Hooks/Project
 */

import { useEffect } from 'react';
import { BlocklyWrapperHandle } from '../../components/BlocklyWrapper';

/**
 * 自动备份 Hooks 的参数接口
 */
interface AutoBackupProps {
    isDirty: boolean;           // 项目是否有未保存的更改
    currentFilePath: string | null; // 当前项目的文件路径
    workspaceVersion: number;   // 工作区版本号，用于追踪更改
    code: string;               // 当前生成的代码内容
    projectMetadata: any;       // 项目元数据（如板卡配置等）
    blocklyRef: React.RefObject<BlocklyWrapperHandle>; // Blockly 包装器的引用，用于导出 XML
    isLoading?: boolean;        // [新] 是否正在加载中（锁定写操作）
}

/**
 * 自动备份钩子
 * 当检测到项目内容变化时，自动在后台进行防抖备份，并在退出前强制备份。
 */
export const useAutoBackup = (props: AutoBackupProps) => {
    const { isDirty, currentFilePath, workspaceVersion, code, projectMetadata, blocklyRef, isLoading } = props;

    // 1. 自动备份机制 (带防抖逻辑)
    // 当积木块、代码或元数据发生变化且处于 "已修改" (Dirty) 状态时触发。
    useEffect(() => {
        // 如果正在加载、没有更改、没有文件路径或处于非 Electron 环境，则不执行备份
        // [关键修复] 严禁在加载锁开启时进行备份，防止空状态覆盖文件
        if (isLoading || !isDirty || !currentFilePath || !window.electronAPI) return;

        // 设置 3 秒防抖，避免频繁磁盘操作
        const timer = setTimeout(async () => {
            const state = blocklyRef.current?.getXml();
            if (!state) return;

            console.log(`[AutoBackup] Triggering Backup (Ver: ${workspaceVersion})`);

            // 调用 Electron API 执行静默备份（通常生成 .swp 或临时文件）
            await window.electronAPI.backupProject(currentFilePath, {
                blocklyState: state,
                code: code,
                boardId: projectMetadata?.boardId || '',
                buildConfig: projectMetadata?.buildConfig
            });
        }, 3000); // 3秒延迟

        // 清理函数：如果用户继续操作，则取消上一次的延时任务
        return () => clearTimeout(timer);
    }, [isDirty, workspaceVersion, currentFilePath, code, projectMetadata, blocklyRef, isLoading]);

    // 2. 窗口退出/刷新时的强制备份
    useEffect(() => {
        const handleBeforeUnload = () => {
            // [关键修复] 只有在非加载且脏数据状态下才允许备份
            if (!isLoading && isDirty && currentFilePath && window.electronAPI && blocklyRef.current) {
                const state = blocklyRef.current.getXml();
                // ... (保持原逻辑)
                if (state) {
                    window.electronAPI.backupProject(currentFilePath, {
                        blocklyState: state,
                        code: code,
                        boardId: projectMetadata?.boardId || '',
                        buildConfig: projectMetadata?.buildConfig
                    });
                }
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, currentFilePath, code, projectMetadata, blocklyRef, isLoading]);
};
