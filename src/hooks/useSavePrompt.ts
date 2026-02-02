/**
 * 保存提示弹窗逻辑 Hook (Save Prompt Modal Logic Hook)
 * 
 * 管理未保存更改时的用户确认流程。
 */
/// <reference types="../vite-env" />
import { useState, useCallback } from 'react';

/** 弹窗内部状态接口 */
interface SavePromptState {
    isOpen: boolean;                // 弹窗是否显示
    pendingAction: (() => void) | null; // 用户确认/跳过保存后，接下来要执行的动作
}

/** 钩子配置接口 */
interface SavePromptConfig {
    isDirty: boolean;               // 当前工作区是否有未保存的更改
    saveProject: () => Promise<void>; // 执行保存的回调函数
    discardBackup: () => Promise<void>; // 丢弃临时备份文件（.swp）的回调函数
}

/** 钩子返回结果接口 */
interface SavePromptResult {
    savePrompt: SavePromptState;     // 当前弹窗状态
    checkDirtyAndRun: (action: () => void) => void; // 包装器：执行动作前自动检查脏状态
    handleSaveConfirm: () => Promise<void>; // 用户点击“保存并继续”处理函数
    handleDontSave: () => Promise<void>;    // 用户点击“不保存直接继续”处理函数
    handleCancelPrompt: () => void;         // 用户点击“取消动作”处理函数
}

/**
 * 管理项目退出/关闭时的“保存提示”逻辑。
 * 它作为一个拦截器，确保用户在执行可能导致数据丢失的操作（如新建项目、打开新项目）时，
 * 能够得到妥善的提醒和操作选择。
 */
export function useSavePrompt(config: SavePromptConfig): SavePromptResult {
    const { isDirty, saveProject, discardBackup } = config;

    // 管理弹窗的可见性和暂存动作
    const [savePrompt, setSavePrompt] = useState<SavePromptState>({
        isOpen: false,
        pendingAction: null
    });

    /**
     * 核心检查逻辑 (Interception Logic)
     * 在试图执行一个破坏性动作 (Action) 时，先判断工作区是否被修改过。
     * - 如果没改过：直接执行后续动作。
     * - 如果改过：拦截动作，将其存入 pendingAction 并弹出确认对话框。
     */
    const checkDirtyAndRun = useCallback((action: () => void) => {
        if (isDirty) {
            setSavePrompt({ isOpen: true, pendingAction: action });
        } else {
            action();
        }
    }, [isDirty]);

    /**
     * 情况 A: 用户确认保存
     * 1. 调用保存方法持久化到磁盘。
     * 2. 执行之前被拦截的动作。
     * 3. 关闭弹窗。
     */
    const handleSaveConfirm = useCallback(async () => {
        await saveProject();
        if (savePrompt.pendingAction) {
            savePrompt.pendingAction();
        }
        setSavePrompt({ isOpen: false, pendingAction: null });
    }, [saveProject, savePrompt]);

    /**
     * 情况 B: 用户拒绝保存
     * 1. 显式丢弃由于自动备份机制生成的 .swp 临时文件。
     * 2. 直接执行之前被拦截的动作，丢弃当前内存中的更改。
     * 3. 关闭弹窗。
     */
    const handleDontSave = useCallback(async () => {
        // 由于用户明确表示不保存，需要清理后台自动生成的备份，防止下次打开时被误导恢复
        await discardBackup();

        if (savePrompt.pendingAction) {
            savePrompt.pendingAction();
        }
        setSavePrompt({ isOpen: false, pendingAction: null });
    }, [discardBackup, savePrompt]);

    /**
     * 情况 C: 用户取消操作
     * 保持现状，不执行后续动作，仅关闭弹窗。
     */
    const handleCancelPrompt = useCallback(() => {
        setSavePrompt({ isOpen: false, pendingAction: null });
    }, []);

    return {
        savePrompt,
        checkDirtyAndRun,
        handleSaveConfirm,
        handleDontSave,
        handleCancelPrompt
    };
}
