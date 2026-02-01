import * as Blockly from 'blockly';
import { ValidationRule } from '../types';

/**
 * List of field names that are recognized as hardware pins.
 */
const PIN_FIELD_NAMES = [
    'PIN', 'PIN_DATA', 'PIN_DATA_IN', 'PIN_CLOCK', 'PIN_CS', 'PIN_LATCH',
    'TX', 'RX', 'PIN_TX', 'PIN_RX',
    'TRIG', 'ECHO',
    'PWM_PIN', 'SERVO_PIN', 'TONE_PIN',
    'I2C_SDA', 'I2C_SCL', 'SPI_MOSI', 'SPI_MISO', 'SPI_SCK'
];

/**
 * Global Rule: Prevents multiple blocks from using the same hardware pin.
 */
export const checkPinConflict: ValidationRule = (block) => {
    if (!block.workspace) return null;

    // 1. Identify pins used by the current block
    const usedPins: { field: string, value: string }[] = [];
    block.inputList.forEach((input: any) => {
        input.fieldRow.forEach((field: any) => {
            if (field.name && PIN_FIELD_NAMES.includes(field.name)) {
                const val = field.getValue();
                if (val && val !== 'none' && val !== 'unnamed') {
                    usedPins.push({ field: field.name, value: val });
                }
            }
        });
    });

    if (usedPins.length === 0) return null;

    // 2. Scan workspace for conflicts
    const allBlocks = block.workspace.getAllBlocks(false);
    for (const otherBlock of allBlocks) {
        if (otherBlock.id === block.id) continue;

        // Skip disabled blocks or blocks in flyouts
        if (otherBlock.isEnabled() === false || otherBlock.isInFlyout) continue;

        for (const otherInput of otherBlock.inputList) {
            for (const otherField of otherInput.fieldRow) {
                if (otherField.name && PIN_FIELD_NAMES.includes(otherField.name)) {
                    const otherVal = otherField.getValue();

                    // Check if any of our pins conflict with this field
                    const conflict = usedPins.find(p => p.value === otherVal);
                    if (conflict) {
                        // Found a conflict!
                        const otherBlockName = otherBlock.type.replace(/_/g, ' ');
                        const pinName = conflict.value;

                        // Localization hack: if we're in a Chinese environment, try to translate.
                        // For now, English is fine as the system has i18n support.
                        return `引脚 ${pinName} 已被积木 "${otherBlockName}" 占用，请选择其他引脚。`;
                    }
                }
            }
        }
    }

    return null;
};
