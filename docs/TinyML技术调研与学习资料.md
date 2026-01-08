# TinyML 技术调研与团队学习资料 (TinyML Research & Learning Guide)

**创建日期**: 2026-01-08  
**目标阶段**: 2026 Q1 - "Magic Wand" Project

---

## 1. 什么是 TinyML? (Brief Introduction)

TinyML (微型机器学习) 是指在 **mW (毫瓦)** 级功耗、**KB (千字节)** 级内存的微控制器 (MCU) 上运行机器学习模型的技术。

**为什么它对我们至关重要？**
它允许我们通过“采集数据 -> 训练”的方式来解决复杂的逻辑问题（如识别手势、语音指令），而不需要编写成百上千行的 `if-else` 代码。这是 Blocky 低代码编程的**终极延伸**。

---

## 2. 核心技术栈选型 (Technology Stack)

基于调研，建议 Phase 1 采用以下技术栈：

### 2.1 推理引擎: TensorFlow Lite for Microcontrollers (TFLM)
-   **简介**: Google 官方推出的 TensorFlow 嵌入式版本。
-   **优势**: 行业标准，社区支持最强，支持算子丰富。
-   **集成方式**: TFLM 可以被编译为**静态库 (.a)** 或提取为 **Source Code** 直接包含在 PlatformIO 项目中。
    -   *参考库*: `esp32-tflm` (Espressif 官方优化版)

### 2.2 算法模型: "Magic Wand" (CNN vs KNN)
-   **CNN (卷积神经网络)**:
    -   *优点*: 准确率高，能识别复杂轨迹（画圈、画Z）。
    -   *缺点*: 需要算力较强，训练过程通常需在云端 (Python)。
-   **KNN (K-近邻算法)**:
    -   *优点*: **无需训练**（只是存储样本），可在单片机上实时“录制”新动作。代码极简 (Header-only C++)。
    -   *推荐*: **Phase 1 先实现 KNN**，因为它符合“零代码”的瞬时反馈体验；Phase 1.5 再引入 CNN 模型加载。

### 2.3 数据协议: Edge Impulse Serial CSV
为了实现“摇晃采集”，我们需要一个标准的数据传输协议。行业标杆 Edge Impulse 定义了简单的串口 CSV 格式：
```csv
timestamp, accX, accY, accZ, gyroX, gyroY, gyroZ
0, 0.12, 0.55, 9.81, 0.01, -0.02, 0.00
10, 0.13, 0.56, 9.80, 0.02, -0.01, 0.01
...
```
我们的 `Serial Data Sampler` 积木应严格遵守此格式，以便未来能直接对接 Edge Impulse 平台。

---

## 3. 推荐学习路径 (Learning Path)

请团队成员按以下顺序查阅资料：

### 3.1 基础概念 (Basics)
1.  **[视频] Intro to TinyML (Harvard Course)**: 了解基本概念。
2.  **[文章] Why TinyML?**: 为什么要在 MCU 上跑 AI。

### 3.2 实战复刻 (Hands-on Reference)
我们的目标是复刻并简化这个经典项目：
*   **Magic Wand (Original)**: Pete Warden (TFLM 创始人) 的原始项目。
    *   *源码*: [tensorflow/lite/micro/examples/magic_wand](https://github.com/tensorflow/tflite-micro/tree/main/tensorflow/lite/micro/examples/magic_wand)
*   **ESP32 移植版**:
    *   *教程*: [TensorFlow Lite on ESP32 (Instructables)](https://www.instructables.com/) - 搜索关键词。
    *   *仓库*: [atomic14/esp32-tf-micro-speech](https://github.com/atomic14) - 优秀的 ESP32 TFLM 教程作者。

### 3.3 算法深潜 (Algorithm Deep Dive)
*   **Header-only KNN**: 
    *   *库推荐*: `knncolle` (C++ Header-only)。
    *   *原理*: 查阅 "DTW (Dynamic Time Warping)"，这对比较不同速度的手势非常有用。

---

## 4. 行动清单 (Action Items)

为了支持 Q1 的开发，请 Front-end 和 Embedded 同事关注：

1.  **前端**: 学习如何在 `SerialContext` 中解析高频 CSV 数据流（需使用 Web Worker 防止阻塞 UI）。
2.  **嵌入式**: 
    *   购买 **ESP32-S3** 开发板和 **MPU6050** 模块。
    *   尝试跑通一个最简单的 TFLM "Hello World" (Sine Wave 预测)。

---

**备注**: 所有提到的开源库协议均为 Apache 2.0 或 MIT，可安全商用。
