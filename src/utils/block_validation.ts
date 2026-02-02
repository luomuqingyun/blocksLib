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


// 按优先级顺序执行的校验规则注册表
// 第一个返回警告文本的规则将终止后续规则的执行，其错误信息将显示在积木上
const VALIDATION_RULES: ValidationRule[] = [
    checkPinConflict,     // 1. 硬件引脚冲突 (最高优先级)
    checkSingletonEntry,   // 2. 入口积木单例性
    checkArduinoParamDef,  // 3. 函数参数位置逻辑
    checkCStructDefine,    // 4. 结构体定义有效性
    checkCEnumDefine,      // 5. 枚举定义及序列逻辑
    checkGlobalScope,      // 6. 全局作用域限制
    checkMissingInputs,    // 7. 必需输入槽位检查
    checkOrphanOutput,     // 8. 计算结果未使用的孤立输出 (最低优先级)
];

/**
 * 综合积木校验协调器 (Comprehensive Block Validator)
 * 编排并执行多个专门的校验规则，并将结果反馈到积木的 UI 状态中。
 */
export const validateBlock = (block: any) => {
    if (!block) return;

    // 环境检查：如果积木位于侧边栏预览、修改器窗口或正在被拖拽，则跳过校验
    const isDragging = (typeof block.isDragging === 'function') ? block.isDragging() : !!(block as any).isDragging;
    const isFlyout = block.workspace && (block.workspace.isFlyout || (block.workspace as any).isFlyout);
    const isMutator = block.workspace && (block.workspace.isMutator || (block.workspace as any).isMutator);

    // @ts-ignore
    if (block.isInFlyout || isFlyout || isMutator || isDragging) {
        return;
    }

    // 确定是否应应用副作用（如禁用积木）
    // 只有主工作区中的积木才会在校验失败时变为灰色（禁用）
    const mainWS = Blockly.getMainWorkspace();
    const isMainWorkspace = mainWS && block.workspace && block.workspace.id === mainWS.id;

    // 执行规则链
    let warningText = null;
    for (const rule of VALIDATION_RULES) {
        warningText = rule(block);
        if (warningText) break; // 优先级：返回第一个发现的错误
    }

    // 应用 UI 状态
    let previousWarning = null;
    if (typeof block.getWarningText === 'function') {
        previousWarning = block.getWarningText();
    } else if (block.warning && typeof block.warning.getText === 'function') {
        previousWarning = block.warning.getText();
    }

    // 状态更新：仅在警告文本发生变化时更新，以优化性能
    if (previousWarning !== warningText) {
        block.setWarningText(warningText);
    }

    // 如果存在警告信息，则将积木置为禁用状态（灰色）
    if (warningText) {
        if (isMainWorkspace && typeof block.setDisabledReason === 'function') {
            // 通过 'validation_error' 理由禁用，方便后续根据理由重新启用
            block.setDisabledReason(true, 'validation_error');
        }
    } else {
        // 校验通过：清除所有警告及禁用状态
        if (typeof block.setWarningText === 'function') {
            block.setWarningText(null);
        }
        if (typeof block.setDisabledReason === 'function') {
            block.setDisabledReason(false, 'validation_error');
        }
    }
};
