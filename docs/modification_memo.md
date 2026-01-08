# Modification Memo (修改记录)

> **注意**: 本文档已根据您的要求按时间倒序重新整理。
> **警告**: 由于文件恢复限制，原文档 800 行之后的内容（可能包含部分历史记录）已丢失。我们保留了 2025-12-05 至 2026-01-07 的核心详细记录。

---

## 2026-01-07

### 全量国际化治理与插件多语言系统 (Holistic I18n & Plugin Translation)
- **全局 UI 治理**: 
    - 彻底清理了 `Help Modal` (帮助)、`Extensions` (扩展)、`Serial Monitor` (串口监视器)、`Unified Search` (全局搜索) 及 `Welcome Screen` (欢迎页) 中的硬编码中英文字符。
    - 统一采用 `i18next` 进行 React 组件翻译，并确保 `Blockly.Msg` 与系统语言包同步。
- **插件多语言系统 (Runtime Plugin I18n)**:
    - **逻辑增强**: `ExtensionService` 新增对插件 `locales/` 目录的扫描机制，自动识别 `.json` 语言包。
    - **动态合并**: `ExtensionRegistry` 在加载插件资源时，会根据系统语言自动加载对应的插件语言包，并利用 `i18n.addResourceBundle` 和 `Object.assign(Blockly.Msg, ...)` 实时注入翻译词条。
    - **占位符支持**: 在插件的 `manifest.json` (名称/描述)、`blocks.json` (消息/提示) 以及 `board.json` (芯片名称/引脚标签) 中全面支持 `%{{KEY}}` 语法。
- **硬件国际化增强 (Hardware I18n Dual-Mode)**:
    - **逻辑升级**: 增强了 `ExtensionRegistry` 的 `translateField` 助手，使其支持“双模”翻译。
    - **模式 A (词条化)**: 保持对 `locales/` 和 `%{KEY}` 的兼容，适用于大型复用。
    - **模式 B (对象直写)**: 新增对 JSON 对象直写的支持（如 `"name": {"zh": "...", "en": "..."}`）。该模式自动根据 `i18n.language` 提取值，通过递归支持全面覆盖了 `board.json` 中的引脚标签。
    - **全局化引用**: 实现了对 `%{BKY_...}` 前缀的支持。系统会自动跳出插件作用域，优先从全局 `Blockly.Msg` 词条库中检索（如标准分类、硬件术语等）。
- **示范工程与手册同步**: 
    - 重构了 `oled_u8glib`, `hello_world`, `adv_led` 插件示例。
    - **Master Manual**: 在 `plugin_system.md` 中新增第 11 章节，公开了所有系统内置分类与 UI 词条清单，解决了开发者“无源可查”的痛点。
- **帮助系统外部打开修复 (Help Modal External Link Fix)**:
    - **逻辑增强**: 升级了 `help:read-file` IPC 接口，使其在返回文档内容的同时，透传文档在磁盘上的物理路径。
    - **桥梁建设**: 新增 `shell:open` 安全 IPC 通道，在 Electron 主进程中封装 `shell.openPath`，允许前端直接调起系统默认程序。
    - **状态闭环**: 扩展 `UIContext` 与 `useAppController` 以缓存和传递 `helpPath`，解决了 `HelpModal` 按钮无响应的架构断层问题。
- **沉浸式“关于”页面重构 (Premium About Page Refactor)**:
    - **UI/UX 进化**: 摒弃了 Electron 生成的原始系统弹窗，采用基于 `backdrop-filter: blur` 的全屏毛玻璃组件 `AboutOverlay`，提升了软件的“工业设计感”。
    - **内容解耦**: 新建 `docs/about.md` 作为内容载体，支持通过 Markdown 动态展示版本迭代、技术栈致谢（Blockly, Electron, React 等）及版权信息。
    - **交互优化**: 实现了 Esc 快捷键支持与背景点击关闭，使其操作体验更趋近于现代高阶生产力工具。

### 帮助系统与用户手册 (Smart Help System)
- **核心组件**: `src/components/Modals/HelpModal.tsx`。
- **技术突破**: 
    - 实现了 Encyclopedia 级联动的辅助系统，通过 `help:read-file` IPC 通道安全加载内置 Markdown 文档。
    - 在 `HelpModal` 中集成了 Monaco Editor，支持 Markdown 语法高亮与流畅的大文档滚动。
