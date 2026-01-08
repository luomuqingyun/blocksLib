/**
 * 保存提示弹窗逻辑 Hook (Save Prompt Modal Logic Hook)
 * 
 * 管理未保存更改时的用户确认流程。
 */
/// <reference types="../vite-env" />
import { useState, useCallback } from 'react';

interface SavePromptState {
    isOpen: boolean;
    pendingAction: (() => void) | null;
}

interface SavePromptConfig {
    /** 当前是否有未保存的更改 */
    isDirty: boolean;
    /** 保存项目的函数 */
    saveProject: () => Promise<void>;
    /** 丢弃备份的函数 */
    discardBackup: () => Promise<void>;
}

interface SavePromptResult {
    /** 弹窗状态 */
    savePrompt: SavePromptState;
    /** 检查脏状态并执行操作 */
    checkDirtyAndRun: (action: () => void) => void;
    /** 确认保存后继续 */
    handleSaveConfirm: () => Promise<void>;
    /** 不保存直接继续 */
    handleDontSave: () => Promise<void>;
    /** 取消操作 */
    handleCancelPrompt: () => void;
}

/**
 * 管理保存提示弹窗的显示和用户交互
 */
export function useSavePrompt(config: SavePromptConfig): SavePromptResult {
    const { isDirty, saveProject, discardBackup } = config;

    const [savePrompt, setSavePrompt] = useState<SavePromptState>({
        isOpen: false,
        pendingAction: null
    });

    /**
     * 检查是否有未保存更改，如有则显示提示，否则直接执行操作
     */
    const checkDirtyAndRun = useCallback((action: () => void) => {
        if (isDirty) {
            setSavePrompt({ isOpen: true, pendingAction: action });
        } else {
            action();
        }
    }, [isDirty]);

    /**
     * 用户选择"保存"
     */
    const handleSaveConfirm = useCallback(async () => {
        await saveProject();
        if (savePrompt.pendingAction) {
            savePrompt.pendingAction();
        }
        setSavePrompt({ isOpen: false, pendingAction: null });
    }, [saveProject, savePrompt]);

    /**
     * 用户选择"不保存"
     */
    const handleDontSave = useCallback(async () => {
        // 丢弃备份文件
        await discardBackup();

        if (savePrompt.pendingAction) {
            savePrompt.pendingAction();
        }
        setSavePrompt({ isOpen: false, pendingAction: null });
    }, [discardBackup, savePrompt]);

    /**
     * 用户选择"取消"
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
