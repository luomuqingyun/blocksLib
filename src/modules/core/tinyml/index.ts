/**
 * ============================================================
 * TinyML 边缘 AI 模块 (Edge AI / TinyML Module)
 * ============================================================
 * 
 * 提供 TensorFlow Lite Micro 机器学习积木:
 * - 模型加载和推理
 * - 传感器数据预处理
 * - 分类结果处理
 * 
 * @file src/modules/core/tinyml/index.ts
 * @module EmbedBlocks/Frontend/Modules/Core
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
    category: 'Logic', // Keeping original category for now
    init
};