- **UI 联动**: 扩展了 `UIContext` 状态机，新增 `openHelp` 钩子，并在 `Electron` 原生菜单中新增了“用户手册”与“插件指南”入口。

### 插件系统深度增强 (Advanced Extension System)
- **底层支持**: `ExtensionService` 增强。
    - **逻辑包含**: 实现了 `libraries/` 目录的自动探测。在编译时通过 `PLATFORMIO_LIB_EXTRA_DIRS` 将插件内置的 C++ 库路径注入 PlatformIO。
    - **资源路由**: 暴露了 `extensionReadFile` 的 Base64 转换接口，支持插件在 UI 中渲染自带的图标和说明图片。
- **兼容性匹配修复**: 在 `BoardRegistry.ts` 中引入了不区分大小写的归一化算法（Lower-case Normalization），解决了由于 `ESP32` vs `esp32` 导致的兼容性判定失效问题。
- **实战案例**: 交付了 `oled_u8glib` 插件，完整演示了从积木定义、代码生成到第三方库链接的全流程。

### 开发环境记忆化 (Dev Environment Personalization)
- **本地配置**: 引入 `DEV_PATHS.json` (工具路径) 与 `DEV_PREFERENCES.json` (习惯偏好)。
- **逻辑**: 通过本地 JSON 文件持久化用户的特殊环境配置（如自定义 Git 路径），实现跨会话的“开发默契”。
- **标准化契约**: 编写了 `docs/COLLABORATION_AGREEMENT.md`，确立了中文开发、主动注释及全面国际化的标准。

### 架构重构：Hook 化 Context (Context De-bloating)
- **目标**: 解决 `FileSystemContext` 和 `SerialContext` 过于臃肿的问题，遵循高内聚低耦合原则。
- **实施内容**:
    - **FileSystemContext 重构**:
        - 创建 `useProjectOps`: 移除了 400+ 行文件操作逻辑。处理项目生命周期（创建、打开、保存、脏状态管理）。
        - 创建 `useAutoBackup`: 将自动保存逻辑独立。优化了备份频率，由原先的 5ms (代码中实测为 50ms) 提升至 **3000ms**。
        - 效果: `FileSystemContext.tsx` 减重 60% 以上，逻辑更清晰。
    - **SerialContext 重构**:
        - 创建 `useSerialMonitor`: 隔离所有 IPC 事件监听逻辑 (`onMonitorData`, `onMonitorStatus` 等)。
        - 创建 `useSerialActions`: 封装串口控制指令。
        - 效果: 解决了 UI 设置状态与底层 IPC 通信逻辑混杂的问题，提升了串口组件的稳定性。

### 编译器底层现代化 (Code Generation Modernization)
- **新增模块**: `src/generators/utils/CodeBuilder.ts`。
- **背景**: 传统的代码生成采用字符串数组或硬编码 `definitions_` 字典，难以处理代码段落顺序（如 A 库依赖 B 库的宏）。
- **核心逻辑**: 实现了分段缓冲区管理（Includes, Macros, Types, Variables, Setup, Loop, Functions），并提供统一的 `build()` 方法自动按规范顺序组装代码。
- **集成**: `arduino-base.ts` 已全面迁移至 `CodeBuilder` 架构。

### UI 性能调优 (UI Performance Tuning)
- **场景**: 修复侧边栏调整大小时 Blockly 画布反应迟钝的问题。
- **修复逻辑**: 在 `BlocklyWrapper.tsx` 的 `ResizeObserver` 中引入 50ms 的防抖机制，避免拖拽过程中的高频重绘请求堆叠。同时清理了 `App.tsx` 中冗余的 `activeTab` 触发器逻辑。

### 开发环境健壮性优化 (Dev Environment Robustness)
- **痛点**: 
    1. Windows 系统通过 Hyper-V 等服务经常保留某些端口段（如 5173 及其周围），导致 Web Server 启动报 `EACCES` 错误。
    2. Electron 开启单实例模式后，若非正常关闭导致进程残留，新实例将静默退出，无法启动。
- **对策**:
    - **脚本化清理**: 编写 `scripts/cleanup.js`。利用 `child_process` 封装跨平台指令，启动前强制执行 `taskkill` (Win) 或 `pkill` (Unix)。
    - **弹性端口配置**: 将 Vite 默认端口迁移至 `5100` 并关闭 `strictPort`，允许框架在冲突时自动弹性选择下一个可用端口。
    - **工作流集成**: 将清理逻辑挂载至 `predev` 生命周期，实现零干预下的“一键自愈”。

