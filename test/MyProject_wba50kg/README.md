# STM32WBA50KG 测试项目 (Build Interceptor Demo)

本项目用于验证和演示 STM32WBA 系列在 PlatformIO + Arduino 架构下的编译修复方案。

## 📝 修复背景

默认情况下，PlatformIO 的 `ststm32` 平台会将 `STM32WBA` 识别为 `STM32WB` 系列，导致：
1. 包含错误的头文件 (`stm32wbxx.h`)。
2. 缺失 `USART_TypeDef` 等核心类型定义。
3. 缺失 `EXTI_IMR1_IM10/11` 等 HAL 层必需宏。
4. 链接时找不到 `digitalPin` 等 Variant 符号。

## 🛠️ 关键修复组件

1. **`fix_wba_build.py`**: 
   - 这是一个“构建拦截器”脚本。
   - 它通过 `post` 脚本挂载，自动清理冲突的 WB 宏定义并重定向包含路径。
   - 补充了缺失的 EXTI 存根。
   - 它同时对 `env` 和 `projenv` 生效。

2. **`platformio.ini`**:
   - 配置 `extra_scripts = post:fix_wba_build.py`。
   - 指向自定义的 Variant 目录。

3. **`variants/eb_custom_variant`**:
   - 修正了 `variant_generic.cpp` 和 `generic_clock.c` 中的宏判定：
     `#if defined(ARDUINO_GENERIC_WBA50KGTX)` (原为 `...KGUX`)。

## 🚀 编译指令

直接在项目目录下运行：
```bash
pio run
```

项目设计为完全独立，不修改任何 PlatformIO 的全局安装文件。
