# EmbedBlocks 内部开发架构指南 (Internal Core Guide)

**适用对象**: 核心开发人员、源代码维护者。
**前提条件**: 拥有项目完整源码，能运行 `npm run dev`。

本文档指导如何在**源码层面**修改和扩展 EmbedBlocks Studio。如果您是希望制作插件分发给用户的第三方开发者，请移步 [用户插件开发指南](./plugin_system.md)。

---

## 1. 扩展积木 (Adding Custom Blocks)

EmbedBlocks 采用模块化架构系统。

### 1.1 最佳实践：文件夹即模块 (Folder-based Modularity)

### 1.1 最佳实践：统一扩展目录 (Unified Directory)

为了统一管理所有扩展（无论是积木还是芯片），我们建立了标准的目录结构。请将您的所有扩展代码放在这里：

- **积木扩展**: `src/modules/extensions/`
- **芯片扩展**: `src/config/custom/`

这不仅让项目目录更整洁，也为未来将扩展打包成独立插件事先做好了准备。

> [!NOTE]
> **文件夹用途区别**:
> - `src/modules/examples`: **官方示例库**。仅供参考，不建议直接在此修改。
> - `src/modules/extensions`: **开发者工作区**。这是您添加自定义积木代码的推荐位置。



**推荐结构**:
```text
src/modules/extensions/ (推荐新建此目录用于存放扩展)
└── my_sensor/               <-- 模块专属文件夹
    ├── index.ts             <-- 入口文件 (只负责导出模块定义)
    ├── blocks.ts            <-- 积木 UI 定义
    ├── generator.ts         <-- Arduino 代码生成逻辑
    ├── assets/              <-- 资源文件
    └── README.md            <-- 说明文档
```

### 1.2 开发步骤

1.  **创建目录**: 在 `src/modules/extensions/` 下新建你的模块文件夹。
2.  **编写积木**: 参考 `src/modules/examples/complex_module/` 示例。
3.  **注册模块**: 
    EmbedBlocks **不会自动扫描**积木模块。你必须显式注册。
    
    打开 `src/modules/index.ts`:
    ```typescript
    // 1. 引入
    import { MySensorModule } from './extensions/my_sensor';
    
    export const initAllModules = () => {
        // ...
        // 2. 注册
        ModuleRegistry.register(MySensorModule);
    };
    ```

### 1.3 积木定义参考

