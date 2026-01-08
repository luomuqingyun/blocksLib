// @ts-nocheck
/**
 * 变量模块入口 (Variables Module Entry)
 * 
 * 汇总导出所有变量相关子模块，保持向后兼容。
 */
import { BlockModule } from '../../../registries/ModuleRegistry';

// 导入子模块初始化函数
import { initBasicBlocks } from './basic';
import { initMacroBlocks } from './macros';
import { initArrayBlocks } from './arrays';

// 重新导出共享工具
export * from './utils';

/**
 * 初始化所有变量相关积木
 */
const init = () => {
    // 基础变量 (声明、赋值、获取)
    initBasicBlocks();

    // 宏定义 (#define, #include)
    initMacroBlocks();

    // 数组 (定义、访问)
    initArrayBlocks();

    // TODO: 后续阶段迁移
    // initStructBlocks();  // 结构体
    // initEnumBlocks();    // 枚举
    // initAdvancedBlocks(); // 高级 (sizeof, cast, 指针等)
};

export const VariablesModularModule: BlockModule = {
    id: 'core.variables_modular',
    name: 'Variables & Data Types (Modular)',
    init
};
