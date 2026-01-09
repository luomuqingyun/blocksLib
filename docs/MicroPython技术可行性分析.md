# MicroPython 支持技术可行性分析 (Feasibility Study: MicroPython Support)

> **创建日期**: 2026-01-09
> **状态**: 提案评估中 (Revision 2)
> **焦点**: 双语言架构规范 & STM32 试点分析

---

## 1. 核心架构挑战：双生成器规范 (Dual Generator Architecture)

您提到的“生成代码逻辑需要整理规范”非常切中肯綮。目前我们的架构是紧耦合的 `Block -> Arduino C++`。如果引入 MicroPython，不能简单地堆砌 `if-else`。

### 1.1 现状 (Current)
```typescript
// generator.ts
arduinoGenerator.forBlock['led'] = (block) => {
  return 'digitalWrite(13, HIGH);'; 
};
```
直接修改会导致代码库爆炸。

### 1.2 目标架构：抽象工厂模式 (Target: Abstract Factory)
我们需要建立一个**中间层 (Intermediate Layer)**：

```typescript
// 1. 定义积木的行为接口 (Abstract Behavior)
interface LEDBlockLogic {
  turnOn(pin: string): string;
  turnOff(pin: string): string;
}

// 2. C++ 实现 (Concrete C++)
const CppLED: LEDBlockLogic = {
  turnOn: (pin) => `digitalWrite(${pin}, HIGH);`,
  ...
}

// 3. Python 实现 (Concrete Python)
const PythonLED: LEDBlockLogic = {
  turnOn: (pin) => `Pin(${pin}, Pin.OUT).value(1)`,
  ...
}

// 4. 工厂分发
const getCode = (mode: 'cpp' | 'py') => mode === 'cpp' ? CppLED : PythonLED;
```

**工作量**: 这实际上要求我们**重写所有现有积木的生成逻辑**，将“字符串拼接”升级为“语义构建”。

---

## 2. STM32 试点分析 (STM32 Pilot Analysis)

关于利用 STM32 高性能芯片 (F4/F7/H7) 来跑 MicroPython 的设想。

### 2.1 性能匹配度 (Performance)
*   **完全可行**。STM32F405/411 及以上系列拥有足够的 RAM (128KB+) 和 Flash，跑 MicroPython 毫无压力，且支持浮点运算单元 (FPU)，非常适合数学计算。
*   在这些芯片上，MP 的性能损耗对于非实时应用（如教育机器人、UI 交互）是可以接受的。

### 2.2 真正的拦路虎：烧录体验 (The Flashing UX Bottleneck)
虽然芯片能跑，但**工具链 (Toolchain)** 是最大障碍：

*   **ESP32 体验**: 
    *   自带 USB-Serial 转换器。
    *   浏览器/Electron 可以直接通过串口刷入 MicroPython 固件 (`esptool.py`)。
    *   **体验流畅**。

*   **STM32 体验**:
    *   **ST-Link 模式**: 大多数 STM32 开发板依赖 ST-Link 调试器。OpenOCD 在 Web 端支持非常困难（需要 WebUSB + 复杂的协议栈）。
    *   **DFU 模式**: 需要用户按住 BOOT0 键复位进入 DFU 模式，驱动安装繁琐 (Zadig)。
    *   **MSC 拖拽模式**: 虽然部分 Micropython 固件支持模拟 U 盘拖拽，但这依赖于出厂时 Bootloader 已经刷好。如果是全新的 STM32 板子，用户依然第一步卡在“怎么刷入 MicroPython 固件”上。

### 2.2 烧录体验再评估 (Flashing UX Re-evaluation)

**用户反馈 (User Insight)**: "ST-Link 与 DFU 是嵌入式开发的标配技能，只要引导得当，并不构成绝对门槛。"

基于此，我们重新评估 STM32 的支持路径：
1.  **工具链集成 (Toolchain Integration)**:
    *   我们不需要自己去写 USB 驱动。
    *   可以像调用 PlatformIO 一样，在后台调用 `STM32_Programmer_CLI` 或开源的 `st-flash` / `dfu-util`。
    *   **EmbedBlocks 的角色**: 变成一个 GUI Wrapper，检测到 ST-Link 插入后，自动执行刷固件命令。

2.  **引导流程 (Onboarding Flow)**:
    *   对于新手，我们可以提供图文并茂的 "BOOT0 切换向导"。
    *   一旦固件（MicroPython Interpreter）刷入成功，后续的文件传输均通过 USB 虚拟串口完成，体验与 ESP32 无异。

### 2.3 结论：完全可行 (Conclusion: Feasible)
**修正观点**: STM32 的支持**不仅可行，而且很有必要**。
虽然它的“第一次安装”比 ESP32 麻烦，但考虑到 STM32 在教育和工业界的庞大存量，支持它将极大拓宽我们的用户群。且 STM32F4/H7 的强劲性能（FPU, DSP）是运行复杂 Micropython 算法的理想平台。

---

## 3. 最终策略建议 (Strategy)

鉴于可行性验证的提升，建议分两步走：

1.  **Stage 1: 架构层 (Architecture - The "Must Have")**
    *   **优先事项**: 无论支持哪种芯片，**抽象工厂模式 (Abstract Factory)** 的生成器改造是必须先行启动的。没有这个，双语言支持就是空谈。
    *   **行动**: 在 TinyML 模块开发中，试行 `Generator Interface` 设计。

2.  **Stage 2: 硬件层 (Hardware - Parallel Pilot)**
    *   **双轨并行**: 除了 ESP32，同步启动 **STM32F4 (如 BlackPill)** 的适配调研。
    *   **技术验证**: 编写一个简单的 Electron 脚本，测试调用 `st-flash` 刷入 `.bin` 固件的稳定性。如果打通这一环，STM32 就没有任何阻碍了。
    *   **TinyML 策略**: 针对 STM32F4 等强芯，可以尝试 TFLite Micro 的 Python 绑定，但主流建议依然是 **C++ (Performance)**。
