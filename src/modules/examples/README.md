
# EmbedBlocks 示例库

本目录存放官方提供的扩展示例代码。

请阅读 **[内部开发人员插件开发指南](../../../docs/内部开发人员插件开发指南.md)** 获取完整的教程。

## 快速索引

### 🧱 积木模块 (Modules)
位于 `src/modules/examples/`:

- **`basic_led/`**: 入门示例。
- **`advanced_dht/`**: 进阶示例 (第三方库封装)。
- **`complex_module/`**: 架构示例 (推荐参考)。

### 🖥️ 芯片配置 (Boards)
(已移动至 `src/config/custom/`)

- **`my_board.ts`**: 单板配置。
- **`extended_series/`**: 自动化系列配置 (Auto-Discovery)。

---

## 🚀 如何启用示例 (How to Enable)

这些示例模块默认 **不会** 在应用中加载，你需要手动进行注册和配置。请按照以下步骤操作：

### 1. 注册核心模块
打开 `src/modules/index.ts`，导入并注册你想使用的示例模块。

```typescript
// src/modules/index.ts

// A. 导入模块
import { ExampleLedModule, ExampleSensorModule } from './examples';

// B. 在 initAllModules() 函数中注册
export const initAllModules = () => {
    // ... 其他模块
    ModuleRegistry.register(ExampleLedModule);
    ModuleRegistry.register(ExampleSensorModule);
};
```

### 2. 配置工具箱显示
注册后，积木只是被加载到了 Blockly 引擎中，你还需要告诉界面“在哪里显示它们”。
打开 `src/config/toolbox_categories.ts`，将积木 ID 添加到某个分类中（例如 `Test Dev` 分类）。

```typescript
// src/config/toolbox_categories.ts

export const TEST_DEV_CONTENTS = [
    { kind: 'label', text: 'Dev Test' },
    { kind: 'block', type: 'test_dev_log' },
    
    // --- 添加示例积木 ---
    { kind: 'label', text: 'Examples' },
    { kind: 'block', type: 'example_led_control' }, // 来自 ExampleLedModule
    { kind: 'block', type: 'example_dht_init' },    // 来自 ExampleSensorModule
    { kind: 'block', type: 'example_dht_read_temp' }
];
```

### 3. (可选) 添加中文翻译
如果需要积木显示中文，请在 `src/locales/setupBlocklyLocales.ts` 中添加对应的翻译键值。
- `ARD_EXAMPLE_LED_CONTROL`
- `ARD_EXAMPLE_DHT_INIT`
- 等等...

### 4. 验证
运行 `npm run dev`，在左侧工具箱的 **Dev Test** 分类下，你应该能看到新添加的积木。
