import { BlockModule } from '../../../registries/ModuleRegistry';
import { initBlocks } from './blocks';
import { initGenerator } from './generator';

export const TestDevBlockModule: BlockModule = {
    id: 'test_dev_block',
    name: 'MODULE_TEST_DEV_NAME',
    init: () => {
        initBlocks();
        initGenerator();
    }
};
