# STM32 芯片支持变更与兼容性报告 (EmbedBlocks)

> **记录时间**: 2026/3/5 09:39:35
> **核心版本**: STM32duino (Arduino_Core_STM32) `4.21200.0`

## 1. 框架版本更新摘要

- **当前状态**: 已是最新版本 (`4.21200.0`)，无核心框架变动。

## 2. 芯片支持定义变动

### 🆕 新增支持 (1425)
- `generic_stm32c011d6`
- `generic_stm32c011f4`
- `generic_stm32c011f6`
- `generic_stm32c011j4`
- `generic_stm32c011j6`
- `generic_stm32c031c4`
- `generic_stm32c031c6`
- `generic_stm32c031f4`
- `generic_stm32c031f6`
- `generic_stm32c031g4`
- `generic_stm32c031g6`
- `generic_stm32c031k4`
- `generic_stm32c031k6`
- `generic_stm32c051c6`
- `generic_stm32c051c8`
- `generic_stm32c051d8`
- `generic_stm32c051f6`
- `generic_stm32c051f8`
- `generic_stm32c051g6`
- `generic_stm32c051g8`
- *(及其他 1405 款...)*

## 3. 物理容量限制拦截列表 (8KB Flash)

以下芯片虽被 STM32duino 官方库收录，但因其 **8KB Flash** 物理体积过小，无法满足 Arduino 最小运行时要求（即使优化后空程序仍需约 11KB），已被 EmbedBlocks 策略性屏蔽。

- **STM32L011D3** (`generic_stm32l011d3`) - 8k Flash / 8k RAM
- **STM32L011E3** (`generic_stm32l011e3`) - 8k Flash / 8k RAM
- **STM32L011F3** (`generic_stm32l011f3`) - 8k Flash / 8k RAM
- **STM32L011G3** (`generic_stm32l011g3`) - 8k Flash / 8k RAM
- **STM32L011K3** (`generic_stm32l011k3`) - 8k Flash / 8k RAM