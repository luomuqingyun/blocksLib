/**
 * ============================================================
 * 工具箱设置区域组件 (Toolbox Settings Section Component)
 * ============================================================
 * 
 * 设置模态框中的工具箱设置标签页内容。
 * 
 * 功能:
 * - 显示当前开发板的所有工具箱分类
 * - 支持切换分类的显示/隐藏状态
 * - 根据开发板动态加载分类列表
 * - 使用颜色标识不同分类
 * 
 * @file src/components/settings/sections/ToolboxSettings.tsx
 * @module EmbedBlocks/Frontend/Components/Settings
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import * as Blockly from 'blockly';
import { CATEGORY_COLORS } from '../../../config/theme';

import { BoardRegistry } from '../../../registries/BoardRegistry';

/** 工具箱设置组件属性 */
interface ToolboxSettingsProps {
    /** 当前配置对象 */
    config: any;
    /** 保存配置回调 */
    handleSave: (key: string, value: any) => void;
    /** 当前选中的开发板 ID */
    selectedBoard?: string;
}

export const ToolboxSettings: React.FC<ToolboxSettingsProps> = ({ config, handleSave, selectedBoard }) => {
    const { t } = useTranslation();

    // 确保 hiddenCategories 数组存在，避免 undefined 错误
    const hiddenCategories: string[] = config.toolbox?.hiddenCategories || [];

    /**
     * 根据当前选中的开发板，动态获取工具箱分类列表
     * - 从 BoardRegistry 获取开发板的工具箱配置
     * - 过滤出 kind === 'category' 的项目
     * - 提取 id、name、color 属性用于渲染
     */
    const categories = useMemo(() => {
        // 未选择开发板时返回空数组
        if (!selectedBoard) return [];
        try {
            // 从注册表获取工具箱配置
            const toolboxConfig = BoardRegistry.getToolboxConfig(selectedBoard);
            // 过滤并映射分类数据
            return (toolboxConfig.contents || []).filter((item: any) => item.kind === 'category').map((item: any) => ({
                id: item.id || item.name,  // 优先使用 id，否则用 name
                name: item.name,
                color: item.colour || item.color || '#888'  // 兼容 colour 和 color 两种拼写
            }));
        } catch (e) {
            console.error('[ToolboxSettings] 加载工具箱配置失败:', e);
            return [];
        }
    }, [selectedBoard]);

    /**
     * 切换分类的显示/隐藏状态
     * @param catId 分类 ID
     */
    const toggleCategory = (catId: string) => {
        const isHidden = hiddenCategories.includes(catId);
        let newHidden;
        if (isHidden) {
            // 当前是隐藏状态 -> 移除，变为显示
            newHidden = hiddenCategories.filter(id => id !== catId);
        } else {
            // 当前是显示状态 -> 添加到隐藏列表
            newHidden = [...hiddenCategories, catId];
        }
        // 保存到配置
        handleSave('toolbox.hiddenCategories', newHidden);
    };

    /**
     * 获取分类的显示名称
     * 尝试多种方式翻译分类 ID 为用户友好的名称
     * 
     * @param id 分类 ID (如 CAT_LOGIC, %{BKY_CAT_LOGIC})
     * @param originalName 原始名称
     * @returns 翻译后的显示名称
     */
    const getDisplayName = (id: string, originalName: string) => {
        // 方式1: 解析 Blockly 消息引用 (如 %{BKY_CAT_LOGIC})
        if (originalName.startsWith('%{BKY_')) {
            const key = originalName.replace('%{BKY_', '').replace('}', '');
            if ((Blockly.Msg as any)[key]) {
                return (Blockly.Msg as any)[key];
            }
        }

        // 方式2: 尝试 react-i18next 翻译
        // 先清理 ID 前缀
        let raw = id;
        if (id.startsWith('%{BKY_CAT_')) {
            raw = id.replace('%{BKY_CAT_', '').replace('}', '');
        } else if (id.startsWith('CAT_')) {
            raw = id.replace('CAT_', '');
        }

        // 构建 i18n 键名并尝试翻译
        const i18nKey = `toolbox.${raw.toLowerCase()}`;
        const translated = t(i18nKey);
        if (translated && translated !== i18nKey) {
            return translated;
        }

        // 方式3: 回退到原始名称或格式化 ID
        if (originalName && !originalName.startsWith('%{')) return originalName;
        // 将下划线转空格，首字母大写 (如 LOGIC -> Logic)
        return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase().replace(/_/g, ' ');
    };

    return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <h3 className="text-sm font-bold text-blue-400 mb-2">
                    {t('settings.toolboxVisibility')}
                </h3>
                <p className="text-xs text-slate-400">
                    {t('settings.toolboxVisibilityDesc')}
                </p>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                    {selectedBoard ? 'No categories found for this board.' : 'Please select a board first.'}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* 遍历所有分类，渲染可点击的分类卡片 */}
                    {categories.map((cat: any) => {
                        // 判断当前分类是否被隐藏
                        const isHidden = hiddenCategories.includes(cat.id);
                        const isVisible = !isHidden;

                        return (
                            <div
                                key={cat.id}
                                onClick={() => toggleCategory(cat.id)}
                                className={`
                                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none
                                    ${isVisible
                                        ? 'bg-[#252526] border-slate-600 hover:border-slate-500'
                                        : 'bg-[#1e1e1e] border-slate-800 opacity-60 hover:opacity-100'
                                    }
                                `}
                            >
                                <div
                                    className="w-8 h-8 rounded-md flex items-center justify-center text-white"
                                    style={{ backgroundColor: isVisible ? cat.color : '#333' }}
                                >
                                    {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </div>
                                <span className={`text-sm ${isVisible ? 'text-slate-200' : 'text-slate-500'}`}>
                                    {getDisplayName(cat.id, cat.name)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            <p className="text-xs text-slate-500 italic mt-4">
                * {t('settings.toolboxNote')}
            </p>
        </div>
    );
};
