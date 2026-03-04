/**
 * ============================================================
 * STM32 变体生成器 (Variant Generator)
 * ============================================================
 * 
 * 负责为非官方支持的 STM32 芯片生成本地板卡补丁。
 * 当芯片不在 PlatformIO 官方板卡库中时，使用此服务生成:
 * 
 * 生成的文件:
 * - boards/eb_custom_board.json (PlatformIO 板卡定义)
 * - variants/eb_custom_variant/ (STM32duino 变体文件)
 *   - variant_generic.h (引脚定义)
 *   - variant_generic.cpp (引脚映射)
 *   - PeripheralPins.c (外设引脚配置)
 *   - PinNamesVar.h (引脚名称)
 *   - ldscript.ld (链接脚本)
 * 
 * 智能继承机制:
 * - 优先从增强兼容性映射获取 STM32duino 官方变体
 * - 复制官方变体文件并调整内存配置
 * - 支持从父级板卡继承编译选项
 * 
 * @file electron/services/VariantGenerator.ts
 * @module EmbedBlocks/Electron/Services/VariantGenerator
 */

import * as fs from 'fs';
import * as path from 'path';

/** 变体数据接口 - 描述 STM32 芯片的硬件特性 */
export interface VariantData {
  id: string;
  name: string;
  mcu: string;
  specs: string; // "64k Flash / 20k RAM"
  variant: string; // 比如 "F030RCT" (板卡原始变体名)
  parentBoardId?: string; // [新增] 比如 "nucleo_f030r8"
  pinMap: any[];
  pinout: any;
  defaults: any;
  pin_options: any;
  // 来自增强兼容性映射的字段
  enhancedVariantPath?: string; // e.g. "STM32F1xx/F103C8T_F103CB(T-U)" (完整的 STM32duino variant 路径)
  productLine?: string; // e.g. "STM32F103xB"
  maxFlashSize?: number; // bytes
  maxRamSize?: number; // bytes

  // [新增] 可选的从 JSON 解析 build 配置
  build?: {
    cpu?: string;
    extra_flags?: string;
    [key: string]: any;
  };
}

class VariantGenerator {
  /**
   * 生成本地 PlatformIO 板卡和变体补丁
   * @param projectPath 项目目录路径
   * @param boardData 芯片变体数据
   * @param pioPlatformPath PlatformIO 平台路径 (可选，用于继承父级板卡配置)
   * @param arduinoCorePath Arduino Core STM32 路径 (可选，用于复制官方 variant 文件)
   */
  async generatePatch(
    projectPath: string,
    boardData: VariantData,
    pioPlatformPath?: string,
    arduinoCorePath?: string
  ): Promise<void> {
    const boardsDir = path.join(projectPath, 'boards');
    const variantsDir = path.join(projectPath, 'variants');
    const variantName = `eb_custom_variant`;
    const specificVariantDir = path.join(variantsDir, variantName);

    // 1. 创建必要的目录结构
    if (!fs.existsSync(boardsDir)) fs.mkdirSync(boardsDir, { recursive: true });
    if (!fs.existsSync(specificVariantDir)) fs.mkdirSync(specificVariantDir, { recursive: true });

    // 2. 智能继承: 加载父级板卡的编译配置 (如提供)
    let parentConfig: any = null;
    if (boardData.parentBoardId && pioPlatformPath) {
      const boardJsonPath = path.join(pioPlatformPath, 'boards', `${boardData.parentBoardId}.json`);
      if (fs.existsSync(boardJsonPath)) {
        try {
          const raw = fs.readFileSync(boardJsonPath, 'utf-8');
          parentConfig = JSON.parse(raw);
          console.log(`[VariantGenerator] Inheriting from official board: ${boardData.parentBoardId}`);
        } catch (e) {
          console.warn(`[VariantGenerator] Failed to parse parent board JSON`, e);
        }
      }
    }

    // 3. 生成 boards/eb_custom_board.json (始终生成，可能继承父级配置)
    await this.generateBoardJson(boardsDir, boardData, variantName, parentConfig, pioPlatformPath);

    // 4. 智能合并: 尝试复制官方 STM32duino 文件 (如提供 arduinoCorePath)
    let copiedOfficial = false;
    if (arduinoCorePath && fs.existsSync(arduinoCorePath)) {
      copiedOfficial = await this.copyExistingVariant(specificVariantDir, boardData, arduinoCorePath, parentConfig);
    }

    if (!copiedOfficial) {
      console.log(`[VariantGenerator] No official variant found for ${boardData.name}, generating fallback files...`);
      // 回退方案: 自动生成 variants/eb_custom_variant/PeripheralPins.c
      await this.generatePeripheralPinsC(specificVariantDir, boardData);
      // 回退方案: 自动生成 variants/eb_custom_variant/variant_generic.h
      await this.generateVariantH(specificVariantDir, boardData);
      // 回退方案: 自动生成 variants/eb_custom_variant/variant_generic.cpp
      await this.generateVariantCpp(specificVariantDir, boardData);
      // 回退方案: 自动生成 variants/eb_custom_variant/generic_clock.c 等缺少的弱函数
      await this.generateGenericClockC(specificVariantDir);
    } else {
      console.log(`[VariantGenerator] Successfully reused official variant files for ${boardData.name}`);
    }

    // 5. 生成 variants/eb_custom_variant/ldscript.ld (始终自定义以确保 RAM/Flash 准确)
    await this.generateLdScript(specificVariantDir, boardData);

    // 6. 生成 variant_EB_CUSTOM_BOARD.h - PlatformIO 根据板卡名称期望此文件存在
    // 该文件仅包含实际的变体头文件 (variant_generic.h 或类似)
    await this.generateVariantWrapperHeader(specificVariantDir, boardData);
  }

