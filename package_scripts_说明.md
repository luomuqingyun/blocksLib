# EmbedBlocks Studio 命令指南 (Package Scripts Guide)

本文档整理了 `package.json` 中定义的所有 `npm run` 命令。主要内容包括命令的具体用途、执行的操作、执行后生成的文件以及这些文件是否需要包含在项目源码（Git）中。

---

## 1. 核心开发与运行命令
这类命令是日常开发和调试应用最常用到的指令。

* **`npm run dev`**
  * **用途:** 启动本地开发环境（包含前端热更新和后端主进程重载）。
  * **行为:** 临时增加 Node.js 内存上限 -> 提取积木 Schema -> 唤起 Vite 服务器。
  * **生成文件:** `src/data/ai_block_schema.json`（**是，项目必须**，需提交至 Git）。
* **`npm run predev`**
  * **用途:** 开发环境的钩子准备脚本（在跑 `dev` 前由 npm 自动执行）。
  * **行为:** 强制清理系统残留的 `electron.exe` 后台残影，同步 Blockly 媒体资源。
  * **生成文件:** 将底层媒体库移动至 `public/media/blockly`（**是，项目必须**）。
* **`npm run start`**
  * **用途:** 在本地直接打包并启动验证完整版桌面应用。
  * **行为:** 等同于先跑 `build` 构建代码，再通过 `electron .` 直接从打包后的产物启动。
* **`npm run preview`**
  * **用途:** 预览构建好的前端静态页面。

---

## 2. 编译与打包构建命令
用于将 TypeScript 源码转译为生产环境所需的代码及生成安装包。

* **`npm run build`** / **`npm run prebuild`**
  * **用途:** 完整的项目生产级构建，并提取最新 Schema 以防遗漏。
  * **生成文件:** 
    * `dist/` (前端静态工程) 和 `dist-electron/` (后端主进程代码)。
    * **否，不需上传 Git**。它们会被 `.gitignore` 忽略。
* **`npm run release`**
  * **用途:** 使用 electron-builder 输出最终供普通用户下载的系统安装包（如 .exe）。
  * **生成文件:** `release/` 目录里的应用程序压缩包及安装向导包（**否，不需上传 Git**）。
* **`npm run postinstall`** / **`npm run rebuild`**
  * **用途:** 让 Electron-builder 重新编译某些带有 C++ 底层代码的 NPM 原生依赖库（如 serialport）。

---

## 3. 清理工具命令 (Cleaners)
用于强制重置环境，帮开发人员快速解决各种缓存玄学 Bug。

* **`npm run clean:build`**: 仅删除 `dist` 和 `dist-electron` 构建目录。
* **`npm run clean:all`**: 核弹级清理。删除上述构建产物、外发安装包，并一并删除所有的 `node_modules` 依赖以及锁文件，方便重装。
* **`npm run clean:pio`**: 专门删除通过外挂脚本获取的 `bundled_pio` 框架环境缓存碎片。

---

## 4. 底层与数据同步脚本 (Data Scrapers)
从互联网抓取底层硬件的芯片引脚和宏定义，这是生成底层引擎必须的核心数据。

* **`npm run gen:stm32`**
  * **用途:** 自动抓取并解析上千款 STM32 的引脚定义与 Arduino Core 官方变体。
* **`npm run sync:stm32`** / **`npm run bundle:core`**
  * **用途:** 全局打包并整合这些抓取好的底层芯片数据。
  * **生成文件:** 会在脚本执行后生成供解析引擎使用的 JSON 数据（若存放在 `scripts/generated` 内，则**不需要上传 Git**；若是写入 `src/data/` 中，则**需要长效保存至 Git**）。通常会生成 `bundled_pio/` (整个 PlatformIO 微缩核心，**否，不需上传 Git**)。

---

## 5. 自动化测试与质量检测 (Automated QA & Testing)
**⚠ 警告: 此分类下的特定高级命令会生成大量的评测垃圾报告。**

* **`npm run test`** / **`npm run test:watch`** / **`npm run test:blocks`**
  * **用途:** 使用 Vitest 跑局部的纯函数和语法单元测试。
* **`npm run test:generate`** / **`npm run test:compile`** / **`npm run test:clean`**
  * **用途:** 旧架构保留的看板级测试工程生成、编译与销毁。
  * **生成文件:** `eb_compilation_tests/` 文件夹 及 `test_build.log`。 （**否，这是临时编译床，非常庞大，严禁上传 Git**）。
* **`npm run test:board`**
  * **用途:** 为指定特定的单板触发 Electron 自动命令行模拟测试。
* **`npm run dump:blocks`**
  * **用途:** （积木体检 Step 1）捕获所有自定义图块，抓取并输出对应各个平台的 C++ 底层代码快照。
  * **生成文件:** `block_compilation_manifest.json` （**否，临时测试题库，严禁上传 Git**）。
* **`npm run verify:blocks`**
  * **用途:** （积木体检 Step 2）按照快照逐个生成微小隔离级 PlatformIO C++ 项目，跨四大主流架构进行魔鬼式真实编译器校验。
  * **生成文件:**
    * `block_verify_report.json` (最终体检通过率报告，**否，不需要上传 Git**)
    * `eb_block_verify_tests/` (切片虚拟实验临时工程夹，**否，不需要上传 Git**)
    * `block_verify_debug.log` (切片编译时打印的回显日志，**否，不需要上传 Git**)

---

### [附录] 哪些高频生成文件**必须杜绝**被提交到 Git 中？
以下是刚才列举出的大型无关产出：
1. `dist/` 与 `dist-electron/` 
2. `release/`
3. `bundled_pio/`
4. `block_compilation_manifest.json`
5. `block_verify_report.json`
6. `block_verify_debug.log`
7. `eb_compilation_tests/` 与 `eb_block_verify_tests/`

这些目录都应当交由项目根目录的 `.gitignore` 替你把守大门进行静默拦截阻断。
