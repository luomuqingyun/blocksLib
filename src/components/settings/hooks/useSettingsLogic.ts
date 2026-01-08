import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSerial } from '../../../contexts/SerialContext';

/**
 * Hook to manage Settings logic and configuration state.
 */
export const useSettingsLogic = (isOpen: boolean, onClose: () => void) => {
    const { t, i18n } = useTranslation();
    const { reloadHistory } = useSerial();

    const [activeTab, setActiveTab] = useState('general');
    const [isJsonMode, setIsJsonMode] = useState(false);
    const [jsonContent, setJsonContent] = useState('');
    const [config, setConfig] = useState<any>({
        general: { language: 'system', workDir: '' },
        historyLimit: 100,
        toolbox: { hiddenCategories: [] }
    });
    const [jsonError, setJsonError] = useState<string | null>(null);

    const loadConfig = useCallback(async () => {
        const cfg = await window.electronAPI.getConfig();
        if (!cfg.general) cfg.general = { language: 'system', workDir: '' };
        if (!cfg.toolbox) cfg.toolbox = { hiddenCategories: [] };
        setConfig(cfg);
        setJsonContent(JSON.stringify(cfg, null, 4));
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadConfig();
            setIsJsonMode(false);
            setActiveTab('general');
            setJsonError(null);
        }
    }, [isOpen, loadConfig]);

    useEffect(() => {
        try {
            JSON.parse(jsonContent);
            setJsonError(null);
        } catch (e) {
            setJsonError((e as Error).message);
        }
    }, [jsonContent]);

    const handleSave = async (key: string, value: any) => {
        await window.electronAPI.setConfig(key, value);
        if (key === 'serialHistory') {
            await reloadHistory();
        }

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

        if (key === 'general.language') {
            if (value === 'system') {
                i18n.changeLanguage(navigator.language.startsWith('zh') ? 'zh' : 'en');
            } else {
                i18n.changeLanguage(value);
            }
        }

        // Notify app of config changes (e.g. for Toolbox Refresh)
        window.dispatchEvent(new Event('embedblocks:config-updated'));
    };

    const handleSelectWorkDir = async () => {
        const path = await window.electronAPI.selectWorkDir();
        if (path) {
            loadConfig();
        }
    };

    const saveJsonAndExit = async (): Promise<boolean> => {
        try {
            const newConfig = JSON.parse(jsonContent);
            for (const key in newConfig) {
                await window.electronAPI.setConfig(key, newConfig[key]);
            }
            setConfig(newConfig);
            if (newConfig.serialHistory) {
                await reloadHistory();
            }
            setIsJsonMode(false);
            loadConfig();
            return true;
        } catch (e) {
            alert(t('settings.jsonError') + ": " + (e as Error).message);
            return false;
        }
    };

    const handleClose = async () => {
        if (isJsonMode) {
            const success = await saveJsonAndExit();
            if (success) onClose();
        } else {
            onClose();
        }
    };

    return {
        activeTab, setActiveTab,
        isJsonMode, setIsJsonMode,
        jsonContent, setJsonContent,
        jsonError,
        config, setConfig,
        handleSave,
        handleSelectWorkDir,
        handleClose,
        loadConfig,
        saveJsonAndExit
    };
};
