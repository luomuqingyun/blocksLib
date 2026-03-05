# EmbedBlocks Studio 自动化测试框架指南
(Automated Testing Framework Guide)

本文档旨在详细解释 EmbedBlocks Studio 中针对近 1400 款微控制器编译环境与 Blockly 生成引擎所设立的**纯后台自动化测试工作流**。

## 1. 测试哲学的核心：测试了什么？

我们的测试框架 (`electron/testRunner.ts`) 旨在进行 **“编译器连通性压力测试”** (Compiler Connectivity Stress Test) 与 **“代码生成验证”**。

在自动化测试流程中：
- **目标 Blockly JSON 与 目标 C++ 代码均是预先生成/注入的。**
- **软件并没有在后台模拟渲染器去拖拽积木。**（因为 Blockly 引擎深度绑定浏览器 DOM 环境，无头运行会极其消耗性能甚至导致进程崩溃）。

因此，测试程序采用**底层侵入注入法**：
1. **真实外壳创建**：调用真实的底座服务 (`ProjectService.createProject`)，根据不同芯片的底层 `JSON` 特性文件创建具有对应环境元数据的项目。确保 `platformio.ini` 等配置合乎该单片机要求。
2. **模拟 Blockly 注入**：将一份经过预先严密设计好的、能在所有支持环境均能工作的真实 Blockly 业务代码 JSON (例如：控制 `LED_BUILTIN` 的数字写及翻转) 直接写入项目的 `.ebproj` 文件。从而做到只要被打开，就是合法项目。
3. **真实等效 C++ 注入**：为了验证编译器（PlatformIO）与开发板变体定义（Variant）是否匹配（即能否通过底层链接阶段），我们将上述积木逻辑生成的等效 C++ 源码注入到 `src/main.cpp`。

---

## 2. 如何在本地执行测试？

### 🔧 环境要求
- 必须安装 Node.js (v18+) 及 npm。
- 必须安装 PlatformIO Core (已加入系统 PATH)。

### 🏃 执行步骤

如果您要验证整个软件架构修改后是否破坏了某些厂家的板卡编译链：

#### 批量生成测试工程
```bash
npm run test:generate
# 同样支持并发以加速 (默认为 CPU 核心数的一半)
npm run test:generate -- --jobs 4
```
**功能**：遍历所有支持的板卡 JSON 数据，在 `eb_compilation_tests` 目录下为每款芯片生成独立的 `.ebproj` 工程及合法的测试 C++ 源码。支持并发执行。

#### 批量执行编译测试
```bash
npm run test:compile
# 或者指定并发任务数 (默认 CPU 核心数的一半)
npm run test:compile -- --jobs 4
```
**功能**：对上述生成的所有测试项目执行并行编译。程序会自动利用多核心提高效率。**程序静默通过所有成功的测试，并在实时进度条中显示状态，只在失败时抛出错误看板详情。**

#### 一键销毁现场
```bash
npm run test:clean
```
**功能**：彻底删除 `eb_compilation_tests` 文件夹，释放硬盘空间。

---

## 3. 对开发者的建议 (Best Practices)

1. **增量测试**：如果您只修改了 `stm32` 系列，不需要重跑 1400 款芯片。可以使用 `--board` 参数过滤：
   ```bash
   # 只生成并测试与 stm32f4 相关的板卡
   npm run test:generate -- --board=stm32f4
   npm run test:compile -- --board=stm32f4
   ```
2. **观察日志**：编译失败的项目会在其项目路径下留下 `test_build.log`。
3. **性能注意**：全量并行编译会占用极高的 CPU 和网络（PIOCore 可能会下载工具链）。建议在测试机器上保留足够的磁盘空间（~20GB+）。

---

## 4. UI 与界面行为调试 (UI & Interface Debugging)

如果您在执行 UI 自动化测试或手动测试过程中发现布局错乱、点击无响应或积木崩溃：

- **F12 控制台**: 软件已绑定 **F12** 快捷键。在开发模式或打包后的生产模式下均可按下 **F12** 呼出 Chrome 风格的开发者工具。这对于排查渲染竞态或 IPC 通信逻辑问题至关重要。
- **Toast 通知**: 观察右上角的通知气泡。很多底层错误（如插件 JSON 加载失败）现在会通过全局通知（Toast）系统可视化弹出，确保错误不再被静默。
- **交互诊断日志**: 若遇到难以复现的焦点丢失或键盘响应异常，请按下 **`Ctrl + Shift + L`** 导出交互诊断日志。
