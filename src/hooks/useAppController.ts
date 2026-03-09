/**
 * ============================================================
 * 应用控制器 Hook (App Controller Hook)
 * ============================================================
 * 
 * 处理菜单栏和快捷键的动作响应:
 * - 新建/打开/保存项目
 * - 打开设置/扩展模态框
 * - 帮助文档入口
 * - 诊断面板切换
 * 
 * 通过 IPC 监听主进程转发的菜单动作。
 * 
 * @file src/hooks/useAppController.ts
 * @module EmbedBlocks/Frontend/Hooks
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../contexts/UIContext';
import { useFileSystem } from '../contexts/FileSystemContext';

/**
 * 应用主控制器钩子
 * 负责监听主进程通过 IPC 发送的菜单指令，并协调各个 Context 执行相应操作。
 */
export const useAppController = () => {
    const { t, i18n } = useTranslation();

    // 从 UI 上下文中解构模态框和通知控制方法
    const {
        setIsNewProjectOpen,
        setIsExtensionsOpen,
        setIsSettingsOpen,
        setIsProjectSettingsOpen,
        isHelpOpen,
        openHelp,
        openAbout,
        showNotification
    } = useUI();

    // 从文件系统上下文中解构核心操作
    const {
        newProject,
        openProject,
        saveProject,
        saveProjectAs,
        openProjectByPath,
        closeProject,
        checkDirtyAndRun,
    } = useFileSystem();

    useEffect(() => {
        if (!window.electronAPI) return;

        // 注册菜单动作监听器
        const cleanup = window.electronAPI.onMenuAction(async (action: string, arg?: any) => {
            console.log(`[AppController] Menu Action: ${action}`, arg);

            switch (action) {
                case 'new':
                    // 新建项目前检查脏标记，提示保存
                    checkDirtyAndRun(() => setIsNewProjectOpen(true));
                    break;
                case 'open':
                    // 打开项目前检查脏标记
                    checkDirtyAndRun(() => openProject());
                    break;
                case 'open-recent':
                    if (arg) {
                        // 打开特定路径的最近项目
                        checkDirtyAndRun(async () => {
                            const result = await openProjectByPath(arg);
                            if (!result.success) {
                                showNotification(result.error || 'Failed to open project', 'error');

                                // 自动清理失效的最近项目路径（如果文件已不存在）
                                if (result.error && (result.error.includes('not found') || result.error.includes('ENOENT'))) {
                                    setTimeout(async () => {
                                        let doRemove = false;
                                        if (window.electronAPI.showConfirmDialog) {
                                            doRemove = await window.electronAPI.showConfirmDialog({
                                                title: 'Project Not Found',
                                                message: i18n.t('welcome.confirmRemoveRecent', { path: arg }),
                                                buttons: ['Cancel', 'Remove'],
                                            });
                                        } else {
                                            doRemove = confirm(i18n.t('welcome.confirmRemoveRecent', { path: arg }));
                                        }

                                        if (doRemove) {
                                            await window.electronAPI.removeRecentProject(arg);
                                        }
                                    }, 500);
                                }
                            }
                        });
                    }
                    break;
                case 'save': saveProject(); break;
                case 'save-as': saveProjectAs(); break;
                case 'close-project':
                    // 关闭当前项目并返回欢迎页
                    closeProject();
                    break;
                case 'settings': setIsSettingsOpen(true); break;
                case 'extensions': setIsExtensionsOpen(true); break;
                case 'project-settings': setIsProjectSettingsOpen(true); break;
                case 'new-project-modal': setIsNewProjectOpen(true); break;

                // --- 帮助菜单系列 ---
                case 'help-user-guide': {
                    const result = await window.electronAPI.readHelpFile('user');
                    openHelp(t('help.userGuide'), result.content, result.path);
                    break;
                }
                case 'help-plugin-guide': {
                    const result = await window.electronAPI.readHelpFile('plugin');
                    openHelp(t('help.pluginGuide'), result.content, result.path);
                    break;
                }
                case 'help-about': {
                    const result = await window.electronAPI.readHelpFile('about');
                    openAbout(result.content);
                    break;
                }
            }
        });

        // 生命周期结束时卸载监听器
        return cleanup;
    }, [
        newProject, openProject, saveProject, saveProjectAs,
        setIsSettingsOpen, openProjectByPath, closeProject,
        setIsExtensionsOpen, setIsNewProjectOpen, checkDirtyAndRun,
        showNotification, setIsProjectSettingsOpen, i18n
    ]);
};
