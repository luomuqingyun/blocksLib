import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../contexts/UIContext';
import { useFileSystem } from '../contexts/FileSystemContext';

export const useAppController = () => {
    const { t, i18n } = useTranslation();
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

    const {
        newProject,
        openProject,
        saveProject,
        saveProjectAs,
        openProjectByPath,
        closeProject,
        checkDirtyAndRun,
        // The prompt states are handled by the SavePromptModal component which listens to context
        // We just need to trigger the actions here
    } = useFileSystem();

    useEffect(() => {
        if (!window.electronAPI) return;

        const cleanup = window.electronAPI.onMenuAction(async (action: string, arg?: any) => {
            console.log(`[AppController] Menu Action: ${action}`, arg);

            switch (action) {
                case 'new':
                    checkDirtyAndRun(() => setIsNewProjectOpen(true));
                    break;
                case 'open':
                    checkDirtyAndRun(() => openProject());
                    break;
                case 'open-recent':
                    if (arg) {
                        checkDirtyAndRun(async () => {
                            const result = await openProjectByPath(arg);
                            if (!result.success) {
                                showNotification(result.error || 'Failed to open project', 'error');

                                // Auto-clean invalid recent paths
                                if (result.error && (result.error.includes('not found') || result.error.includes('ENOENT'))) {
                                    setTimeout(async () => {
                                        if (confirm(i18n.t('welcome.confirmRemoveRecent', { path: arg }))) {
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
                    closeProject();
                    break;
                case 'settings': setIsSettingsOpen(true); break;
                case 'extensions': setIsExtensionsOpen(true); break;
                case 'project-settings': setIsProjectSettingsOpen(true); break;
                case 'new-project-modal': setIsNewProjectOpen(true); break;
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
                case 'toggle-diag':
                    window.dispatchEvent(new CustomEvent('toggle-diagnostic-overlay'));
                    break;
            }
        });

        return cleanup;
    }, [
        newProject, openProject, saveProject, saveProjectAs,
        setIsSettingsOpen, openProjectByPath, closeProject,
        setIsExtensionsOpen, setIsNewProjectOpen, checkDirtyAndRun,
        showNotification, setIsProjectSettingsOpen, i18n
    ]);
};
