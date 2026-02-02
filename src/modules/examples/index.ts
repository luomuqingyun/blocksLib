
/**
 * 示例模块导出文件
 * 
 * 在实际使用中，你需要将此文件中的模块导出添加到主入口 `src/modules/index.ts` 中。
 */

export * from './basic_led';
export * from './advanced_dht';
export * from './complex_module';


// ------------------------------------------------------------------
// 如何使得这些示例生效？
// ------------------------------------------------------------------
// 1. 打开 `src/modules/index.ts`
// 2. 添加导入: import { ExampleLedModule, ExampleSensorModule } from './examples';
// 3. 在 initAllModules 函数中注册:
//    ModuleRegistry.register(ExampleLedModule);
//    ModuleRegistry.register(ExampleSensorModule);
// 4. 打开 `src/config/toolbox_categories.ts`
//    将模块中的 block type (如 'example_led_control') 添加到相应的分类数组中 (如 TEST_DEV_CONTENTS)。
