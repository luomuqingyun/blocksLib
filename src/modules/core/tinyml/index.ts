import { BlockModule } from '../../../registries/ModuleRegistry';
import { defineBlocks } from './blocks';
import { defineGenerators } from './generator';

const init = () => {
    defineBlocks();
    defineGenerators();
};

export const TinyMLModule: BlockModule = {
    id: 'core.tinyml',
    name: 'Edge AI (TinyML)',
    category: 'Logic', // Keeping original category for now
    init
};
