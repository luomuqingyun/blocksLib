import * as Blockly from 'blockly';
import { ValidationRule } from '../types';

/**
 * 1. Missing Input Check
 * Checks if any value input is disconnected.
 */
export const checkMissingInputs: ValidationRule = (block) => {
    // Skip check for Enum Define inputs (they are optional for auto-increment)
    if (block.type === 'c_enum_define') return null;

    for (const input of block.inputList) {
        if ((input.type as any) === Blockly.INPUT_VALUE && !input.connection?.targetConnection) {
            return "Input value required.";
        }
    }
    return null;
};

/**
 * 2. Orphan Output Check (Value blocks)
 * Checks if a block has an output connection but is not connected to anything.
 */
export const checkOrphanOutput: ValidationRule = (block) => {
    if (block.outputConnection && !block.outputConnection.targetConnection) {
        return "Block result is not used.";
    }
    return null;
};
