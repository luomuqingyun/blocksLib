/**
 * ============================================================
 * Blockly 动态工具箱管理 Hook (Dynamic Toolbox Management Hook)
 * ============================================================
 * 
 * 管理 Blockly 工作区的动态工具箱分类。
 * 
 * 动态分类:
 * - ARDUINO_VARIABLES: 根据工作区中定义的变量动态生成积木
 * - ARDUINO_TYPES: 类型相关积木
 * - ARDUINO_TOOLS: 工具类积木
 * 
 * 功能:
 * - 注册工具箱分类回调
 * - 处理工具箱项选择事件
 * - 刷新动态 Flyout 内容
 * 
 * @file src/components/blockly/hooks/useBlocklyDynamicToolbox.ts
 * @module EmbedBlocks/Frontend/Hooks
 */

import { useRef, useEffect, useCallback, MutableRefObject } from 'react';
import { constructVariablesToolbox, constructTypesToolbox, constructToolsToolbox } from '../../../utils/toolbox/ToolboxConstructor';
export const useBlocklyDynamicToolbox = (
    workspaceRef: MutableRefObject<any>,
    toolboxConfiguration: any
) => {
    // 当前活动的动态分类名称
    const activeDynamicCategoryRef = useRef<string | null>(null);

    /**
     * 注册动态分类回调函数
     * 这些回调函数会在用户点击相应分类时被调用
     */
    const registerCallbacks = useCallback((workspace: any) => {
        if (!workspace) return;
        // 注册变量分类回调
        workspace.registerToolboxCategoryCallback('ARDUINO_VARIABLES', constructVariablesToolbox);
        // 注册类型分类回调
        workspace.registerToolboxCategoryCallback('ARDUINO_TYPES', constructTypesToolbox);
        // 注册工具分类回调
        workspace.registerToolboxCategoryCallback('ARDUINO_TOOLS', constructToolsToolbox);
    }, []);

    // 当工作区或配置变化时，重新注册回调
    useEffect(() => {
        if (workspaceRef.current && toolboxConfiguration) {
            registerCallbacks(workspaceRef.current);
        }
    }, [workspaceRef, toolboxConfiguration, registerCallbacks]);

    /**
     * 处理工具箱项选择事件
     * 记录当前选中的动态分类，用于后续刷新
     */
    const handleToolboxItemSelect = useCallback((event: any) => {
        if (event.type === 'toolbox_item_select' && workspaceRef.current) {
            const toolbox = workspaceRef.current.getToolbox();
            const item = toolbox.getSelectedItem();
            if (item) {
                const itemId = (item as any).id_ || (item as any).id;
                const name = item.getName();
                // 获取自定义分类类型
                let customVal = (typeof item.getCustomType === 'function') ? item.getCustomType() :
                    (typeof item.getCustom === 'function') ? item.getCustom() : null;

                // 如果没有自定义类型，根据 ID 或名称推断
                if (!customVal) {
                    if (itemId === 'CAT_VARIABLES' || name.includes('变量')) customVal = 'ARDUINO_VARIABLES';
                    else if (itemId === 'CAT_TYPES' || name.includes('类型')) customVal = 'ARDUINO_TYPES';
                    else if (itemId === 'CAT_TOOLS' || name.includes('工具')) customVal = 'ARDUINO_TOOLS';
                }
                activeDynamicCategoryRef.current = customVal;
            }
        }
    }, [workspaceRef]);

    /**
     * 刷新当前动态 Flyout 的内容
     * 根据 activeDynamicCategoryRef 重新生成并显示积木块列表
     */
    const refreshDynamicFlyout = useCallback(() => {
        if (workspaceRef.current && activeDynamicCategoryRef.current) {
            const toolbox = workspaceRef.current.getToolbox();
            const flyout = toolbox ? (toolbox.getFlyout() || workspaceRef.current.getFlyout()) : workspaceRef.current.getFlyout();
            if (flyout) {
                const customName = activeDynamicCategoryRef.current;
                let newContents = null;
                // 根据分类类型构建内容
                if (customName === 'ARDUINO_VARIABLES') newContents = constructVariablesToolbox(workspaceRef.current);
                else if (customName === 'ARDUINO_TYPES') newContents = constructTypesToolbox(workspaceRef.current);
                else if (customName === 'ARDUINO_TOOLS') newContents = constructToolsToolbox(workspaceRef.current);
                // 显示新内容
                if (newContents) flyout.show(newContents);
            }
        }
    }, [workspaceRef]);

    return {
        registerCallbacks,
        handleToolboxItemSelect,
        refreshDynamicFlyout,
        activeDynamicCategoryRef
    };
};
