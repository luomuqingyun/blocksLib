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
        if (otherBlock.isInFlyout) continue;

        for (const otherInput of otherBlock.inputList) {
            for (const otherField of otherInput.fieldRow) {
                if (otherField.name && PIN_FIELD_NAMES.includes(otherField.name)) {
                    const otherVal = otherField.getValue();

                    // 检查是否存在引脚编号重叠
                    const conflict = usedPins.find(p => p.value === otherVal);
                    if (conflict) {

                        // [深度优化] 硬件引脚复用规则 (Advanced Pin Mutex Logic)
                        // 1. 定义被视为“通用无状态”的积木列表
                        // 这些积木在执行完毕后不会独占引脚的硬件外设发生器（如硬件I2C/SPI控制器、硬件PWM通道长期占用）
                        // 因此它们之间互相复用引脚是完全合法的（例如先向 PA0 输出高，再输出低，然后再读）
                        const generalIoBlocks = [
                            'arduino_digital_write', 'arduino_digital_read', 'arduino_digital_toggle',
                            'arduino_analog_write', 'arduino_analog_read', 'arduino_tone'
                        ];

                        // 如果发生冲突的两个积木都属于通用 IO 操作，则直接豁免
                        if (generalIoBlocks.includes(block.type) && generalIoBlocks.includes(otherBlock.type)) {
                            continue;
                        }

                        // 2. 特殊情况：外设初始化与使用
                        // 例如 Servo attach 和 Servo write，虽然都用了同一个引脚，但是属于同一类外设家族的合法链条
                        const getFamily = (type: string) => type.split('_')[0]; // 例如 "arduino_servo"
                        if (getFamily(block.type) === getFamily(otherBlock.type)) {
                            continue; // 同一外设家族内的模块允许复用相同引脚
                        }

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