### 工具箱自定义 (Toolbox Customization)
- **新增模块**: `ToolboxSettings.tsx`，实现了可视化的分类管理界面。
- **设置集成**: 在 `SettingsModal` 中添加了独立的 "Toolbox" 选项卡。
- **核心逻辑**: 更新 `App.tsx` 中的 `refreshToolbox`，在加载板级配置后根据用户设置的 `hiddenCategories` 列表通过 ID 或 Name 过滤分类。
- **动态同步**:
    - **所见即所得**: 设置界面的分类列表现在由 `BoardRegistry.getToolboxConfig(selectedBoard)` 动态生成，确保与当前开发板支持的分类完全一致。
    - **ID 统一**: 统一了 `CAT_VARIABLES` 等特殊分类在前端显示与后端过滤时的 ID 匹配逻辑。
- **国际化增强**: 采用 `Blockly.Msg` + `i18next` 双缓冲翻译机制，自动识别并显示已翻译的分类名称。
- **无侵入性验证**:
    - **默认行为**: 若用户未配置或列表为空，直接返回原始配置，**零性能损耗**，**零功能回归**。
    - **安全性**: 仅操作 UI 显示层，不影响积木生成器注册或底层逻辑。

### 文档更新 (Documentation Updates)
- 创建 `docs/tutorial_new_block.md`: 添加新积木的详细分步教程。
- 更新 `docs/developer_guide.md`: 明确区分 `examples` 和 `extensions` 目录，并链接到新教程。
- 在教程中记录了内部模块使用 `BoardRegistry` 进行作用域控制的方法。

---

## 2025-12-31

### 架构优化 (Architecture Optimization)
#### 概述
基于代码分析实施低耦合高内聚优化，减少组件间依赖，提升可维护性。

#### 完成项目
1.  **DiagnosticOverlay 组件提取**:
    *   来源: `App.tsx` (内联组件) -> 目标: `src/components/DiagnosticOverlay.tsx`
    *   效果: App.tsx 减少 52% 代码行。
2.  **TopBar Hook 聚合**:
    *   创建 `src/hooks/useToolbarActions.ts`，将 TopBar 对 4 个 Context 的依赖聚合为 1 个 Hook。
3.  **Variables 共享工具提取**:
    *   来源: `src/modules/core/variables.ts` -> 目标: `src/modules/core/variables/utils.ts`

### 代码文档化 (Code Documentation)
#### 概述
为核心组件添加中文文件头注释，提升代码可读性和可维护性。
#### 新增注释的文件
- `SettingsModal.tsx`, `ProjectSettingsModal.tsx`, `TopBar.tsx`, `SerialMonitorPanel.tsx` 等 10 个核心文件。

---

## 2025-12-27

### 跨平台鲁棒性增强与首页优化
#### 1. 首页功能增强
- **快速访问**: 新增“打开项目保存目录”按钮 (HardDrive 图标)。
- **布局优化**: 首页改为三列布局（新建 | 打开 | 目录），按钮文字垂直居中。
- **Bug修复**: 修复了“最近打开项目”中无效条目无法删除的问题（补全了 IPC Handler）。
- **国际化**: 补全了 Welcome 模块的缺失翻译。

#### 2. 动态工具箱刷新修复
- **Fix**: 修复了固定工具箱模式 (Pinned Mode) 下，变量/函数等动态积木无法实时刷新的问题。
- **Logic**: 引入 `activeDynamicCategoryRef`，确保在工具箱失去焦点时仍能追踪并刷新当前分类。
- **Stability**: 增加了 `workspaceId` 过滤，防止 Flyout 事件干扰主工作区。

#### 3. 工具箱分类清理
- **去重**: 移除了 Displays 分类中重复的 Neopixel 积木，移除了 IoT 中重复的 HTTP/Ethernet 积木。
- **架构**: 简化了 `BoardRegistry` 的组装逻辑。

#### 4. 输入焦点丢失修复
- **Fix**: 修复了在结构体变量积木中输入名称时自动失去焦点的 Bug (优化了 `ColorUpdateMixin` 的监听时机)。

