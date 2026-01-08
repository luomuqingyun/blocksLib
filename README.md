# EmbedBlocks Studio

EmbedBlocks Studio 是一款专为 STM32、ESP32 和 Arduino 等微控制器设计的可视化嵌入式编程环境。它将 Blockly 的可视化编程能力与专业级的 C++ 编辑器相结合，旨在简化嵌入式开发流程。

## 核心特性

- **可视化编程**：基于 Google Blockly，提供直观的积木式逻辑构建界面。
- **双模式编辑器**：可在可视化积木与专业 C++ 编辑器（基于 Monaco Editor）之间无缝切换。
- **高度集成工具链**：内置 PlatformIO 驱动，支持串口监视、开发板配置及固件上传。
- **智能帮助系统**：内置 Encyclopedia 级用户手册与插件开发指南，支持 Markdown 全文检索与代码预览。
- **原生多语言支持**：全量 UI 国际化（中/英），支持插件运行时动态翻译加载。
- **高级插件系统**：支持内置 C++ 库文件夹 (`libraries/`) 自动编译，兼容多平台（ESP32/Arduino）硬件驱动。
- **智能变量管理**：先进的变量扫描机制，确保代码生成的类型安全与语义准确。
- **可扩展架构**：基于注册表（Registry）的模块系统，方便开发者扩展硬件驱动和软件库。

## 技术栈

- **前端**：React, TypeScript, TailwindCSS。
- **可视化逻辑**：Google Blockly。
- **代码编辑器**：Monaco Editor。
- **桌面端外壳**：Electron。
- **构建系统**：PlatformIO (内置或系统安装)。
- **串口通信**：Web Serial API，利用 Xterm.js 提供高性能终端显示。

## 架构亮点

项目采用面向服务的解耦架构，并在 2026-01 完成了核心逻辑的 Hook 化重构：

### 前端 (Renderer Process)
- **解耦核心**: 采用 `Context + Hooks` 模式（如 `useProjectOps`, `useSerialMonitor`），将复杂业务逻辑从 UI 组件和 Context 提供者中分离，显著提升代码可维护性。
- **结构化生成**: 引入自研 `CodeBuilder` 引擎，自动处理 C++ 代码片段（Include/Setup/Loop）的有序组装与去重。
- **高性能 UI**: 基于 `ResizeObserver` 与防抖机制优化的响应式布局，确保在大规模图形编程时的极致流畅。
- `src/modules`: 插件化积木开发系统，通过 `ModuleRegistry` 实现高度内聚。

### 后端 (Electron Main Process)
- `electron/services`: 核心底层服务层，独立处理配置与工程化任务。
- `PioService`: 自动化管理 PlatformIO 环境，支持 100+ 开发板的离线编译。
- `ProjectService`: 处理 `.ebproj` 格式的统一项目文件方案。

## 开发指南

### 环境准备
- Node.js (v18+)
- Python (PlatformIO 必要环境)

### 安装与运行
1. 克隆代码仓库。
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动开发服务器：
   ```bash
   npm run dev
   ```

### 打包发布
执行以下命令生成分发包：
```bash
npm run release
```

## 项目文档

更多详细信息请参考 `docs` 目录：
- [修改记录 (Modification Memo)](docs/modification_memo.md): 记录最近的功能更新与修复。
- [重构指南 (Refactoring Guide)](docs/LEGACY_PATTERN_REFACTORING.md): 关于旧版生成器模式迁移的技术规范。
- [开发回顾 (Retrospective)](docs/development_retrospective.md): 项目演进的高级概述。

## 许可协议

内部专用 - EmbedBlocks
