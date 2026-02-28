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
3. **C++ 源码注入**：将与上述 Blockly 等效翻译而成的纯净 C++ 测试代码强行写入 `src/main.cpp`。
4. **验证**：调用真实的 PlatformIO Core 进行原生底层编译，验证整个编译链条对该配置的环境是否报错。

---

## 2. NPM 快捷测试指令详解

所有涉及主进程测试的指令都被配置成了极速后台编译 (`vite build -c vite.config.js`) 策略，这使得启动自动化脚本只在毫秒间。

### ① 全量测试命令 (Bulk Testing)

如果您要验证整个软件架构修改后是否破坏了某些厂家的板卡编译链：

#### 批量生成项目骨架
```bash
npm run test:generate
```
**功能**：遍历 `src/data/boards/**/*.json` 中近 1400 款芯片数据，并在根目录下的 `eb_compilation_tests` 文件夹中自动创建所有的 `.ebproj` 项目与测试源码。

#### 批量执行编译测试
```bash
npm run test:compile
```
**功能**：对上述生成的所有测试项目挨个执行长达数小时的 PlatformIO 原生编译。为了简化输出，**程序静默通过所有成功的测试，只在控制台抛出失败的板块名称及其错误原因。**

#### 一键销毁现场
```bash
npm run test:clean
```
**功能**：安全、快速地销毁整个 `eb_compilation_tests` 残留文件夹，打扫编译战场。

---

### ② 专属单体测试命令 (Targeted Board Testing)

如果您只修复了某一个冷门芯片的配置，不想等上千个项目的生成，可以直接进行“拦截式过滤生成”。

#### 定向生成单款板卡
```bash
npx electron . --generate-test-projects --board=芯片JSON文件名
```
*例如*：`npx electron . --generate-test-projects --board=generic_stm32f103ze`
> **释义：** 这里的 `芯片JSON文件名` 指的是位于 `src/data/boards/stm32/` (或核心目录) 下对应配置文件的名称（**不含 `.json` 后缀**）。这也是软件内部识别各个主板的唯一 `boardId`。

**功能**：它将直接忽略所有其他板卡，仅为您生成这 **1个** 被指定的测试项目。由于生成 JSON 时是写入的真实 Blockly 数据，您可以即刻打开 EmbedBlocks 主界面验证该板卡的侧边栏与积木图块表现。

#### 定向编译单款板卡
```bash
npx electron . --compile-test-projects --board=芯片JSON文件名
```
*例如*：`npx electron . --compile-test-projects --board=generic_stm32f103ze`
**功能**：仅读取被指定名字的那个文件夹，对其执行真实的 PlatformIO C++ 编译动作，反馈控制台输出结果。如果您是调整底层的 C++ 翻译规则或配置文件后，此举最适合用于秒级回显测试。

---

*注意：被生成的 `eb_compilation_tests` 已被纳入全局 `.gitignore` 黑名单，绝不会不慎提交至代码审查或 Git 历史仓库中。*
