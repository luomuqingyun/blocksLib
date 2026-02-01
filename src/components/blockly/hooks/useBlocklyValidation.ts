/**
 * ============================================================
 * Blockly 积木块验证 Hook (Blockly Block Validation Hook)
 * ============================================================
 * 
 * 管理 Blockly 工作区中积木块的验证时机和逻辑。
 * 
 * 核心优化:
 * - 防止在用户输入字段值时触发验证（避免焦点丢失）
 * - 使用智能延迟策略，区分结构变更和字段变更
 * - 避免验证循环（disabled/warning 变更不触发重复验证）
 * 
 * @file src/components/blockly/hooks/useBlocklyValidation.ts
 * @module EmbedBlocks/Frontend/Hooks
 */

import { useRef, useCallback, MutableRefObject } from 'react';
import * as Blockly from 'blockly';
import { validateBlock } from '../../../utils/block_validation';

/**
 * Blockly 积木块验证 Hook
 * 
 * @param workspaceRef 工作区引用
 * @param isReadyForEditsRef 是否准备好编辑的引用
 * @param onRefreshDynamicFlyout 刷新动态工具箱的回调
 */
export const useBlocklyValidation = (
    workspaceRef: MutableRefObject<any>,
    isReadyForEditsRef: MutableRefObject<boolean>,
    onRefreshDynamicFlyout: () => void
) => {
    const validationTimer = useRef<NodeJS.Timeout | null>(null);

    /**
     * 执行积木块验证
     */
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

    /**
     * 处理验证相关事件
     * 
     * 策略:
     * - 结构变更 (MOVE, CREATE, DELETE): 短延迟后验证
     * - 字段变更 (CHANGE + field): 长延迟后验证，避免打断输入
     * - 内部变更 (disabled, warning): 完全跳过
     */
    const handleValidationEvent = useCallback((event: any) => {
        if (!workspaceRef.current || event.workspaceId !== workspaceRef.current.id) return;
        if (!isReadyForEditsRef.current) return;

        // 跳过 UI 事件
        if (event.isUiEvent) return;

        // 完全跳过会导致循环的内部变更
        if (event.type === Blockly.Events.BLOCK_CHANGE) {
            const element = event.element;

            // 跳过 disabled 和 warning 变更（避免验证循环）
            if (element === 'disabled' || element === 'warning') {
                return;
            }

            // [关键优化] 字段值变更时使用更长的延迟
            // 这是用户正在输入的关键时刻，需要保护焦点
            if (element === 'field') {
                if (validationTimer.current) clearTimeout(validationTimer.current);
                // 使用 800ms 的长延迟，让用户有足够时间完成输入
                validationTimer.current = setTimeout(runValidation, 800);
                return;
            }
        }

        // 需要触发验证的事件类型
        const needsValidation =
            event.type === Blockly.Events.BLOCK_MOVE ||
            event.type === Blockly.Events.BLOCK_CREATE ||
            event.type === Blockly.Events.BLOCK_DELETE ||
            event.type === Blockly.Events.VAR_CREATE ||
            event.type === Blockly.Events.VAR_DELETE ||
            event.type === Blockly.Events.VAR_RENAME ||
            event.type === Blockly.Events.FINISHED_LOADING ||
            // 兼容旧版事件名称
            event.type === 'move' ||
            event.type === 'create' ||
            event.type === 'delete';

        if (needsValidation) {
            if (validationTimer.current) clearTimeout(validationTimer.current);
            // 结构变更使用短延迟
            validationTimer.current = setTimeout(runValidation, 200);
        }
    }, [workspaceRef, isReadyForEditsRef, runValidation]);

    return {
        handleValidationEvent,
        runValidation
    };
};

