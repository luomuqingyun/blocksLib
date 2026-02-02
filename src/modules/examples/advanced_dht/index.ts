import { BlockModule } from '../../../registries/ModuleRegistry';
import { initAdvancedDHTBlocks } from './blocks';

/**
 * 示例 2: 高级传感器模块 (DHT)
 * 
 * 这是一个遵循 "文件夹即模块" 结构的重构版本。
 */

export const ExampleSensorModule: BlockModule = {
    id: 'examples.dht',
    name: 'examples.dht_name',
    init: initAdvancedDHTBlocks
};
