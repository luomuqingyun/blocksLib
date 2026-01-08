import { useRef, useCallback, MutableRefObject } from 'react';
import * as Blockly from 'blockly';
import { validateBlock } from '../../../utils/block_validation';

/**
 * Hook to coordinate Blockly block validation.
 */
export const useBlocklyValidation = (
    workspaceRef: MutableRefObject<any>,
    isReadyForEditsRef: MutableRefObject<boolean>,
    onRefreshDynamicFlyout: () => void
) => {
    const validationTimer = useRef<NodeJS.Timeout | null>(null);

    const runValidation = useCallback(() => {
        if (workspaceRef.current) {
            try {
                const blocks = workspaceRef.current.getAllBlocks(false);
                blocks.forEach((block: any) => validateBlock(block));
                onRefreshDynamicFlyout();
            } catch (e) {
                console.error("[BlocklyValidation] Error during validation:", e);
            }
        }
    }, [workspaceRef, onRefreshDynamicFlyout]);

    const handleValidationEvent = useCallback((event: any) => {
        if (!workspaceRef.current || event.workspaceId !== workspaceRef.current.id) return;
        if (!isReadyForEditsRef.current) return;

        if (
            event.type === Blockly.Events.BLOCK_MOVE ||
            event.type === Blockly.Events.BLOCK_CHANGE ||
            event.type === Blockly.Events.BLOCK_CREATE ||
            event.type === Blockly.Events.BLOCK_DELETE ||
            event.type === Blockly.Events.VAR_CREATE ||
            event.type === Blockly.Events.VAR_DELETE ||
            event.type === Blockly.Events.VAR_RENAME ||
            event.type === Blockly.Events.FINISHED_LOADING ||
            event.type === 'move' || event.type === 'change' || event.type === 'create' || event.type === 'delete'
        ) {
            // Avoid loops where validation triggers more validation
            if (event.type === Blockly.Events.BLOCK_CHANGE && (event.element === 'disabled' || event.element === 'warning')) return;

            if (validationTimer.current) clearTimeout(validationTimer.current);
            validationTimer.current = setTimeout(runValidation, 200);
        }
    }, [workspaceRef, isReadyForEditsRef, runValidation]);

    return {
        handleValidationEvent,
        runValidation
    };
};
