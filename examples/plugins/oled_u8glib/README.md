# OLED U8glib-HAL 插件 (完整示例)

这是一个包含了完整 C++ 硬件驱动依赖的插件示例。

## 状态
- [x] **插件逻辑**: 已编写 (manifest.json, blocks.json, generator.js)
- [x] **硬件驱动**: 已内置 (libraries/U8glib-HAL)

## 快速使用
1.  **无需手动下载**: 本示例已通过 Git 自动集成了 `U8glib-HAL` 库源码。
2.  **直接导入**: 在 EmbedBlocks Studio 中，前往 **"扩展" (Extensions)** 面板，点击 **"导入" (Import Local)**，选择这个 `oled_u8glib` 文件夹。
3.  **开始编程**: 导入成功后，您将在“Display”分类下看到 OLED 相关积木。

## 目录结构
```text
oled_u8glib/
├── libraries/
│   └── U8glib-HAL/      # [已内置] 核心硬件驱动源码
├── manifest.json        # 插件定义
├── blocks.json          # 图形化积木定义
└── generator.js         # C++ 代码生成逻辑
```

## 技术亮点
-   **零配置集成**: 演示了如何利用软件的自动链接机制，将复杂的第三方库无缝嵌入图形化编程环境。
-   **多平台适配**: 底层驱动支持 Arduino 与 ESP32。
