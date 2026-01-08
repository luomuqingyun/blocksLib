# PlatformIO 离线环境构建指南

本指南旨在创建一个完全自包含的 `bundled_pio` 文件夹，供 Electron 应用打包使用。该环境包含 Python 运行时、PIO 核心以及常用的编译器和上传工具，确保软件在无网或未安装 PIO 的电脑上也能稳定运行。

## 目录结构目标

```plaintext
bundled_pio/
├── penv/                  # Python 虚拟环境 (隔离运行环境)
│   ├── Scripts/           # Windows 标准结构 (或 bin/)
│   └── ...
└── core/                  # PlatformIO 数据核心 (隔离数据环境)
    ├── packages/          # 核心资产：编译器(GCC)、框架(SDK)、上传工具(OpenOCD等)
    ├── platforms/         # 平台定义 (ststm32, atmelavr)
    └── platformio.ini     # 全局配置
```

## 自动化构建 (推荐)

如果你已配置好开发环境（Python/Conda + PowerShell），可以直接运行项目根目录下的自动化脚本：

```powershell
.\scripts\bundle_pio.ps1
```

## Mac/Linux 自动化构建

对于 macOS 或 Linux 用户，请使用对应的 Shell 脚本：

1. 赋予执行权限：

   ```bash
   chmod +x scripts/bundle_pio.sh
   ```

2. 运行脚本：

   ```bash
   ./scripts/bundle_pio.sh
   ```

## 手动构建步骤 (详细解析)

若需手动操作或调试，请遵循以下步骤。

### 1. 准备工作区

在项目根目录（或任意临时目录）创建结构：

```powershell
mkdir bundled_pio
mkdir bundled_pio\core  # 必须手动创建，否则 PIO 可能回退到系统目录
```

### 2. 创建虚拟环境

使用当前环境的 Python 创建一个名为 `penv` 的虚拟环境。

> [!NOTE]
> 如果你在使用 Conda，这会基于 Conda 的 Python 创建一个轻量级环境。

```powershell
python -m venv bundled_pio\penv
```

### 3. 确定可执行文件路径

根据你的 Python 发行版，生成的目录可能是 `Scripts` 或 `bin`。

- **Windows 标准/Conda**: `bundled_pio\penv\Scripts`
- **MSYS2/GitBash**: `bundled_pio\penv\bin`

### 4. 激活并安装 Core

暂时激活环境以安装核心库。

```powershell
# 假设是 Scripts 目录
.\bundled_pio\penv\Scripts\activate

# 安装 PlatformIO
pip install platformio
```

### 5. 注入环境变量 (核心步骤)

> [!IMPORTANT]
> 这是最关键的一步。必须强制指定数据目录，否则文件会下载到 C 盘用户目录。在 PowerShell 中必须使用 `$env:` 语法。

```powershell
$env:PLATFORMIO_CORE_DIR = "$PWD\bundled_pio\core"
$env:PLATFORMIO_GLOBALLIB_DIR = "$PWD\bundled_pio\core\lib"
$env:PLATFORMIO_NO_SESSION_ACCESS = "1" # 禁止会话锁，提高并发稳定性
```

### 6. 预下载资源 (囤货策略)

为了保证离线体验，采用"宁滥勿缺"策略，下载所有常用平台和工具。使用 `--global` 参数确保安装到 `core` 根目录。

#### A. 基础平台与编译器 (必须)

```bash
# Arduino AVR (Uno, Nano)
pio pkg install --global --platform atmelavr

# ESP32
pio pkg install --global --platform espressif32

# STM32 (F1, F4 等)
pio pkg install --global --platform ststm32
```

#### B. STM32 特殊上传工具 (强烈推荐)

默认安装可能只包含 ST-Link，为了支持 Maple DFU (BluePill USB) 等方式，需额外补充：

```bash
pio pkg install --global --tool "tool-stm32duino"
pio pkg install --global --tool "tool-dfuutil"
pio pkg install --global --tool "tool-openocd"
pio pkg install --global --tool "tool-stlink"
```

#### C. 常用框架 (可选)

Arduino 框架通常随平台自动安装。若需支持 CubeMX HAL 开发：

```bash
pio pkg install --global --tool "framework-stm32cubef1"
pio pkg install --global --tool "framework-stm32cubef4"
```

### 7. 清理与验证

1. 删除 `bundled_pio\core\.cache` 文件夹（包含下载的临时 zip 包，体积很大）。
2. 检查 `bundled_pio\core\packages`，确保里面有 `toolchain-*` 和 `framework-*` 文件夹。

### 8. 集成

将生成的 `bundled_pio` 移动到 Electron 项目根目录。打包时 `electron-builder` 会自动将其包含在安装包中。