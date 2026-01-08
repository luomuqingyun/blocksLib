import * as Blockly from 'blockly';
import { arduinoGenerator } from '../arduino-base';

export const cleanName = (name: string) => name ? name.replace(/[^a-zA-Z0-9_]/g, '_') : 'unnamed';

// Comprehensive Block Validator
// Validation is now centralized in utils/block_validation.ts
export { validateBlock } from '../../utils/block_validation';

export const registerBlock = (type: string, def: any, generator: (block: any) => any) => {
    const originalInit = def.init;
    def.init = function () {
        if (originalInit) originalInit.call(this);
        // Note: Validation is now handled by a global listener in BlocklyWrapper
    };

    Blockly.Blocks[type] = def;
    if (arduinoGenerator.forBlock) arduinoGenerator.forBlock[type] = generator;
    else arduinoGenerator[type] = generator;
};

// Removed injectStandardValidation as we now use a global listener

export const registerGeneratorOnly = (type: string, generator: (block: any) => any) => {
    if (arduinoGenerator.forBlock) arduinoGenerator.forBlock[type] = generator;
    else arduinoGenerator[type] = generator;
};

export const reservePin = (block: any, pin: string, mode: string) => {
    if (block.workspace && arduinoGenerator.pins_) {
        arduinoGenerator.pins_[pin] = mode;
    }
};
