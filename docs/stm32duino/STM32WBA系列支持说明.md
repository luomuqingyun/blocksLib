# STM32WBA 系列支持说明

STM32WBA 系列是 ST 推新的低功耗蓝牙 (BLE) 高级安全 MCU。由于 PlatformIO (ststm32 平台) 尚未完美适配该系列（通常会错误地将其识别为 STM32WB 系列），EmbedBlocks Studio 通过项目级的“构建拦截器”机制实现了对该系列的稳定支持。

## 🚀 核心修复机制

支持 WBA 系列的关键在于解决 **型号识别偏移** 和 **宏定义缺失** 问题。

### 1. 构建拦截器 (`fix_wba_build.py`)
我们在项目中引入了一个 Python 脚本，通过 `platformio.ini` 的 `extra_scripts` 调用：
- **定义清理**：强制移除编译环境中的 `STM32WBxx` 宏，防止逻辑进入错误的双核 WB 代码路径。
- **路径重定向**：将所有包含路径中的 `STM32WBxx` 自动修正为 `STM32WBAxx`。
- **动态拦截**：通过 `AddBuildMiddleware` 实时监控每一个文件的编译命令，确保拦截无死角。
- **EXTI 存根**：补充 WBA 硬件层所需的 `EXTI_IMR1_IM10/11` 定义。

### 2. Variant 引脚匹配
WBA50KG 等型号的变体定义需要与板级宏 `ARDUINO_GENERIC_WBA50KGTX` 精确匹配。如果代码无法进入 `#if defined(...)` 块，会导致 `digitalPin` 等符号链接失败。

## 🛠️ 如何在项目中使用

1. **配置文件**: 确保 `platformio.ini` 包含以下配置：
   ```ini
   extra_scripts = post:fix_wba_build.py
   ```
2. **保持脚本**: 必须在项目根目录下保留 `fix_wba_build.py`。
3. **独立性**: 该方案不依赖任何全局修改，项目可直接分发编译。

## 3. 技术实现方案

由于官方 PlatformIO 框架的识别优先级极高，我们采用了 **"暴力重定向" (Brute Force Redirection)** 策略：

### A. 构建拦截器 (`fix_wba_build.py`)
- **运行阶段**：设置为 `post` 脚本，在框架初始化后强制介入。
- **环境补丁**：同时对 `env` 和 `projenv` 进行热修复，确保全局库与项目代码的一致性。
- **中间件拦截**：通过 `AddBuildMiddleware` 拦截每一个编译单元的执行指令，动态剔除 `STM32WBxx` 关键字并替换包含路径。
- **ASCII 日志**：打印信息采用纯英文，避免 Windows 环境乱码。

### B. 系统源码集成 (`templates.ts`)
- 修改了 `electron/config/templates.ts` 中的 `generateIniConfig` 函数。
- **逻辑**：如果项目使用了 `local_patch` 且芯片 ID 包含 `wba`，生成器会自动注入修复脚本路径。
- **收益**：此举确保了即便用户多次保存或点击编译，修复配置也不会丢失。

### C. Variant 修正
- 修正了 `variants/eb_custom_variant` 下的 `variant_generic.cpp` 等文件，确保 `ARDUINO_GENERIC_WBA50KGTX` 定义正确，从而导出 `digitalPin` 等关键符号。

## 4. 维护与更新
如果未来官方 PlatformIO 修复了 WBA 系列的驱动映射，可以移除 `templates.ts` 中的自动注入逻辑，并删除修复脚本。在此之前，请务必保留这些补丁以确保编译运行正常。

## 📊 已验证型号
- **STM32WBA50KG**: 完整支持 Digital IO, UART, 基础时钟配置。

## ⚠️ 注意事项
- 由于 WBA 是新系列，部分高级外设（如加密/安全组件）可能仍需通过 STM32Cube HAL 直接调用，Arduino 封装层可能尚未覆盖。
