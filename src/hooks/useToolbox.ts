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
 * 管理 Blockly 工具箱 (Toolbox) 配置和过滤逻辑的 Hook。
 * 封装了特定板卡的工具箱加载、语言切换同步、以及用户定义的类别过滤功能。
 * 
 * @param selectedBoard - 当前选中的开发板 ID
 */
export const useToolbox = (selectedBoard: string | null) => {
    const { i18n } = useTranslation();
    const [toolboxConfig, setToolboxConfig] = useState<any>(null);

    /**
     * 核心逻辑：刷新工具箱配置
     * 1. 确定当前板卡对应的基础工具箱。
     * 2. 合并用户在“设置”中配置的类别可见性。
     * 3. 实时响应语言切换，确保积木块文案更新。
     */
    const refreshToolbox = useCallback(async () => {
        if (!selectedBoard) {
            setToolboxConfig(null);
            return;
        }

        // 1. 从注册表 (Registry) 获取该板卡的基础工具箱定义
        const baseConfig = BoardRegistry.getToolboxConfig(selectedBoard);

        // 2. 从 Electron 持久化存储中获取用户配置的隐藏类别
        let hiddenCategories: string[] = [];
        if (window.electronAPI) {
            try {
                const userConfig = await window.electronAPI.getConfig();
                hiddenCategories = userConfig.toolbox?.hiddenCategories || [];
            } catch (err) {
                console.error('[useToolbox] Failed to fetch user config:', err);
            }
        }

        // 如果用户没隐藏任何东西，直接使用基础配置
        if (hiddenCategories.length === 0) {
            setToolboxConfig(baseConfig);
            return;
        }

        // 3. 过滤内容 (Filtering)
        // 工具箱结构通常为 { kind: 'categoryToolbox', contents: [...] }
        const newContents = (baseConfig.contents || []).filter((item: any) => {
            // 如果是分类节点，检查其 ID 或名称是否在屏蔽列表中
            if (item.kind === 'category') {
                const key = item.id || item.name;
                if (key && hiddenCategories.includes(key)) {
                    return false;
                }
            }
            return true;
        });

        console.log(`[useToolbox] 刷新工具箱 (Refresh Toolbox) - Board: ${selectedBoard}, Hidden: ${hiddenCategories.length}`);

        // 生成过滤后的新配置对象，触发 Blockly 更新
        setToolboxConfig({ ...baseConfig, contents: newContents });
    }, [selectedBoard]);

    // 生命周期 A: 初始同步，或当板卡/界面语言变更时重新生成工具箱
    useEffect(() => {
        refreshToolbox();
    }, [refreshToolbox, i18n.language]);

    // 生命周期 B: 订阅外部更新事件
    useEffect(() => {
        // A. 订阅板卡注册表更新（例如插件注册了包含新类别的新板卡）
        const unsubscribe = BoardRegistry.subscribe(() => {
            console.log('[useToolbox] BoardRegistry updated, refreshing toolbox...');
            refreshToolbox();
        });

        // B. 订阅全局配置更新事件（例如用户在设置面板动态勾选了隐藏某个类别）
        const handleConfigUpdate = () => {
            console.log('[useToolbox] Config updated, refreshing toolbox...');
            refreshToolbox();
        };

        window.addEventListener('embedblocks:config-updated', handleConfigUpdate);

        // 清理函数：移除监听器防止内存泄漏
        return () => {
            unsubscribe();
            window.removeEventListener('embedblocks:config-updated', handleConfigUpdate);
        };
    }, [refreshToolbox]);

    return toolboxConfig;
};
