/**
 * ============================================================
 * 积木块验证器 (Block Validator)
 * ============================================================
 * 
 * 综合验证协调器，按优先级顺序执行多个验证规则:
 * - 硬件规则 (引脚冲突检测)
 * - 全局规则 (单例入口检测)
 * - 上下文规则 (参数定义、结构体、枚举)
 * - 核心规则 (必需输入、孤立输出)
 * 
 * 第一个返回警告的规则会终止该 Block 的后续验证。
 * 
 * @file src/utils/block_validation.ts
 * @module EmbedBlocks/Frontend/Utils/Validation
 */

import * as Blockly from 'blockly';
import { checkMissingInputs, checkOrphanOutput } from './validation/rules/coreRules';
import { checkArduinoParamDef, checkCStructDefine, checkCEnumDefine } from './validation/rules/contextRules';
import { checkGlobalScope, checkSingletonEntry } from './validation/rules/globalRules';
import { checkPinConflict } from './validation/rules/hardwareRules';
import { ValidationRule } from './validation/types';


// Registry of rules to run sequentially
// The first rule to return a warning will stop the validation for that block
const VALIDATION_RULES: ValidationRule[] = [
    checkPinConflict,
    checkSingletonEntry,
    checkArduinoParamDef,
    checkCStructDefine,
    checkCEnumDefine,
    checkGlobalScope,
    checkMissingInputs,
    checkOrphanOutput,
];

/**
 * Comprehensive Block Validator
 * Orchestrates multiple specialized validation rules.
 */
export const validateBlock = (block: any) => {
    if (!block) return;

    // Environmental Checks: Skip if in flyout, mutator, or currently being dragged
    const isDragging = (typeof block.isDragging === 'function') ? block.isDragging() : !!(block as any).isDragging;
    const isFlyout = block.workspace && (block.workspace.isFlyout || (block.workspace as any).isFlyout);
    const isMutator = block.workspace && (block.workspace.isMutator || (block.workspace as any).isMutator);

    // @ts-ignore
    if (block.isInFlyout || isFlyout || isMutator || isDragging) {
        return;
    }

    // Determine if we should apply side-effects (disabling)
    const mainWS = Blockly.getMainWorkspace();
    const isMainWorkspace = mainWS && block.workspace && block.workspace.id === mainWS.id;

    // Run Rules
    let warningText = null;
    for (const rule of VALIDATION_RULES) {
        warningText = rule(block);
        if (warningText) break; // Priority: First error found
    }

    // Apply State
    let previousWarning = null;
    if (typeof block.getWarningText === 'function') {
        previousWarning = block.getWarningText();
    } else if (block.warning && typeof block.warning.getText === 'function') {
        previousWarning = block.warning.getText();
    }

    if (previousWarning !== warningText) {
        block.setWarningText(warningText);
    }

    // Disable block if it has a warning
    if (warningText) {
        if (isMainWorkspace && typeof block.setDisabledReason === 'function') {
            block.setDisabledReason(true, 'validation_error');
        }
    } else {
        if (typeof block.setWarningText === 'function') {
            block.setWarningText(null);
        }
        if (typeof block.setDisabledReason === 'function') {
            block.setDisabledReason(false, 'validation_error');
        }
    }
};
