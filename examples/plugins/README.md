# 插件扩展示例 (Plugin Examples)

这里存放的是可以直接用于 **EmbedBlocks Studio 插件系统** 的示例代码。
这些插件无需编译源码，用户可以直接在软件的 `Extensions` 界面导入使用。

## 目录索引

### 1. [Hello World](./hello_world/)
**入门级示例**。
展示了最基础的插件结构：
- 如何定义一个简单的打印积木。
- 如何让积木生成 Serial.print 代码。
- 如何自动注入 `Serial.begin` 到 setup 函数中。

### 2. [Advanced LED](./adv_led/)
**硬件控制示例**。
展示了更复杂的交互：
- 使用下拉菜单 (Dropdown) 选择引脚。
- 定义 `Init` (初始化) 和 `Action` (执行) 两种类型的积木。
- 演示了 `pinMode` 和 `digitalWrite` 的生成。

### 3. [Board Support Examples](./)
我们提供了三个独立的硬件扩展示例：
- **[ESP8266 (NodeMCU)](./board_esp8266/)**: 展示如何添加非核心家族芯片。
- **[Arduino Yun](./board_yun/)**: 展示 AVR 架构的高级板子配置。
- **[Arduino Micro](./board_micro/)**: 展示紧凑型 AVR 板子的引脚映射。

这些示例展示了如何定义 `mcu`, `fqbn` 以及完整的 `pins` 映射表（含 Digital, Analog, I2C, SPI, PWM）。

### 4. [OLED U8glib-HAL](./oled_u8glib/)
**综合进阶示例**。
- 集成第三方库 (libraries)。
- **国际化 (i18n)**: 使用 `locales` 文件夹实现中英文自动切换。
- 复用自定义引脚标签。

## 如何使用？

1.  **导入**: 打开软件，点击左侧扩展图标，选择 "Import Extension"，然后选择上述任意一个文件夹。
2.  **查看**: 导入成功后，工具箱底部会出现新的绿色分类。
3.  **测试**: 拖拽积木并查看代码预览。

## 开发文档

**详细指南**: 请参考 `docs/普通用户插件系统开发手册.md` 获取全面的规则和 API 文档。
