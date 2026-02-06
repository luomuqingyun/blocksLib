/**
 * ============================================================
 * 设置逻辑管理 Hook (Settings Logic Management Hook)
 * ============================================================
 * 
 * 集中管理应用设置模态框的业务逻辑。
 * 
 * 功能:
 * - 加载/保存全局配置
 * - 管理设置标签页状态
 * - JSON 模式编辑与验证
 * - 语言切换处理
 * - 工作目录选择
 * 
 * 配置结构:
 * - general: 通用设置 (语言、工作目录等)
 * - serialSettings: 串口设置
 * - toolbox: 工具箱设置 (隐藏的分类)
 * - advanced: 高级设置
 * 
 * @file src/components/settings/hooks/useSettingsLogic.ts
 * @module EmbedBlocks/Frontend/Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSerial } from '../../../contexts/SerialContext';
// 引入拆分的设置逻辑和分区组件
import { useBuild } from '../../../contexts/BuildContext';

/**
 * 设置逻辑管理 Hook
 * 
 * @param isOpen 设置模态框是否打开
 * @param onClose 关闭模态框的回调
 */
export const useSettingsLogic = (isOpen: boolean, onClose: () => void) => {
    const { t, i18n } = useTranslation();
    const { reloadHistory } = useSerial();
    const { config, setConfig } = useBuild();

    // ========== 状态管理 ==========
    const [activeTab, setActiveTab] = useState('general');      // 当前活动的标签页
    const [isJsonMode, setIsJsonMode] = useState(false);        // 是否为 JSON 编辑模式
    const [jsonContent, setJsonContent] = useState('');         // JSON 编辑器内容
    const [jsonError, setJsonError] = useState<string | null>(null); // JSON 解析错误

    /**
     * 从后端加载配置
     * 确保必要的嵌套对象存在
     */
    const loadConfig = useCallback(async () => {
        const cfg = await window.electronAPI.getConfig();
        // 确保必要的嵌套对象存在
        if (!cfg.general) cfg.general = { language: 'system', workDir: '' };
        if (!cfg.toolbox) cfg.toolbox = { hiddenCategories: [] };
        setConfig(cfg);
        setJsonContent(JSON.stringify(cfg, null, 4));
    }, []);

    // 模态框打开时加载配置并重置状态
    useEffect(() => {
        if (isOpen) {
            loadConfig();
            setIsJsonMode(false);   // 重置为普通模式
            setActiveTab('general'); // 重置到通用标签页
            setJsonError(null);
        }
    }, [isOpen, loadConfig]);

    // 实时验证 JSON 内容是否有效
    useEffect(() => {
        try {
            JSON.parse(jsonContent);
            setJsonError(null);
        } catch (e) {
            setJsonError((e as Error).message);
        }
    }, [jsonContent]);

    /**
     * 保存单个配置项
     * 支持嵌套键名 (如 'general.language')
     * 
     * @param key 配置键名
     * @param value 配置值
     */
    const handleSave = async (key: string, value: any) => {
        // 保存到后端
        await window.electronAPI.setConfig(key, value);
        // 串口历史变更时重新加载
        if (key === 'serialHistory') {
            await reloadHistory();
        }

        // 更新本地状态 (支持嵌套键名)
        setConfig((prev: any) => {
            const newState = { ...prev };
            if (key.includes('.')) {
                // 处理嵌套键名，如 'general.language'
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

        // 语言变更时更新 i18n
        if (key === 'general.language') {
            if (value === 'system') {
                // 系统语言: 检测浏览器语言
                i18n.changeLanguage(navigator.language.startsWith('zh') ? 'zh' : 'en');
            } else {
                i18n.changeLanguage(value);
            }
        }

        // 通知应用配置已更新 (用于刷新工具箱等)
        window.dispatchEvent(new Event('embedblocks:config-updated'));
    };

    /**
     * 选择工作目录
     * 调用 Electron API 弹出文件夹选择器
     */
    const handleSelectWorkDir = async () => {
        const path = await window.electronAPI.selectWorkDir();
        if (path) {
            // 选择成功后重新加载配置
            loadConfig();
        }
    };

    /**
     * 在 JSON 模式下保存并退出
     * 验证并解析 JSON 内容，批量更新配置项
     */
    const saveJsonAndExit = async (): Promise<boolean> => {
        try {
            const newConfig = JSON.parse(jsonContent);
            // 遍历并保存每一个配置项
            for (const key in newConfig) {
                await window.electronAPI.setConfig(key, newConfig[key]);
            }
            setConfig(newConfig);
            // 特殊处理：如果包含串口历史，则重新加载
            if (newConfig.serialHistory) {
                await reloadHistory();
            }
            setIsJsonMode(false);
            loadConfig();
            return true;
        } catch (e) {
            // JSON 解析错误提示
            alert(t('settings.jsonError') + ": " + (e as Error).message);
            return false;
        }
    };

    /**
     * 处理设置窗口关闭
     * 如果处于 JSON 模式，尝试保存后再退出
     */
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
