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
  variant: string; // e.g. "F030RCT" (板卡原始 variant 名)
  parentBoardId?: string; // [NEW] e.g. "nucleo_f030r8"
  pinMap: any[];
  pinout: any;
  defaults: any;
  pin_options: any;
  // 来自增强兼容性映射的字段
  enhancedVariantPath?: string; // e.g. "STM32F1xx/F103C8T_F103CB(T-U)" (完整的 STM32duino variant 路径)
  productLine?: string; // e.g. "STM32F103xB"
  maxFlashSize?: number; // bytes
  maxRamSize?: number; // bytes
}

class VariantGenerator {
  /**
   * Generates a local PlatformIO board and variant patch inside the project directory
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

    // 1. Create Directories
    if (!fs.existsSync(boardsDir)) fs.mkdirSync(boardsDir, { recursive: true });
    if (!fs.existsSync(specificVariantDir)) fs.mkdirSync(specificVariantDir, { recursive: true });

    // 2. Smart Inheritance: Load parent board's build config if provided
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

    // 3. Generate boards/eb_custom_board.json (Always generated, potentially inheriting)
    await this.generateBoardJson(boardsDir, boardData, variantName, parentConfig, pioPlatformPath);

    // 4. Smart Merge: Try to copy existing official files if arduinoCorePath is provided
    let copiedOfficial = false;
    if (arduinoCorePath && fs.existsSync(arduinoCorePath)) {
      copiedOfficial = await this.copyExistingVariant(specificVariantDir, boardData, arduinoCorePath, parentConfig);
    }

    if (!copiedOfficial) {
      console.log(`[VariantGenerator] No official variant found for ${boardData.name}, generating fallback files...`);
      // Fallback: Generate variants/eb_custom_variant/PeripheralPins.c
      await this.generatePeripheralPinsC(specificVariantDir, boardData);
      // Fallback: Generate variants/eb_custom_variant/variant_generic.h
      await this.generateVariantH(specificVariantDir, boardData);
      // Fallback: Generate variants/eb_custom_variant/variant_generic.cpp
      await this.generateVariantCpp(specificVariantDir, boardData);
    } else {
      console.log(`[VariantGenerator] Successfully reused official variant files for ${boardData.name}`);
    }

    // 5. Generate variants/eb_custom_variant/ldscript.ld (Always customized for RAM/Flash accuracy)
    await this.generateLdScript(specificVariantDir, boardData);

    // 6. Generate variant_EB_CUSTOM_BOARD.h - PlatformIO expects this file based on board name
    // It should just include the actual variant header (variant_generic.h or similar)
    await this.generateVariantWrapperHeader(specificVariantDir, boardData);
  }

  /**
   * Attempts to find and copy official files from Arduino_Core_STM32/variants
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
          fs.copyFileSync(srcFile, destFile);
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

    // Determine product_line early for extra_flags
    // Product line format: STM32F103xB (HAL device selector)
    const productLineMacro = data.productLine || this.inferProductLine(data.mcu);

    // Generate Arduino board macro for variant_generic.cpp conditional compilation
    // Format: ARDUINO_GENERIC_F103C8TX (series + package + flash + suffix 'X')
    const arduinoBoardMacro = this.generateArduinoBoardMacro(data.mcu);

    // [核心逻辑] 继承与重定向
    const build = parentConfig?.build ? { ...parentConfig.build } : {
      core: "stm32",
      cpu: "cortex-m0",
      // extra_flags must include both product_line and Arduino board macros
      extra_flags: `-D${productLineMacro} -D${arduinoBoardMacro}`,
      f_cpu: "72000000L",
      mcu: data.mcu.toLowerCase(),
    };

    // [增强] 使用增强兼容性映射中的 product_line
    if (data.productLine && !build.product_line) {
      build.product_line = data.productLine;
    } else if (!build.product_line) {
      build.product_line = productLineMacro;
    }

    // 智能修正 CPU 类型 (F4, F3, G4, H7 等为 M4/M7)
    if (!parentConfig?.build?.cpu) {
      const mcuPrefix = data.mcu.substring(0, 7).toUpperCase();
      if (['STM32F4', 'STM32F3', 'STM32G4', 'STM32L4', 'STM32WB'].some(p => mcuPrefix.startsWith(p))) {
        build.cpu = "cortex-m4";
      } else if (['STM32F7', 'STM32H7'].some(p => mcuPrefix.startsWith(p))) {
        build.cpu = "cortex-m7";
      } else if (['STM32G0', 'STM32F0', 'STM32L0', 'STM32C0'].some(p => mcuPrefix.startsWith(p))) {
        build.cpu = "cortex-m0plus";
      } else if (['STM32F2'].some(p => mcuPrefix.startsWith(p))) {
        build.cpu = "cortex-m3";
      } else {
        build.cpu = "cortex-m3"; // F1, F2 等默认 M3
      }
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
            content += `  {${pin}, ${uart.replace('USART', 'INSTANCE_USART').replace('UART', 'INSTANCE_UART')}, STM_PIN_DATA(STM_MODE_AF_PP, GPIO_PULLUP, GPIO_AF_UNKNOWN)}, // TODO: Better AF matching if needed\n`;
          });
        }
      });
    }
    content += `  {NC,    NP,    0}\n};\n#endif\n\n`;

    // Note: This is a simplified version. Full AF data would require more parsing.
    // For now, focusing on the infrastructure. 

    fs.writeFileSync(path.join(variantDir, 'PeripheralPins.c'), content);
  }

  private async generateVariantH(variantDir: string, data: VariantData) {
    let content = `#ifndef _VARIANT_GENERIC_H_
#define _VARIANT_GENERIC_H_

/* UART */
#define SERIAL_UART_INSTANCE 1
#define PIN_SERIAL_RX ${data.defaults?.serial?.rx || 'PA3'}
#define PIN_SERIAL_TX ${data.defaults?.serial?.tx || 'PA2'}

/* I2C */
#define PIN_WIRE_SDA ${data.defaults?.i2c?.sda || 'PB7'}
#define PIN_WIRE_SCL ${data.defaults?.i2c?.scl || 'PB6'}

/* SPI */
#define PIN_SPI_MOSI ${data.defaults?.spi?.mosi || 'PA7'}
#define PIN_SPI_MISO ${data.defaults?.spi?.miso || 'PA6'}
#define PIN_SPI_SCK  ${data.defaults?.spi?.sck || 'PA5'}
#define PIN_SPI_SS   ${data.defaults?.spi?.ss || 'PA4'}

#endif
`;
    fs.writeFileSync(path.join(variantDir, 'variant_generic.h'), content);
  }

  private async generateVariantCpp(variantDir: string, data: VariantData) {
    const digitalPins = data.pin_options.digital || [];
    let content = `#include <Arduino.h>\n\n`;
    content += `// Digital Pin Array\n`;
    content += `const uint32_t digitalPin[] = {\n`;
    digitalPins.forEach((pair: string[]) => {
      content += `  ${pair[1]}, // ${pair[0]}\n`;
    });
    content += `};\n\n`;

