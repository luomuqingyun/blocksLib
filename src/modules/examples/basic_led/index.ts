import { BlockModule } from '../../../registries/ModuleRegistry';
import { initBasicLedBlocks } from './blocks';

/**
 * 示例 1: 简单的 LED 控制模块 (基础示例)
 * 
 * 这是一个遵循 "文件夹即模块" 结构的重构版本。
 */

export const ExampleLedModule: BlockModule = {
    id: 'examples.led',
    name: 'examples.led_name', // Use key for registry to potentially handle (or we just manually handle if needed)
    init: initBasicLedBlocks
};
