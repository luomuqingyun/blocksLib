# STM32WL/WLE 系列 (Sub-GHz Wireless) 支持说明

STM32WL 系列是 ST 推出的集成了 LoRa/Sigfox 等 sub-GHz 无线电的处理器的单片机。在 EmbedBlocks Studio 中，针对该系列的通用板卡（Generic STM32WL/WLE）进行了深层的编译适配。

## 1. 核心挑战：符号冲突 (Symbol Conflicts)

在 STM32duino 框架中，`generic_stm32wl` 类型的开发板变体目录中内置了大量特定模组的实现文件（如 `variant_RAK3172_MODULE.cpp`）。

*   **问题**：当用户创建通用 WL 项目时，这些不相关的模组文件会被 PlatformIO 自动扫描并编译，导致 `PeripheralPins` 和 `variant` 定义出现重复定义（Multiple Definition）错误。
*   **解决方案**：我们在 `VariantGenerator.ts` 中引入了**物理层级过滤**。当系统检测到正在为 WL/WLE 系列生成项目补丁时，会自动删除变体目录中非通用的 `.c` 和 `.cpp` 文件。这确保了生成的 `eb_custom_variant` 仅包含最基础的、符合通用芯片定义的代码。

---

## 2. 双核启动修复 (WL54/55/WLM 系列)

针对双核版本（M4 + M0+）的 WL 芯片，由于底层 CMSIS 启动文件依赖特定的预处理宏来决定启动路径：

*   **问题**：默认编译环境下可能无法正确加载 CM4 的向量表，导致芯片在上电后陷入停滞。
*   **解决方案**：在项目的 `platformio.ini` 模板中，系统会自动为 WL 双核系列注入 `-DUSE_CM4_STARTUP_FILE` 编译宏。这确保了编译器调用正确的启动汇编文件。

---

## 3. 已通过验证的测试

目前以下子系列已通过全量自动化编译压力测试：
- **STM32WLE4/E5** 系列 (M4 单核)
- **STM32WL54/55** 系列 (M4 + M0+ 双核)
- **STM32WLM** 系列 (专用模组封装)

## 4. 注意事项

- **外设冲突**：由于 WL 系列的 Sub-GHz 射频外设内部占用了特定的 SPI 和 GPIO，建议在积木设计时优先参考官方引脚分配，避免干扰无线电通信。
- **内存布局**：双核版本的内存是共享的，请确保您的逻辑主要运行在 M4 核心上。
