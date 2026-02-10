import * as Blockly from 'blockly';
import { ValidationRule } from '../types';

/**
 * 硬件引脚冲突校验规则 (Hardware Pin Conflict Rules)
 */

// 系统识别为硬件引脚的字段名称列表
const PIN_FIELD_NAMES = [
    'PIN', 'PIN_DATA', 'PIN_DATA_IN', 'PIN_CLOCK', 'PIN_CS', 'PIN_LATCH',
    'TX', 'RX', 'PIN_TX', 'PIN_RX',
    'TRIG', 'ECHO',
    'PWM_PIN', 'SERVO_PIN', 'TONE_PIN',
    'I2C_SDA', 'I2C_SCL', 'SPI_MOSI', 'SPI_MISO', 'SPI_SCK'
];

/**
 * 全局规则：防止多个积木占用同一个硬件引脚。
 */
export const checkPinConflict: ValidationRule = (block, context) => {
    if (!block.workspace) return null;

    // 1. 识别当前积木所使用的全部引脚
    const usedPins: { field: string, value: string }[] = [];
    block.inputList.forEach((input: any) => {
        input.fieldRow.forEach((field: any) => {
            // 检查字段名是否在硬件引脚白名单中
            if (field.name && PIN_FIELD_NAMES.includes(field.name)) {
                const val = field.getValue();
                // 排除空值或无效值
                if (val && val !== 'none' && val !== 'unnamed') {
                    usedPins.push({ field: field.name, value: val });
                }
            }
        });
    });

    if (usedPins.length === 0) return null;

    // 2. 遍历整个工作区查找冲突
    const allBlocks = block.workspace.getAllBlocks(false);
    for (const otherBlock of allBlocks) {
        // 跳过自身
        if (otherBlock.id === block.id) continue;

        // 跳过位于工具栏预览中的积木
        // 注意：不跳过已禁用的积木，因为由于校验失败而禁用的积木依然占用引脚资源
        if (otherBlock.isInFlyout) continue;

        for (const otherInput of otherBlock.inputList) {
            for (const otherField of otherInput.fieldRow) {
                if (otherField.name && PIN_FIELD_NAMES.includes(otherField.name)) {
                    const otherVal = otherField.getValue();

                    // 检查是否存在引脚编号重叠
                    const conflict = usedPins.find(p => p.value === otherVal);
                    if (conflict) {
                        // [关键优化] 责任归属判定 (Responsibility Attribution):
                        // 如果当前积木(block)不是触发者(trigger)，而对方(otherBlock)是触发者，
                        // 则当前积木应当“让位”，由对方去显示警告信息，避免出现“我没动却报错”的挫败感。
                        if (context?.triggerBlockId &&
                            block.id !== context.triggerBlockId &&
                            otherBlock.id === context.triggerBlockId) {
                            continue; // 跳过此冲突，由对方去承担校验失败的责任
                        }

                        // 发现冲突：将引脚占用的具体积木名称反馈给用户
                        const otherBlockName = otherBlock.type.replace(/_/g, ' ');
                        const pinName = conflict.value;

                        return `引脚 ${pinName} 已被积木 "${otherBlockName}" 占用，请选择其他引脚。`;
                    }
                }
            }
        }
    }

    return null;
};
