
# 扩展模块目录 (User Extensions)

这是一个推荐的“统一代码库”位置。

## 为什么放在这里？

无论您是想作为**内置功能**编译进软件，还是未来想打包成**动态插件**，都建议遵循统一的开发规范：

1.  **每个插件一个文件夹** (Folder-per-module)。
2.  **分离定义与注册** (Separate Definition & Registration)。
    - `index.ts`: 负责导出模块 `defineBlockModule(...)`。
    - `blocks.ts`: 负责积木 UI。
    - `generator.ts`: 负责代码生成。

## 统一工作流 (Unified Workflow)

1.  **开发阶段**:
    - 在此目录下创建你的模块文件夹。
    - 在 `src/modules/index.ts` 中引入并注册它 (手动挡)。
    - 使用 `npm run dev` 调试。

2.  **发布阶段 (未来)**:
    - 我们将提供一个构建脚本，将此目录下的文件夹自动打包成 `.zip` 插件包。
    - 用户可以在 IDE 的 Extensions 界面导入该插件。

保持代码都在这里，您可以进退自如。
