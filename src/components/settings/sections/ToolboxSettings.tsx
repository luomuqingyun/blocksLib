import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import * as Blockly from 'blockly';
import { CATEGORY_COLORS } from '../../../config/theme';

import { BoardRegistry } from '../../../registries/BoardRegistry';

interface ToolboxSettingsProps {
    config: any;
    handleSave: (key: string, value: any) => void;
    selectedBoard?: string;
}

export const ToolboxSettings: React.FC<ToolboxSettingsProps> = ({ config, handleSave, selectedBoard }) => {
    const { t } = useTranslation();

    // Ensure hiddenCategories exists
    const hiddenCategories: string[] = config.toolbox?.hiddenCategories || [];

    // Dynamically derive categories from the current board's toolbox configuration
    const categories = useMemo(() => {
        if (!selectedBoard) return [];
        try {
            const toolboxConfig = BoardRegistry.getToolboxConfig(selectedBoard);
            return (toolboxConfig.contents || []).filter((item: any) => item.kind === 'category').map((item: any) => ({
                id: item.id || item.name,
                name: item.name,
                color: item.colour || item.color || '#888'
            }));
        } catch (e) {
            console.error('[ToolboxSettings] Failed to load toolbox config:', e);
            return [];
        }
    }, [selectedBoard]);

    const toggleCategory = (catId: string) => {
        const isHidden = hiddenCategories.includes(catId);
        let newHidden;
        if (isHidden) {
            newHidden = hiddenCategories.filter(id => id !== catId);
        } else {
            newHidden = [...hiddenCategories, catId];
        }
        handleSave('toolbox.hiddenCategories', newHidden);
    };

    // Helper to translate category IDs
    const getDisplayName = (id: string, originalName: string) => {
        // If it's a message reference like %{BKY_CAT_LOGIC}, try to resolve it
        if (originalName.startsWith('%{BKY_')) {
            const key = originalName.replace('%{BKY_', '').replace('}', '');
            if ((Blockly.Msg as any)[key]) {
                return (Blockly.Msg as any)[key];
            }
        }

        // Try react-i18next fallback
        let raw = id;
        if (id.startsWith('%{BKY_CAT_')) {
            raw = id.replace('%{BKY_CAT_', '').replace('}', '');
        } else if (id.startsWith('CAT_')) {
            raw = id.replace('CAT_', '');
        }

        const i18nKey = `toolbox.${raw.toLowerCase()}`;
        const translated = t(i18nKey);
        if (translated && translated !== i18nKey) {
            return translated;
        }

        // Final fallbacks
        if (originalName && !originalName.startsWith('%{')) return originalName;
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
                    {categories.map((cat: any) => {
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