- **Arduino Generator Helpers**: 请务必使用 `arduinoGenerator.addInclude`, `addVariable`, `addSetup` 等辅助方法。
- **结构化生成**: 系统现在内置了 [CodeBuilder](file:///c:/Users/wofy/Desktop/embedblocks-studio/src/generators/utils/CodeBuilder.ts) 引擎。它可以自动处理代码段落（Include, Macro, Global, Setup, Loop）的冲突和排序。
- **国际化 (I18n)**: **严禁硬编码 UI 字符串**。
    - 所有积木标签、提示、下拉选项必须引用 `Blockly.Msg`。
    - 对应的词条需同步添加到 `src/locales/zh.json` 和 `en.json`。
- **示例代码**: 见 `src/modules/examples/`。

👉 **[新手教程：手把手教你添加新积木 (Step-by-Step Tutorial)](./tutorial_new_block.md)**


---

## 2. 核心架构逻辑 (Core Architecture)

项目在 2026-01 进行了深度重构，采用 **Context + Hooks** 的解耦模式。

### 2.1 状态管理与业务逻辑分离
核心 Context 现在仅负责存储状态和分发 Provider，具体的业务逻辑（I/O、IPC 通讯、算法）被提取到了专门的 Hooks 中：

| 模块 | 核心 Hook | 职责 |
| :--- | :--- | :--- |
| **文件系统** | `useProjectOps` | 处理项目创建、打开、保存、元数据同步。接收分组后的 `ProjectState` 对象。 |
| | `useAutoBackup` | 处理静默自动保存逻辑（防抖时间 3000ms）。 |
| **串口通讯** | `useSerialMonitor` | 统一订阅和分发后端 IPC 串口事件。在 `SerialContext` 中结合 `useReducer` 管理复杂状态。 |
| | `useSerialActions` | 封装所有底层的串口控制指令。 |
| **UI/Toolbox** | `useToolbox` | 核心解耦 Hook。封装了基于当前型号和语言的工具箱分类加载、过滤与刷新逻辑。 |

### 2.2 状态管理进化：useReducer 模式
对于具有大量关联参数的模块（如串口设置），我们采用了 `useReducer` 替代分散的 `useState`。

**优势**:
- **原子性**: 确保波特率、校验位等多个关联参数在同一个 Action 中更新，防止由于渲染异步导致的中间状态不一致。
- **可维护性**: 所有的状态修改逻辑都集中在 Reducer 函数中，易于追踪和调试。

### 2.2 代码生成引擎 (CodeBuilder)
为了解决复杂的库依赖和 Setup/Loop 初始化冲突，项目引入了 `CodeBuilder` 机制。

**优势**:
1. **防重性**: 自动去重重复的 `#include` 语句。
2. **有序性**: 严格保证宏定义 -> 类型定义 -> 全局变量 -> 函数原型的生成逻辑顺序。
3. **注入性**: 支持在任意积木中通过 `addSetup` 或 `addLoop` 注入初始化代码，无需关心主函数的结构。

**使用示例**:
```typescript
// 在 generator.ts 中
arduinoGenerator.addInclude('sensor_lib', '#include <MySensor.h>');
arduinoGenerator.addSetup('sensor_init', 'mySensor.begin();');
arduinoGenerator.addVariable('sensor_obj', 'MySensor mySensor(1, 2);');
```

---

## 3. 扩展芯片支持 (Adding Custom Support for Boards)

芯片配置不再建议修改核心文件，而是采用**外挂配置**的方式。

> [!IMPORTANT]
> **开发板配置的双重路径**:
> 1. **内置扩展 (TS 格式)**: 针对核心开发者。在源码 `src/config/custom/` 中编写 TypeScript 对象，直接编译进软件。
> 2. **外部插件 (JSON 格式)**: 针对分发需求。在插件目录中使用 `board.json` 定义硬件（无需重新编译）。**硬件插件的目录标准请参考 [插件系统手册-硬件规范](./plugin_system.md#81-标准硬件扩展目录结构)**。

### 3.1 方案 A：单个自定义板子 (Single Custom Board)

适用于只需要添加一两个特定板子的情况。

1.  **定义**: 在 `src/config/custom/` 下创建 `.ts` 文件 (如 `my_board.ts`)。
2.  **注册**: 修改 `src/config/esp32_boards.ts` (或对应家族文件)。

```typescript
// src/config/esp32_boards.ts
import { MY_CUSTOM_BOARD } from './custom/my_board'; 

export const ESP32_SERIES: BoardSeries[] = [
    {
        // ... 现有系列
        boards: [ ..., MY_CUSTOM_BOARD ] // 加入已有的系列列表
    }
];
```

### 2.2 方案 B：大规模自定义系列 (Zero-Config Series) —— **推荐**

适用于需添加大量板子或希望实现“文件即注册”的情况。我们利用 Vite 的 `glob` 功能实现了自动发现。

1.  **从哪里开始**: 查看 `src/config/custom/extended_series/` 目录。
2.  **如何添加**: 
    - 只需在该目录下创建 `board_xxx.ts`。
    - 或者创建 `board_yyy/index.ts` 文件夹。
    - **无需写任何注册代码**。该目录下的 `index.ts` 会自动扫描并加载所有板子。
### 2.3 综合注册示例 (Integration)

可以将上述两种方法混合使用。修改家族文件 `src/config/esp32_boards.ts` 如下：

```typescript
// 1. 引入单个板子 (方案 A)
import { MY_CUSTOM_BOARD } from './custom/my_board'; 
// 2. 引入整个系列 (方案 B)
import { MY_CUSTOM_SERIES } from './custom/extended_series';

export const ESP32_SERIES: BoardSeries[] = [
    // ... 原有的官方系列 ...
    {
        id: 'esp32_generic',
        name: 'Generic ESP32',
        boards: [
            ESP32_DEVKIT_V1,
            MY_CUSTOM_BOARD, // <--- 方案 A：加入现有列表
        ]
    },
    
    // ... 
    
    MY_CUSTOM_SERIES // <--- 方案 B：作为一个独立的分组加入
];
```

通过这种方式，您可以灵活地管理不同规模的自定义硬件。


---

## 3. 示例资源索引 (Example Index)

所有示例代码均已标准化，可直接复制使用。

| 类型 | 路径 | 说明 |
| :--- | :--- | :--- |
| **基础积木** | `src/modules/examples/basic_led/` | 最简单的 LED 控制，展示模块结构。 |
| **高级积木** | `src/modules/examples/advanced_dht/` | 封装第三方库 (include, setup) 的完整流程。 |
| **积木架构** | `src/modules/examples/complex_module/` | **最佳实践**：展示 blocks/generator/index 分离。 |
| **单芯片** | `src/config/custom/my_board.ts` | 简单的单文件芯片配置。 |
| **多芯片** | `src/config/custom/extended_series/` | **最佳实践**：支持自动发现的芯片系列管理。 |

---

## 4. 插件系统开发 (Plugin System)

如果您希望开发**不需要重新编译软件**即可分发的插件（适合最终用户），请参考独立的插件开发指南：

👉 **[插件系统深度手册 (Master Manual)](./plugin_system.md)**

该手册已全面升级，核心亮点包括：
- **深度国际化支持**: 支持 `%{KEY}` 占位符、`%{BKY_...}` 全局词条引用。
- **双模翻译方案**: 支持“词条引用”与“对象直写”两种模式，大幅简化了轻量级硬件插件的开发流程。
- **技术底层解密**: 全面还原了 C++ 库集成环境变量、生成器 API 细节及硬件兼容性逻辑。
- **示范工程全量覆盖**: 所有官方示例均已根据最新标准完成 I18n 适配。

---

## 5. 工具箱定制化逻辑 (Toolbox Customization)

EmbedBlocks 支持用户在设置界面手动隐藏/显示特定工具箱分类。

### 5.1 过滤原理 (Filtering Mechanism)

工具箱的过滤发生在 `src/App.tsx` 的 `refreshToolbox` 函数中：
1.  **加载板级配置**: 调用 `BoardRegistry.getToolboxConfig(selectedBoard)` 获取初始分类列表。
2.  **获取用户偏好**: 从本地存储加载 `hiddenCategories`（分类 ID 字符串数组）。
3.  **执行过滤**: 遍历 `contents`，检查 `item.id || item.name` 是否在隐藏列表中。

### 5.2 动态同步 (Dynamic Sync)

设置中心 (`ToolboxSettings.tsx`) 的列表是**非硬编码**的：
- 它会实时调用 `BoardRegistry` 获取当前开发板的实际工具箱定义。
- 这保证了设置界面呈现的分类与左侧侧边栏看到的完全对应。

### 5.3 特殊分类：Dev Test (红色标记)

在开发板配置中，您可能会看到一个带有红色图标的 **Dev Test** 分类。
- **含义**: 这是系统预留的开发调试分类（定义在 `BoardRegistry.ts` L126）。
- **用途**: 专门用于开发者验证新开发的积木，不建议普通用户开启。
- **移除**: 若需正式发布，可在 `BoardRegistry.generateToolbox` 中将其代码行删除或注释。

- 搜索字典归一化：若新增积木涉及特定的中英文对应关系，请同步维护 `src/config/search_dictionary.ts`。

## 6. 开发者偏好与记忆 (Developer Preferences)

项目支持通过本地配置文件自定义开发体验，这些文件已被加入 `.gitignore`。

- **`DEV_PATHS.json`**: 存储本地工具的绝对路径（如 `git.exe`），解决跨环境路径识别问题。
- **`DEV_PREFERENCES.json`**: 存储个人习惯偏好（语言、注释风格、I18n 强制等级）。

### 2.2 协作契约 (Tacit Agreement)

所有开发者均需遵守 **[协作默契指南](./COLLABORATION_AGREEMENT.md)**，核心准则包括：
-   **中文优先**: 对话、反馈及文档默认使用简体中文。
-   **代码自注释**: 修改逻辑时必须主动添加中文注释。
-   **I18n 严控**: 杜绝硬编码 UI 字符串，同步维护 `src/i18n`。

---

## 7. UI 设计范式与沉浸式交互 (UI Design Patterns)

EmbedBlocks 追求“工业级”的视觉美感。在开发新 UI 时应遵循以下规范：

### 7.1 沉浸式覆盖层 (Immersive Overlays)
对于大型信息展示（如“关于”页面），推荐使用 **AboutOverlay 模式** 替代传统弹窗：
- **视觉控制**: 使用 `backdrop-filter: blur(12px)` 实现毛玻璃背景。
- **动效**: 结合 Tailwind 的 `animate-in fade-in` 和 `zoom-in-95` 提升流畅度。
- **状态管理**: 统一挂载在 `App.tsx` 的 `GlobalListeners` 中，通过 `UIContext` 驱动状态。

### 7.2 Markdown 渲染规范
系统内置了 `MarkdownRenderer` 组件。在展示文档时：
- **层级管理**: 确保父容器具备 `prose prose-invert` 类名以降级渲染标准 Markdown 样式。
- **自定义滚动**: 使用 `custom-scrollbar` 保持与 IDE 整体风格一致。

---

## 8. 系统桥梁扩展 (IPC Bridge)

若需新增与操作系统交互的功能（如文件操作、外部程序调起）：

### 8.1 路径传递原则
在读取项目或帮助文档时，IPC 接口应采用 **(Content, Path)** 对象模式返回。这允许前端在需要时执行“在外部打开”或“跳转至目录”等二次操作。

### 8.2 安全调起 (Shell Bridge)
通过 `shell:open` 统一处理外部路径打开请求。前端应通过 `window.electronAPI.openExternal(path)` 安全调用，严禁在渲染进程直接操作 `shell` 模块。

---

## 9. FAQ

**Q: 为什么积木不能像芯片那样自动发现？**
A: 积木涉及到复杂的 UI 初始化和 Blockly 上下文注入，目前显式注册能保证更高的稳定性和构建优化 (Tree-shaking)。

**Q: 我修改了 `platformio.ini` 相关的字段，需要重置项目吗？**
A: 是的。构建配置缓存在项目中。修改板子定义后，建议并在 IDE 中执行 "Clean Build" 或重新生成配置文件。

**Q: 启动开发服务器时提示 `EACCES: permission denied` 怎么办？**
A: 这是因为 Windows 可能保留了该端口范围（由 Hyper-V 或内部服务使用）。项目已默认改用 `5100` 端口并开启了自动端口搜寻（`strictPort: false`）。如果依然报错，系统会自动尝试下一个可用端口。

**Q: 为什么新启动的应用无法打开或提示“单实例限制”？**
A: 如果之前的应用实例没有正常退出，可能会残留后台进程。我们提供了 `npm run dev` 自动清理机制。您也可以手动运行 `node scripts/cleanup.js` 来强制终止所有残留的 Electron 进程。
