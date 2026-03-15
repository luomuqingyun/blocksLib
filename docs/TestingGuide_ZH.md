# EmbedBlocks Studio 自动化测试框架指南
(Automated Testing Framework Guide)

本文档旨在详细解释 EmbedBlocks Studio 中针对近 1400 款微控制器编译环境与 Blockly 生成引擎所设立的**纯后台自动化测试工作流**。

## 1. 测试哲学的核心：测试了什么？

我们的测试框架 (`electron/testRunner.ts`) 旨在进行 **“编译器连通性压力测试”** (Compiler Connectivity Stress Test) 与 **“代码生成验证”**。

在自动化测试流程中，我们提供两种测试维度：

### 1.1 基础连通性测试 (Base Connectivity)
- **目标 Blockly JSON 与 目标 C++ 代码均是预先生成/注入的。**
- **软件并没有在后台模拟渲染器去拖拽积木。**
- **逻辑**：验证特定芯片的底层 `JSON` 特性文件创建的项目是否能在真实编译器下运行。

### 1.2 全量积木真编译审计 (Full Scale Block Verification) [New]
- **目标**：验证 474+ 个积木在不同硬件平下的代码生成合法性。
- **技术栈**：利用 `BlockHarness` 注入快照代码，在真实 C++ 项目中进行真编译校验。
- **无头执行**：利用 Electron 主进程 + JSDOM 直接执行 `blockToCode`。

---

## 2. 如何在本地执行测试？

### 🔧 环境要求
- 必须安装 Node.js (v18+) 及 npm。
- 必须安装 PlatformIO Core (已加入系统 PATH)。

### 🏃 执行步骤

#### 维度 A：板卡编译链验证 (Board-Level)
1. **批量生成**：`npm run test:generate` (可用 `--board=xxx` 过滤)
2. **批量编译**：`npm run test:compile`
3. **销毁现场**：`npm run test:clean`

#### 维度 B：全量积木真编译审计 (Block-Level) [New]
如果您要针对所有的积木进行跨平台语法审计：

1. **导出积木清单 (Dump Manifest)**
   ```bash
   # 在 Electron 无头环境下运行，生成 block_compilation_manifest.json
   npm run dump:blocks
   ```
2. **执行编译验证 (Run Verification)**
   ```bash
   # 调用 PlatformIO 对清单中的积木分批次编译
   npm run verify:blocks
   ```
   **注意**：此过程调用 `pio build`，耗时较长。系统已配置 8GB 堆内存提权以支持大规模扫描。结果将保存至 `block_verify_report.json`。

---

## 3. 故障排查与日志 (Diagnostics)

如果积木验证失败，请按以下顺序排查：

1. **`block_verify_report.json`**: 查看失败的积木 ID 及平台退出码。
2. **`block_verify_debug.log`**: **核心日志文件**。系统会自动捕获编译器（PlatformIO）的最后 60 行报错，您可以直接看到具体的 C++ 语法错误或头文件缺失提示。
3. **`eb_block_verify_tests/`**: 验证过程生成的临时项目目录。如果需要手动复现某个积木的编译错误，可以进入该目录下对应的文件夹直接运行 `pio run`。

1. **增量测试**：如果您只修改了 `stm32` 系列，可以使用 `--board` 参数过滤。对于积木测试，可以使用 `BLOCK_FILTER` 环境变量。
2. **观察日志**：编译失败的项目会在其项目路径下留下 `test_build.log`。
3. **性能注意**：全量并行编译会占用极高的 CPU 和网络。建议在测试机器上保留足够的磁盘空间（~20GB+）。

---

## 4. UI 与界面行为调试 (UI & Interface Debugging)

- **F12 控制台**: 软件已绑定 **F12** 快捷键。
- **Toast 通知**: 观察右上角的通知气泡。
- **交互诊断日志**: 若遇到难以复现的焦点丢失，请按下 **`Ctrl + Shift + L`**。
