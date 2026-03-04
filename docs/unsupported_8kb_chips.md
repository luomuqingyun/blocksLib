# 不受支持的 8KB 闪存芯片硬件黑名单 (EmbedBlocks)

以下 STM32 芯片在结构上不受 EmbedBlocks/Arduino 标准框架的支持，因为它们的硬件闪存 (8KB) 在物理限制上太小，无法容纳最低的固件编译体积要求（即使开启 `-Os` 优化参数，一个最小的空程序也需要大约 11KB 的闪存空间）。

为了防止用户必然遇到 `region FLASH overflowed` (闪存溢出) 的底层编译错误，系统级别的项目创建服务已主动禁止针对于这些微控制器创建或载入任何代码工程。

## 已被拦截的微控制器型号

- **STM32L011D3** (`generic_stm32l011d3`) - 8k Flash / 8k RAM
- **STM32L011E3** (`generic_stm32l011e3`) - 8k Flash / 8k RAM
- **STM32L011F3** (`generic_stm32l011f3`) - 8k Flash / 8k RAM
- **STM32L011G3** (`generic_stm32l011g3`) - 8k Flash / 8k RAM
- **STM32L011K3** (`generic_stm32l011k3`) - 8k Flash / 8k RAM