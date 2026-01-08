import { defineBlockModule } from '../../../utils/extension_helpers';
import { initComplexBlock } from './blocks';

/**
 * 最佳实践示例：模块入口文件
 */
export const ComplexModule = defineBlockModule({
    id: 'examples.complex',
    name: 'examples.complex_name',
    category: 'SENSORS',
    init: () => {
        // 在这里调用其他文件的初始化函数
        initComplexBlock();
        console.log('Complex module initialized');
    }
});
