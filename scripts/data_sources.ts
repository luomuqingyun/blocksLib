/**
 * scripts/data_sources.ts
 * 
 * 集中管理项目使用的外部 STM32 数据源路径。
 * 这些路径指向本地克隆的官方或社区维护的仓库，用于高精度数据抓取和自动化补全。
 */

import * as fs from 'fs';
import * as path from 'path';

// ----------------------------------------------------------------------------
// 1. STM32 Official Open Pin Data
// 对应仓库：https://github.com/STMicroelectronics/STM32_open_pin_data
// 用途：获取最权威的管脚定义和功能映射（XML 格式）
// ----------------------------------------------------------------------------
export const ST_OPEN_PIN_DATA_PATH = 'G:\\Project\\Easy_Embedded\\STM32_DATA\\STM32_open_pin_data';

// ----------------------------------------------------------------------------
// 2. Embassy-rs STM32 Data (Generated)
// 对应仓库：https://github.com/embassy-rs/stm32-data-generated
// 用途：获取物理引脚布局、坐标和封装图（JSON 格式）。
// 注意：这是社区 (embassy-rs) 基于官方 XML 整理生成的衍生数据，非 ST 官方直接发布。
// ----------------------------------------------------------------------------
export const EMBASSY_STM32_DATA_PATH = 'G:\\Project\\Easy_Embedded\\STM32_DATA\\stm32-data-generated';

// ----------------------------------------------------------------------------
// 3. Official Arduino Core for STM32
// 对应仓库：https://github.com/stm32duino/Arduino_Core_STM32
// 用途：扫描 variants 目录，自动发现支持的型号并提取引脚宏映射
// ----------------------------------------------------------------------------
export const ARDUINO_CORE_STM32_PATH = 'G:\\Project\\Easy_Embedded\\STM32_DATA\\Arduino_Core_STM32';

/**
 * 辅助函数：根据具体需求选择数据源，如果本地路径不存在则回退
 * @param preferredPath 优先使用的本地路径
 * @param fallbackPath 回退的路径 (如 .platformio 目录)
 */
export function resolveDataPath(preferredPath: string, fallbackPath: string): string {
    if (fs.existsSync(preferredPath)) {
        return preferredPath;
    }
    return fallbackPath;
}