    content += `// Analog Pin Array\n`;
    content += `// TODO: Implement analogPin array mapping if needed for full compatibility\n`;

    fs.writeFileSync(path.join(variantDir, 'variant_generic.cpp'), content);
  }

  private async generateLdScript(variantDir: string, data: VariantData) {
    // Parse specs for RAM/Flash
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
   * Generate variant_EB_CUSTOM_BOARD.h - a wrapper header that PlatformIO expects
   * PlatformIO looks for a header file named variant_<BOARD_NAME>.h 
   * This wrapper just includes the actual variant header (variant_generic.h)
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
   * Infer product_line from MCU name for STM32 HAL device selection
   * MCU format: STM32F103C8 -> product_line: STM32F103xB
   * The flash size code (8, B, C, E, G) needs to be replaced with 'x' + expected HAL suffix
   */
  private inferProductLine(mcu: string): string {
    const upper = mcu.toUpperCase();
    // Match pattern: STM32 + series(F/G/L/H/W/C/U) + line(2-3 digits) + package(letter) + flash(digit or letter)
    const match = upper.match(/^(STM32[A-Z]\d{2,3})([A-Z])([A-Z0-9])$/);
    if (!match) {
      // Fallback: just return MCU as is
      return upper;
    }

    const base = match[1]; // e.g., STM32F103
    const pkgCode = match[2]; // e.g., C (package code)
    const flashCode = match[3]; // e.g., 8 (flash size code)

    // STM32 HAL uses product_line format: STM32F103xB
    // The 'x' is a wildcard for package, and the last letter is a flash range indicator
    // Flash code mapping (approximate):
    // 4/6/8 -> x8 (small), B/C -> xB (medium), D/E -> xE, F/G -> xG (high density)
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
   * Generate Arduino board macro for variant conditional compilation
   * MCU format: STM32F103C8 -> ARDUINO_GENERIC_F103C8TX
   * This macro is required for variant_generic.cpp to compile the digitalPin array
   */
  private generateArduinoBoardMacro(mcu: string): string {
    const upper = mcu.toUpperCase();
    // Match pattern: STM32 + series(F/G/L/H/W/C/U) + line(2-3 digits) + package(letter) + flash(digit or letter)
    const match = upper.match(/^STM32([A-Z])(\d{2,3})([A-Z])([A-Z0-9])$/);
    if (!match) {
      // Fallback format
      return `ARDUINO_GENERIC_${upper.replace('STM32', '')}TX`;
    }

    const series = match[1]; // e.g., F
    const line = match[2];   // e.g., 103
    const pkg = match[3];    // e.g., C
    const flash = match[4];  // e.g., 8

    // Standard format: ARDUINO_GENERIC_F103C8TX
    return `ARDUINO_GENERIC_${series}${line}${pkg}${flash}TX`;
  }
}

export const variantGenerator = new VariantGenerator();