  /**
   * 尝试从 Arduino_Core_STM32/variants 查找并复制官方文件
   * @returns 是否成功复制了官方文件
   */
  private async copyExistingVariant(destDir: string, data: VariantData, corePath: string, parentConfig?: any): Promise<boolean> {
    try {
      const variantsBase = path.join(corePath, 'variants');
      if (!fs.existsSync(variantsBase)) return false;

      let variantPath = "";

      // [核心增强] 策略 0: 优先使用增强兼容性映射中的精确 Variant 路径
      // 这是从 STM32duino 的 boards_entry.txt 直接解析的最准确路径
      if (data.enhancedVariantPath) {
        const enhancedPath = path.join(variantsBase, data.enhancedVariantPath);
        if (fs.existsSync(enhancedPath)) {
          variantPath = enhancedPath;
          console.log(`[VariantGenerator] 使用增强兼容性映射的 Variant 路径: ${data.enhancedVariantPath}`);
        }
      }

      // [核心增强] 策略 1: 优先尝试使用精准的 Variant 名称 (High Fidelity)
      // 这些名称通常由 2_scan_stm32_pins.ts 准确解析而来，包含复杂的括号模式
      if (!variantPath) {
        const seriesMatch = data.mcu.match(/STM32([A-Z0-9]{2})/);
        if (seriesMatch && data.variant) {
          const seriesDirName = `STM32${seriesMatch[1]}xx`;
          const candidatePath = path.join(variantsBase, seriesDirName, data.variant);
          if (fs.existsSync(candidatePath)) {
            variantPath = candidatePath;
          }
        }
      }

      // 策略 2: 如果没找到精准匹配，则回退到父级板卡定义的 Variant (PIO 默认)
      if (!variantPath && parentConfig?.build?.variant) {
        const pioVariantPath = path.join(variantsBase, parentConfig.build.variant);
        if (fs.existsSync(pioVariantPath)) {
          variantPath = pioVariantPath;
        }
      }

      // 策略 3: 兜底手动推断
      if (!variantPath && data.variant) {
        // 部分系列可能没有 STM32xxxx 形式的子目录
        const manualPath = path.join(variantsBase, data.variant);
        if (fs.existsSync(manualPath)) {
          variantPath = manualPath;
        }
      }

      if (!variantPath || !fs.existsSync(variantPath)) {
        console.warn(`[VariantGenerator] 无法找到匹配的 Variant 目录。搜索路径: ${variantPath}`);
        return false;
      }

      // 执行拷贝
      const files = fs.readdirSync(variantPath);
      for (const file of files) {
        // 避开一些可能冲突的构建控制文件
        if (file === 'CMakeLists.txt' || file === 'boards_entry.txt') continue;

        const srcFile = path.join(variantPath, file);
        const destFile = path.join(destDir, file);

        const stats = fs.statSync(srcFile);
        if (stats.isFile()) {
          // [PATCH] For generic boards, we want to avoid including multiple variant files
          // that could cause symbol redefinition errors (e.g., STM32WL series).
          if (data.id.toLowerCase().startsWith('generic_')) {
            // Only keep the main generic variant file
            if (file.startsWith('variant_') && file.endsWith('.cpp') && file !== 'variant_generic.cpp') {
              console.log(`[VariantGenerator] Skipping non-generic variant file: ${file}`);
              continue;
            }
            // Skip additional PeripheralPins files (e.g., PeripheralPins_WE_OCEANUS1.c)
            if (file.startsWith('PeripheralPins_') && file.endsWith('.c')) {
              console.log(`[VariantGenerator] Skipping specific PeripheralPins file: ${file}`);
              continue;
            }
          }

          // 对 C/C++/H 文件放宽 ARDUINO_GENERIC_ 宏检查
          if (file.endsWith('.c') || file.endsWith('.cpp') || file.endsWith('.h')) {
            let content = fs.readFileSync(srcFile, 'utf8');
            content = content.replace(/#if\s+defined\s*\(\s*ARDUINO_GENERIC_.*?\s*\)/g, '#if 1 // $&');
            fs.writeFileSync(destFile, content);
          } else {
            fs.copyFileSync(srcFile, destFile);
          }
        }
      }
      return true;
    } catch (e) {
      console.error('[VariantGenerator] Failed to copy official variant', e);
      return false;
    }
  }

  private async generateBoardJson(
    boardsDir: string,
    data: VariantData,
    variantName: string,
    parentConfig?: any,
    pioPlatformPath?: string
  ) {
    // [增强] 优先使用来自增强兼容性映射的精确内存大小
    let flashBytes = data.maxFlashSize || 0;
    let ramBytes = data.maxRamSize || 0;

    // 回退: 解析规格字符串中的 Flash/RAM
    if (!flashBytes || !ramBytes) {
      const specMatch = data.specs.match(/(\d+)k Flash \/ (\d+)k RAM/);
      if (specMatch) {
        flashBytes = flashBytes || parseInt(specMatch[1]) * 1024;
        ramBytes = ramBytes || parseInt(specMatch[2]) * 1024;
      }
    }

    // 最终回退值
    if (!flashBytes) flashBytes = 64 * 1024;
    if (!ramBytes) ramBytes = 20 * 1024;

    // 提前确定 product_line 用于 extra_flags
    // 产品线格式: STM32F103xB (HAL 设备选择器)
    let productLineMacro = data.productLine || this.inferProductLine(data.mcu);

    // [HOTFIX] STM32L1 系列 256KB flash (C) 且具有 132(Q) 或 144(Z) 引脚的芯片属于 Category 4，
    // 具有 GPIOF 和 GPIOG。它们必须使用 'xCA' 产品线而不是 'xC'，
    // 以便 CMSIS 头文件能够定义 GPIOF_BASE 和 GPIOG_BASE，否则
    // 从 STM32duino 复制来的 PeripheralPins.c 会编译失败。
    if (productLineMacro.match(/^STM32L1[0-9]{2}xC$/i)) {
      if (data.mcu.match(/STM32L1[0-9]{2}[QZ]/i)) {
        productLineMacro = productLineMacro + 'A';
        data.productLine = productLineMacro; // Force override
      }
    }

    // [HOTFIX] STM32WB0 系列 MCU (WB05, WB06, WB07, WB09) 需要 STM32WB0x 宏定义
    // 以便包含正确的 stm32wb0x.h CMSIS 内核头文件。它们不使用 WB05xx 等格式。
    if (productLineMacro.match(/^STM32WB0/i)) {
      productLineMacro = 'STM32WB0x';
      data.productLine = productLineMacro;
    }

    // 生成 Arduino 板卡宏用于 variant_generic.cpp 条件编译
    // 格式: ARDUINO_GENERIC_F103C8TX (系列 + 封装 + Flash + 后缀 'X')
    const arduinoBoardMacro = this.generateArduinoBoardMacro(data.mcu);

    // [CORE UPDATE] 即使提供了 data.build，也要确保存在强制性字段 (core, mcu)
    const defaultBuild = {
      core: "stm32",
      cpu: "cortex-m3", // 默认退路
      mcu: data.mcu.toLowerCase()
    };

    // 合并策略: data.build (如果有) > parentConfig.build (如果有) > 默认配置
    const build: any = {
      ...defaultBuild,
      ...(parentConfig?.build || {}),
      ...(data.build || {})
    };

    // 确保 extra_flags 包含了 productLineMacro 和 arduinoBoardMacro
    const existingExtraFlags = build.extra_flags || '';
    const requiredFlags = [`-D${productLineMacro}`, `-DARDUINO_GENERIC_${arduinoBoardMacro}`];
    let newExtraFlags = [...new Set([...existingExtraFlags.split(' ').filter((f: string) => f), ...requiredFlags])];

    // [HOTFIX] STM32WB0 系列 MCU 需要显式指定其 CMSIS 库的 Include 路径，
    // 因为 PlatformIO 的 python 脚本会错误地根据 "STM32WB" 前缀推断出 "STM32WBxx"。
    // 另外还需要针对 stm32wb0x.h 声明特定的子系列宏 (例如 STM32WB05)。
    if (productLineMacro === 'STM32WB0x') {
      newExtraFlags.push('-I"${platformio.packages_dir}/framework-arduinoststm32/system/Drivers/CMSIS/Device/ST/STM32WB0x/Include"');
      const wb0SubFamily = data.mcu.match(/STM32WB0[5679]/i);
      if (wb0SubFamily) {
        newExtraFlags.push(`-D${wb0SubFamily[0].toUpperCase()}`);
      }
    }
    build.extra_flags = newExtraFlags.join(' ');

    // [FIX] 始终确保构建配置中存在 'mcu' 字段，这是 PlatformIO 的硬性要求
    build.mcu = data.mcu.toLowerCase();

    // 如果尚未设置，则设置 f_cpu
    if (!build.f_cpu) {
      build.f_cpu = "72000000L"; // 默认 F_CPU
    }

    // [增强] 使用增强兼容性映射中的 product_line
    if (data.productLine && !build.product_line) {
      build.product_line = data.productLine;
    } else if (!build.product_line) {
      build.product_line = productLineMacro;
    }

    // 智能修正 CPU 类型 (F4, F3, G4, H7 等为 M4/M7)
    if (!parentConfig?.build?.cpu) {
      const mcuName = data.mcu.toUpperCase();
      let cpuType = "cortex-m3"; // 默认后备选项

      // 使用带正则的 switch(true) 进行更可靠的匹配，
      // 特别是为了处理包含 "GENERIC_STM32F103C8" 这种格式的情况
      switch (true) {
        case /^(GENERIC_)?STM32WBA/i.test(mcuName):
        case /^(GENERIC_)?STM32H5/i.test(mcuName):
        case /^(GENERIC_)?STM32U5/i.test(mcuName):
        case /^(GENERIC_)?STM32L5/i.test(mcuName):
          cpuType = "cortex-m33";
          break;
        case /^(GENERIC_)?STM32G0/i.test(mcuName):
        case /^(GENERIC_)?STM32F0/i.test(mcuName):
        case /^(GENERIC_)?STM32L0/i.test(mcuName):
        case /^(GENERIC_)?STM32C0/i.test(mcuName):
        case /^(GENERIC_)?STM32WB0/i.test(mcuName):
          cpuType = "cortex-m0plus";
          break;
        case /^(GENERIC_)?STM32F4/i.test(mcuName):
        case /^(GENERIC_)?STM32F3/i.test(mcuName):
        case /^(GENERIC_)?STM32G4/i.test(mcuName):
        case /^(GENERIC_)?STM32L4/i.test(mcuName):
        case /^(GENERIC_)?STM32WB/i.test(mcuName):
          cpuType = "cortex-m4";
          break;
        case /^(GENERIC_)?STM32F7/i.test(mcuName):
        case /^(GENERIC_)?STM32H7/i.test(mcuName):
          cpuType = "cortex-m7";
          break;
        case /^(GENERIC_)?STM32F1/i.test(mcuName):
        case /^(GENERIC_)?STM32F2/i.test(mcuName):
          cpuType = "cortex-m3";
          break;
        default:
          cpuType = "cortex-m3"; // 针对未知或旧版系列(如果上面未明确匹配)的默认值
          break;
      }
      build.cpu = cpuType;
    }

    // 强制重定向
    build.variant = variantName;
    // 如果我们要复用官方变体文件，则需要通过 variants_dir 指向官方路径
    // 或者我们直接把官方文件拷贝到本地 variants/ 目录下（当前策略）
    // 为了简单且不破坏用户环境，我们目前坚持：
    // 1. 如果有父级，把父级的 variant 指向的文件夹内容拷贝到本地 variants/eb_custom_variant/
    // 2. 然后 eb_custom_board.json 里的 variant 设为 eb_custom_variant

    // 如果有父配置且其有 variant 定义，尝试拷贝（如果还没拷贝的话建议在 generatePatch 处理）
    // 这里确保 ldscript 始终指向我们生成的那个
    build.ldscript = "ldscript.ld";

    const boardJson = {
      ...parentConfig, // 继承所有其他字段 (debug, frameworks, connectivity 等)
      build: build,
      name: `EmbedBlocks Custom (${data.name})`,
      upload: {
        ...(parentConfig?.upload || {}),
        maximum_ram_size: ramBytes,
        maximum_size: flashBytes,
      },
      vendor: "ST",
      url: "https://www.st.com/en/microcontrollers-microprocessors.html"
    };

    // 默认补全一些字段如果父级不存在
    if (!boardJson.frameworks) boardJson.frameworks = ["arduino", "cmsis", "stm32cube"];
    if (!boardJson.upload.protocol) boardJson.upload.protocol = "stlink";

    fs.writeFileSync(path.join(boardsDir, 'eb_custom_board.json'), JSON.stringify(boardJson, null, 2));
  }

  private formatPinName(pin: string): string {
    if (!pin) return "NC";
    // Strip suffixes like _R to avoid undefined PinName errors (PA_9_R -> PA_9)
    const match = pin.match(/^P([A-Z])(\d+)(_[A-Z]+)?$/);
    if (match) {
      return `P${match[1]}_${match[2]}`;
    }
    return pin;
  }

  private async generatePeripheralPinsC(variantDir: string, data: VariantData) {
    let content = `/*
 * THIS FILE IS GENERATED BY EMBEDBLOCKS STUDIO. DO NOT EDIT.
 * Generated for: ${data.name}
 */
#include <Arduino.h>
#include <PeripheralPins.h>

/* ===== UART ===== */
#ifdef HAL_UART_MODULE_ENABLED
WEAK const PinMap PinMap_UART_TX[] = {
`;

    if (data.pinout.UART) {
      Object.keys(data.pinout.UART).forEach(uart => {
        const inst = data.pinout.UART[uart];
        if (inst.TX) {
          inst.TX.forEach((pin: string) => {
            // Some keys are 'UART4', some are 'USART1', some are 'LPUART1'
            // Keep the exact name from the JSON key, just ensure it matches the core's expected instance macro.
            // The JSON keys are usually already correct (e.g. UART4, USART1, LPUART1).
            content += `  {${this.formatPinName(pin)}, ${uart}, STM_PIN_DATA(STM_MODE_AF_PP, GPIO_PULLUP, GPIO_AF_NONE)}, // Fallback GPIO_AF_NONE used\n`;
          });
        }
      });
    }
    content += `  {NC,    NP,    0}\n};\n`;

    // Add missing WEAK definitions to satisfy linker
    content += `
WEAK const PinMap PinMap_UART_RX[] = { {NC, NP, 0} };
WEAK const PinMap PinMap_UART_RTS[] = { {NC, NP, 0} };
WEAK const PinMap PinMap_UART_CTS[] = { {NC, NP, 0} };
#endif

/* ===== TIM ===== */
#ifdef HAL_TIM_MODULE_ENABLED
WEAK const PinMap PinMap_TIM[] = { {NC, NP, 0} };
#endif

/* ===== I2C ===== */
#ifdef HAL_I2C_MODULE_ENABLED
WEAK const PinMap PinMap_I2C_SDA[] = { {NC, NP, 0} };
WEAK const PinMap PinMap_I2C_SCL[] = { {NC, NP, 0} };
#endif

/* ===== SPI ===== */
#ifdef HAL_SPI_MODULE_ENABLED
WEAK const PinMap PinMap_SPI_MOSI[] = { {NC, NP, 0} };
WEAK const PinMap PinMap_SPI_MISO[] = { {NC, NP, 0} };
WEAK const PinMap PinMap_SPI_SCLK[] = { {NC, NP, 0} };
WEAK const PinMap PinMap_SPI_SSEL[] = { {NC, NP, 0} };
#endif

/* ===== ADC ===== */
#ifdef HAL_ADC_MODULE_ENABLED
WEAK const PinMap PinMap_ADC[] = { {NC, NP, 0} };
#endif

/* ===== DAC ===== */
#ifdef HAL_DAC_MODULE_ENABLED
WEAK const PinMap PinMap_DAC[] = { {NC, NP, 0} };
#endif
`;

    fs.writeFileSync(path.join(variantDir, 'PeripheralPins.c'), content);
  }

  private async generateVariantH(variantDir: string, data: VariantData) {
    const digitalPinsLength = data.pin_options?.digital?.length || 0;
    let content = `#ifndef _VARIANT_GENERIC_H_
#define _VARIANT_GENERIC_H_

#define NUM_DIGITAL_PINS        ${digitalPinsLength}
#define NUM_ANALOG_INPUTS       0

/* UART */
#define SERIAL_UART_INSTANCE 1
#define PIN_SERIAL_RX ${this.formatPinName(data.defaults?.serial?.rx || 'PA3')}
#define PIN_SERIAL_TX ${this.formatPinName(data.defaults?.serial?.tx || 'PA2')}

/* I2C */
#define PIN_WIRE_SDA ${this.formatPinName(data.defaults?.i2c?.sda || 'PB7')}
#define PIN_WIRE_SCL ${this.formatPinName(data.defaults?.i2c?.scl || 'PB6')}

/* SPI */
#define PIN_SPI_MOSI ${this.formatPinName(data.defaults?.spi?.mosi || 'PA7')}
#define PIN_SPI_MISO ${this.formatPinName(data.defaults?.spi?.miso || 'PA6')}
#define PIN_SPI_SCK  ${this.formatPinName(data.defaults?.spi?.sck || 'PA5')}
#define PIN_SPI_SS   ${this.formatPinName(data.defaults?.spi?.ss || 'PA4')}

#endif
`;
    fs.writeFileSync(path.join(variantDir, 'variant_generic.h'), content);
  }

  private async generateVariantCpp(variantDir: string, data: VariantData) {
    const digitalPins = data.pin_options.digital || [];
    let content = `#include <Arduino.h>\n\n`;
    content += `// Digital Pin Array\n`;
    content += `extern "C" {\n`;
    content += `  const PinName digitalPin[] = {\n`;
    digitalPins.forEach((pair: string[]) => {
      content += `    ${this.formatPinName(pair[1])}, // ${pair[0]}\n`;
    });
    content += `  };\n`;
    content += `}\n\n`;

    content += `// Analog Pin Array\n`;
    content += `// TODO: Implement analogPin array mapping if needed for full compatibility\n`;

    fs.writeFileSync(path.join(variantDir, 'variant_generic.cpp'), content);
  }

  private async generateGenericClockC(variantDir: string) {
    const content = `/*
 * THIS FILE IS GENERATED BY EMBEDBLOCKS STUDIO. DO NOT EDIT.
 */
#include <Arduino.h>

#ifdef __cplusplus
extern "C" {
#endif

WEAK void SystemClock_Config(void)
{
  /* SystemClock_Config can be generated by STM32CubeMX */
}

#ifdef __cplusplus
}
#endif
`;
    fs.writeFileSync(path.join(variantDir, 'generic_clock.c'), content);
  }

  private async generateLdScript(variantDir: string, data: VariantData) {
    // 解析规格字符串获取 RAM/Flash 大小
    let flashKb = 64;
    let ramKb = 20;
    const specMatch = data.specs.match(/(\d+)k Flash \/ (\d+)k RAM/);
    if (specMatch) {
      flashKb = parseInt(specMatch[1]);
      ramKb = parseInt(specMatch[2]);
    }

    const flashSize = flashKb + "K";
    const ramSize = ramKb + "K";
    const ramEndAddr = 0x20000000 + (ramKb * 1024);
    const ramEndHex = "0x" + ramEndAddr.toString(16);

    const content = `/*
 * THIS FILE IS GENERATED BY EMBEDBLOCKS STUDIO. DO NOT EDIT.
 * Linker script for ${data.name}
 * Compatible with STM32duino and PlatformIO
 */

/* Highest address of the user mode stack */
_estack = ${ramEndHex};    /* end of RAM */

/* Generate a link error if heap and stack don't fit into RAM */
_Min_Heap_Size = 0x200;    /* required amount of heap  */
_Min_Stack_Size = 0x400;   /* required amount of stack */

ENTRY(Reset_Handler)

MEMORY
{
  FLASH (rx) : ORIGIN = 0x08000000, LENGTH = ${flashSize}
  RAM (rwx)  : ORIGIN = 0x20000000, LENGTH = ${ramSize}
}

SECTIONS
{
  /* The startup code goes first into FLASH */
  .text :
  {
    . = ALIGN(4);
    KEEP(*(.isr_vector)) /* Startup code */
    . = ALIGN(4);
    *(.text)           /* .text sections (code) */
    *(.text*)          /* .text* sections (code) */
    *(.glue_7)         /* glue arm to thumb code */
    *(.glue_7t)        /* glue thumb to arm code */
    *(.eh_frame)

    KEEP (*(.init))
    KEEP (*(.fini))

    . = ALIGN(4);
    _etext = .;        /* define a global symbols at end of code */
  } > FLASH

  /* Constant data goes into FLASH */
  .rodata :
  {
    . = ALIGN(4);
    *(.rodata)         /* .rodata sections (constants, strings, etc.) */
    *(.rodata*)        /* .rodata* sections (constants, strings, etc.) */
    . = ALIGN(4);
  } > FLASH

  .ARM.extab   : { *(.ARM.extab* .gnu.linkonce.armextab.*) } > FLASH
  .ARM.exidx   : {
    __exidx_start = .;
    *(.ARM.exidx*)
    __exidx_end = .;
  } > FLASH

  .preinit_array     :
  {
    PROVIDE_HIDDEN (__preinit_array_start = .);
    KEEP (*(.preinit_array*))
    PROVIDE_HIDDEN (__preinit_array_end = .);
  } > FLASH
  .init_array :
  {
    PROVIDE_HIDDEN (__init_array_start = .);
    KEEP (*(SORT(.init_array.*)))
    KEEP (*(.init_array*))
    PROVIDE_HIDDEN (__init_array_end = .);
  } > FLASH
  .fini_array :
  {
    PROVIDE_HIDDEN (__fini_array_start = .);
    KEEP (*(SORT(.fini_array.*)))
    KEEP (*(.fini_array*))
    PROVIDE_HIDDEN (__fini_array_end = .);
  } > FLASH

  /* used by the startup to initialize data */
  _sidata = LOADADDR(.data);

  /* Initialized data sections goes into RAM, load LMA copy after code */
  .data : 
  {
    . = ALIGN(4);
    _sdata = .;        /* create a global symbol at data start */
    *(.data)           /* .data sections */
    *(.data*)          /* .data* sections */

    . = ALIGN(4);
    _edata = .;        /* define a global symbol at data end */
  } > RAM AT > FLASH

  /* Uninitialized data section */
  . = ALIGN(4);
  .bss :
  {
    /* This is used by the startup in order to initialize the .bss secion */
    _sbss = .;         /* define a global symbol at bss start */
    __bss_start__ = _sbss;
    *(.bss)
    *(.bss*)
    *(COMMON)

    . = ALIGN(4);
    _ebss = .;         /* define a global symbol at bss end */
    __bss_end__ = _ebss;
  } > RAM

  /* User_heap_stack section, used to check that there is enough RAM left */
  ._user_heap_stack :
  {
    . = ALIGN(8);
    PROVIDE ( end = . );
    PROVIDE ( _end = . );
    . = . + 0x200;    /* Min depth for Heap */
    . = . + 0x400;    /* Min depth for Stack */
    . = ALIGN(8);
  } > RAM

  /* Remove information from the standard libraries */
  /DISCARD/ :
  {
    libc.a ( * )
    libm.a ( * )
    libgcc.a ( * )
  }

  .ARM.attributes 0 : { *(.ARM.attributes) }
}
`;
    fs.writeFileSync(path.join(variantDir, 'ldscript.ld'), content);
  }

  /**
   * 生成 variant_EB_CUSTOM_BOARD.h - PlatformIO 期望的包装头文件
   * PlatformIO 会查找名为 variant_<BOARD_NAME>.h 的头文件
   * 此包装器只是包含实际的 variant 头文件 (variant_generic.h)
   */
  private async generateVariantWrapperHeader(variantDir: string, data: VariantData) {
    const content = `/*
 * THIS FILE IS GENERATED BY EMBEDBLOCKS STUDIO.
 * Wrapper header for PlatformIO compatibility.
 * Generated for: ${data.name}
 */
#pragma once

// Include the actual variant header
// Using variant_generic.h as default for generic STM32 boards
#include "variant_generic.h"
`;
    fs.writeFileSync(path.join(variantDir, 'variant_EB_CUSTOM_BOARD.h'), content);
    console.log(`[VariantGenerator] Created variant_EB_CUSTOM_BOARD.h wrapper`);
  }

  /**
   * 从 MCU 名称推断 product_line 用于 STM32 HAL 设备选择
   * MCU 格式: STM32F103C8 -> product_line: STM32F103xB
   * Flash 大小代码 (8, B, C, E, G) 需要替换为 'x' + 预期的 HAL 后缀
   */
  private inferProductLine(mcu: string): string {
    const upper = mcu.toUpperCase();
    // 匹配模式: STM32 + 系列(F/G/L/H/W/C/U) + 产品线(2-3位数字) + 封装(字母) + Flash(数字或字母)
    const match = upper.match(/^(STM32[A-Z]\d{2,3})([A-Z])([A-Z0-9])$/);
    if (!match) {
      // 回退: 直接返回 MCU 名称
      return upper;
    }

    const base = match[1]; // e.g., STM32F103
    const pkgCode = match[2]; // e.g., C (package code)
    const flashCode = match[3]; // e.g., 8 (flash size code)

    // STM32 HAL 使用 product_line 格式: STM32F103xB
    // 'x' 是封装的通配符，最后一个字母是 Flash 范围指示符
    // Flash 代码映射 (近似值):
    // 4/6/8 -> x8 (小容量), B/C -> xB (中容量), D/E -> xE, F/G -> xG (高密度)
    let flashSuffix = flashCode;
    if (['4', '6', '8'].includes(flashCode)) {
      flashSuffix = '8';
    } else if (['B', 'C'].includes(flashCode)) {
      flashSuffix = 'B';
    } else if (['D', 'E'].includes(flashCode)) {
      flashSuffix = 'E';
    } else if (['F', 'G', 'I', 'Z'].includes(flashCode)) {
      flashSuffix = 'G';
    }

    return `${base}x${flashSuffix}`;
  }

  /**
   * 生成 Arduino 板卡宏用于 variant 条件编译
   * MCU 格式: STM32F103C8 -> ARDUINO_GENERIC_F103C8TX
   * variant_generic.cpp 编译 digitalPin 数组时需要此宏
   */
  private generateArduinoBoardMacro(mcu: string): string {
    const upper = mcu.toUpperCase();
    // 匹配模式: STM32 + 系列(F/G/L/H/W/C/U) + 产品线(2-3位数字) + 封装(字母) + Flash(数字或字母)
    const match = upper.match(/^STM32([A-Z])(\d{2,3})([A-Z])([A-Z0-9])$/);
    if (!match) {
      // 回退格式
      return `ARDUINO_GENERIC_${upper.replace('STM32', '')}TX`;
    }

    const series = match[1]; // e.g., F
    const line = match[2];   // e.g., 103
    const pkg = match[3];    // e.g., C
    const flash = match[4];  // e.g., 8

    // 标准格式: ARDUINO_GENERIC_F103C8TX
    return `ARDUINO_GENERIC_${series}${line}${pkg}${flash}TX`;
  }
}

export const variantGenerator = new VariantGenerator();