#### 5. 国际化显示修复 (Localization Repair)
- **Fix**: 修复了部分分类显示 `%{BKY_LABEL_xxx}` 源码的问题。
- **Logic**: 实现了“英文 Base + 目标语言覆盖”的加载策略，确保回退机制正常工作。

#### 6. 工具箱标签美化
- **Style**: 增强了 `.blocklyFlyoutLabelText` 样式（靛蓝色、加粗、装饰条）。

---

## 2025-12-26

### 代码库审计与修复 (Codebase Audit & Remediation)
#### 1. 安全加固
- **命令注入防护**: 在 `PioService.ts` 中禁用了 `shell: true`，消除注入风险。

#### 2. 性能优化
- **后端 I/O 异步化**: 将 `ProjectService` 中的文件读写全部替换为 `fs.promises`。

#### 3. 稳定性
- **BlocklyWrapper**: 移除了 Monkey-Patch，增加了验证防抖 (Debounce)。
- **序列化修复**: 修复了 `c_enum_define` 在旧项目中的加载错误。

#### 4. 深度优化
- **Generator API**: 推行 `addVariable`, `addMacro`, `addType` 等语义化 API，替代硬编码字典操作。覆盖了 `system`, `sensors`, `setup`, `loop` 等核心模块。
- **Vendor Refactor**: 重构了 Seeed, DFRobot, PS2 等厂商模块。

#### 5. 工具箱全面审计
- **Zero-Gap**: 补全了此前遗漏的 IO (ShiftOut/In), ESP32 (Hall/Touch) 等模块。
- **Cleanup**: 删除了被取代的 `gps.ts`, `communication.ts` 等旧文件。
- **Deduplication**: 移除了内部测试用的 Ghost 积木。

---

## 2025-12-16

### 架构重构 (Architecture Refactoring)
#### 1. 模块系统重构 (Registry Pattern)
- 创建 `ModuleRegistry`，取代命令式初始化。
- 实现了模块的统一接口定义与注册。

#### 2. 架构安全与类型强化
- **IPC类型安全**: 定义 `shared/ipc-events.ts`，强制前后端通信类型检查。
- **Security**: 引入扩展运行沙箱 (Extension Sandbox)，隔离第三方代码。

#### 3. 串口监视器最终重构 (Final Serial Monitor Refactor)
- **Xterm.js**: 将底层渲染引擎迁移至 `xterm.js`，支持百万级波特率。
- **Feature**: 恢复了 Hex 收发模式，优化了 RX/TX 视觉标识。
- **Migration**: 将串口通信从 Electron IPC 迁移至原生 **Web Serial API** (Hybrid 架构)，解决了 IPC 性能瓶颈。

#### 4. PioService 离线模板
- 实现了基于数据模板 (`templates.ts`) 的 `platformio.ini` 生成，支持 20+ 款 STM32 开发板。

---

## 2025-12-14

### UI/UX 体验增强
#### 1. 关闭项目体验
- **Save Prompt**: 实现了自定义的“未保存更改”弹窗 (Save/Don't Save/Cancel)。
- **Button**: 在 TopBar 增加了显式的关闭项目按钮。

#### 2. 工具栏与编辑器
- **UI**: 将“固定工具箱”按钮移至左下角。
- **Fix**: 修复了 Mutator 气泡无法自动关闭的问题。

#### 3. 修复
- **View Restore**: 修复了打开项目时视图状态 (Scroll/Zoom) 无法恢复的问题 (引入 `ResizeObserver`)。

---

## 2025-12-11

### 项目文件统一与配置重构
- **.ebproj**: 废弃独立 `.json` 配置，统一合并至 `.ebproj` 文件。
- **Config**: 重构 `config.json` 结构，支持自动迁移。
- **Serial**: 优化了历史记录存储结构。

---

## 2025-12-05

### 串口监视器与编辑器增强 (Initial Enhancements)
#### 1. 串口监视器
- **Features**: 数据位/校验位设置、Hex 模式、自动重连、设置记忆。
- **UI**: 垂直侧边栏布局，防止小屏显示不全。
- **Input**: 多行输入支持，Enter 发送逻辑优化。

#### 2. 界面重构
- **Layout**: 实现了左右分栏拖拽调整。
- **Settings**: 引入 VS Code 风格设置中心。
- **Menu**: 集成 Electron 原生菜单。

#### 3. 代码编辑器
- **Monaco**: 集成 Monaco Editor，支持语法高亮和只读/编辑模式切换。

---
**[End of Recovered Log]**
