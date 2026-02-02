/**
 * ============================================================
 * TinyML 边缘 AI 模块 (Edge AI / TinyML Module)
 * ============================================================
 */

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
    init
};
