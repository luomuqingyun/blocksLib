import { useRef, useEffect, useCallback, MutableRefObject } from 'react';
import { constructVariablesToolbox, constructTypesToolbox, constructToolsToolbox } from '../../../utils/variable_scanner';

/**
 * Hook to manage Blockly dynamic toolbox categories.
 */
export const useBlocklyDynamicToolbox = (
    workspaceRef: MutableRefObject<any>,
    toolboxConfiguration: any
) => {
    const activeDynamicCategoryRef = useRef<string | null>(null);

    const registerCallbacks = useCallback((workspace: any) => {
        if (!workspace) return;
        workspace.registerToolboxCategoryCallback('ARDUINO_VARIABLES', constructVariablesToolbox);
        workspace.registerToolboxCategoryCallback('ARDUINO_TYPES', constructTypesToolbox);
        workspace.registerToolboxCategoryCallback('ARDUINO_TOOLS', constructToolsToolbox);
    }, []);

    // Sync callbacks when workspace or configuration changes
    useEffect(() => {
        if (workspaceRef.current && toolboxConfiguration) {
            registerCallbacks(workspaceRef.current);
        }
    }, [workspaceRef, toolboxConfiguration, registerCallbacks]);

    const handleToolboxItemSelect = useCallback((event: any) => {
        if (event.type === 'toolbox_item_select' && workspaceRef.current) {
            const toolbox = workspaceRef.current.getToolbox();
            const item = toolbox.getSelectedItem();
            if (item) {
                const itemId = (item as any).id_ || (item as any).id;
                const name = item.getName();
                let customVal = (typeof item.getCustomType === 'function') ? item.getCustomType() :
                    (typeof item.getCustom === 'function') ? item.getCustom() : null;

                if (!customVal) {
                    if (itemId === 'CAT_VARIABLES' || name.includes('变量')) customVal = 'ARDUINO_VARIABLES';
                    else if (itemId === 'CAT_TYPES' || name.includes('类型')) customVal = 'ARDUINO_TYPES';
                    else if (itemId === 'CAT_TOOLS' || name.includes('工具')) customVal = 'ARDUINO_TOOLS';
                }
                activeDynamicCategoryRef.current = customVal;
            }
        }
    }, [workspaceRef]);

    const refreshDynamicFlyout = useCallback(() => {
        if (workspaceRef.current && activeDynamicCategoryRef.current) {
            const toolbox = workspaceRef.current.getToolbox();
            const flyout = toolbox ? (toolbox.getFlyout() || workspaceRef.current.getFlyout()) : workspaceRef.current.getFlyout();
            if (flyout) {
                const customName = activeDynamicCategoryRef.current;
                let newContents = null;
                if (customName === 'ARDUINO_VARIABLES') newContents = constructVariablesToolbox(workspaceRef.current);
                else if (customName === 'ARDUINO_TYPES') newContents = constructTypesToolbox(workspaceRef.current);
                else if (customName === 'ARDUINO_TOOLS') newContents = constructToolsToolbox(workspaceRef.current);
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
