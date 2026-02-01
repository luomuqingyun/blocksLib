/**
 * ============================================================
 * 工具箱配置 Hook (Toolbox Hook)
 * ============================================================
 * 
 * 管理 Blockly 工具箱的配置和过滤逻辑:
 * - 根据选中的开发板加载对应工具箱
 * - 应用用户自定义的类别隐藏设置
 * - 订阅板卡注册表更新和配置变更
 * 
 * @file src/hooks/useToolbox.ts
 * @module EmbedBlocks/Frontend/Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BoardRegistry } from '../registries/BoardRegistry';

/**
 * Hook to manage toolbox configuration and filtering logic.
 * Encapsulates board-specific toolbox loading and user-defined category filtering.
 */

export const useToolbox = (selectedBoard: string | null) => {
    const { i18n } = useTranslation();
    const [toolboxConfig, setToolboxConfig] = useState<any>(null);

    const refreshToolbox = useCallback(async () => {
        if (!selectedBoard) {
            setToolboxConfig(null);
            return;
        }

        // 1. Get base config from Registry
        const baseConfig = BoardRegistry.getToolboxConfig(selectedBoard);

        // 2. Get user config for visibility
        let hiddenCategories: string[] = [];
        if (window.electronAPI) {
            try {
                const userConfig = await window.electronAPI.getConfig();
                hiddenCategories = userConfig.toolbox?.hiddenCategories || [];
            } catch (err) {
                console.error('[useToolbox] Failed to fetch user config:', err);
            }
        }

        if (hiddenCategories.length === 0) {
            setToolboxConfig(baseConfig);
            return;
        }

        // 3. Filter contents
        // We assume baseConfig is { kind: 'categoryToolbox', contents: [...] }
        const newContents = (baseConfig.contents || []).filter((item: any) => {
            // If it's a category, check if its ID (or Name which we use as ID in settings) is hidden
            if (item.kind === 'category') {
                const key = item.id || item.name;
                if (key && hiddenCategories.includes(key)) {
                    return false;
                }
            }
            return true;
        });

        console.log(`[useToolbox] 刷新工具箱 (Refresh Toolbox) - Board: ${selectedBoard}, Hidden: ${hiddenCategories.length}`);
        setToolboxConfig({ ...baseConfig, contents: newContents });
    }, [selectedBoard]);

    // Initial sync and sync when board or language changes
    useEffect(() => {
        refreshToolbox();
    }, [refreshToolbox, i18n.language]);

    // Subscribe to registry updates and external config changes
    useEffect(() => {
        const unsubscribe = BoardRegistry.subscribe(() => {
            console.log('[useToolbox] BoardRegistry updated, refreshing toolbox...');
            refreshToolbox();
        });

        const handleConfigUpdate = () => {
            console.log('[useToolbox] Config updated, refreshing toolbox...');
            refreshToolbox();
        };

        window.addEventListener('embedblocks:config-updated', handleConfigUpdate);

        return () => {
            unsubscribe();
            window.removeEventListener('embedblocks:config-updated', handleConfigUpdate);
        };
    }, [refreshToolbox]);

    return toolboxConfig;
};
