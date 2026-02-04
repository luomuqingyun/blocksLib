import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
// [更改] 直接指向本地 PlatformIO 安装的 framework-arduinoststm32 包
// 这确保了脚本生成的数据与 Studio 实际编译使用的核心完全一致
const PIO_PACKAGES_DIR = path.join(os.homedir(), '.platformio', 'packages');
const PIO_CORE_PATH = path.join(PIO_PACKAGES_DIR, 'framework-arduinoststm32');

export const ARDUINO_CORE_STM32_PATH = fs.existsSync(PIO_CORE_PATH)
    ? PIO_CORE_PATH
    : path.join(PIO_PACKAGES_DIR, 'framework-arduinoststm32@*'); // Hint for debugging if main link missing

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
