import * as Blockly from 'blockly';

/**
 * Interface for a validation rule.
 * Returns a string warning if validation fails, or null if it passes.
 */
export type ValidationRule = (block: Blockly.Block) => string | null;
