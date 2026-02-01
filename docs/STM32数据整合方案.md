# STM32 数据整合方案 (STM32 Data Integration Architecture)

本文档详细描述了 EmbedBlocks Studio 如何通过自动化流水线，整合外部开源数据源，构建海量且精确的 STM32 芯片数据库。

---

## 1. 核心数据源 (Data Sources)

项目主要依赖于两个权威的开源仓库：

1.  **`stm32-data-generated` (Embassy-rs)**: 
    - **用途**: 提供芯片的基本元数据（型号、封装、引脚数）和精确的**物理布局 (Layout)** 坐标。
    - **地位**: 物理层面的“事实之源”。它基于 ST 官方 XML 整理，去除了大量商业型号冗余，非常适合作为芯片列表的权威索引。
2.  **`Arduino_Core_STM32` (ST-Official)**:
    - **用途**: 提供芯片在 Arduino 框架下的**外设功能映射 (Peripheral Mapping)**。
    - **内容**: 包含 `PeripheralPins.c` (引脚功能映射)、`variant_generic.h` (默认外设引脚宏定义) 和 `variant_generic.cpp` (物理引脚到 Arduino 索引的映射数组)。
    - **地位**: 驱动层面的“功能之源”。确保生成的板卡配置能直接被底层编译器识别并正确工作。

---

## 2. 自动化集成流水线 (The Pipeline)

数据整合分为四个核心阶段，由 `scripts/` 下的 TypeScript 脚本驱动：

### 第一阶段：型号发现 (Discovery) - `1c_discover_from_open_data.ts`
- **操作**: 扫描 `stm32-data-generated/data/chips` 中的所有 JSON 文件。
- **封装感知 (Package Aware)**: 
    - 一个逻辑型号（如 `STM32C071K8`）可能对应多个物理封装（如 `LQFP32` 和 `UFQFPN32`）。
    - 脚本会遍历 JSON 中的 `packages` 数组，为每个封装生成独立的 ID（如 `generic_stm32c071k8tx`）。
- **元数据预测**: 调用 `getSpecsFromMcuName` 启发式解析 Flash/RAM 大小。

### 第二阶段：引脚功能扫描 (Pin Mapping) - `2_scan_stm32_pins.ts`
- **对接**: 将第一阶段发现的 MCU 型号与 `Arduino_Core_STM32` 仓库中的 `variants` 目录进行匹配。
- **提取**: 
    - 解析 `PeripheralPins.c`，抓取所有可用的 UART, SPI, I2C, ADC 和 PWM 引脚组合。
    - 将数据格式化为项目所需的 `pinout` 结构。
- **缓存**: 为了处理数千个型号，脚本支持本地 LRU 缓存，避免重复解析相同的变体目录。

### 第三阶段：官方布局同步 (Visual Layout) - `5_fetch_official_layouts.ts`
- **视觉增强**: 获取引脚的物理坐标映射（如 `PA1` 在 QFP 封装中位于第几号引脚）。
- **实现**: 读取 Embassy 仓库中的 `pins` 数组，将信号名称映射到物理 Position。
- **成果**: 使得前端 `ChipRenderer` 能够生成遵循 ST 官方标准的、100% 准确的芯片示意图。

### 第四阶段：最终合成 (Synthesis) - `4_generate_stm32_data.ts`
- **数据汇聚**: 将上述三个阶段产生的基础信息、引脚功能、视觉布局进行深度合并。
- **标准化**: 
    - 统一引脚命名为物理名称（如 `PA0`）。
    - 注入默认能力（Capabilities）。
- **原子化存储**: 按系列（如 `STM32F4`, `STM32G0`）存放到 `src/data/boards/stm32/` 子目录下。

---

## 3. 为什么这样设计？ (Design Philosophy)

1.  **自动化胜过人工维护**: STM32 型号多达数千款，任何手动维护列表的行为都是不可持续的。
2.  **跨平台兼容性**: 通过对接 `Arduino_Core_STM32`，我们确保了用户在图形化界面选择的引脚在编译阶段是完全合法的。
3.  **视觉辅助**: 绝大多数 Blockly 工具只提供文字列表，我们通过同步 Embassy 布局数据，提供了“所见即所得”的接线参考。
4.  **去重与精简**: 屏蔽了商业后缀（如包装卷带方式）的差异，同时保留了物理封装（Package）的差异，在简洁与专业之间取得了平衡。

---

## 4. 如何执行同步？

如果你需要从头更新数据库：
```bash
# 1. 发现新型号
npx tsx scripts/1c_discover_from_open_data.ts
# 2. 扫描功能映射
npx tsx scripts/2_scan_stm32_pins.ts
# 3. 抓取物理布局
npx tsx scripts/5_fetch_official_layouts.ts
# 4. 生成最终 JSON
npx tsx scripts/4_generate_stm32_data.ts
```
