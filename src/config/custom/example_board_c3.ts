
import { defineBoard } from '../../utils/extension_helpers';

/**
 * [示例-A] 单独的第三方开发板配置
 * 
 * 这是一个真实的硬件配置案例：ESP32-C3 SuperMini。
 * 该文件展示了如何定义一款非官方支持的开发板，并使其出现在 IDE 的板卡列表中。
 * 
 * 使用 `defineBoard` 辅助函数可以获得完整的 TypeScript 类型提示。
 */

const PINS_C3_SUPERMINI = {
    // 数字引脚：不仅包含物理编号，还应包含丝印标记
    digital: [
        { label: 'P0 (GPIO0)', value: '0' },
        { label: 'P1 (GPIO1)', value: '1' },
        { label: 'P2 (GPIO2)', value: '2' },
        { label: 'P3 (GPIO3)', value: '3' },
        { label: 'P4 (GPIO4)', value: '4' },
        { label: 'P5 (GPIO5)', value: '5' },
        { label: 'P6 (GPIO6)', value: '6' },
        { label: 'P7 (GPIO7)', value: '7' },
        { label: 'P8 (GPIO8)', value: '8' },
        { label: 'P9 (GPIO9)', value: '9' },
        { label: 'P10 (GPIO10)', value: '10' },
    ],
    // 模拟引脚：ESP32-C3 的 ADC 引脚
    analog: [
        { label: 'A0 (GPIO0)', value: '0' },
        { label: 'A1 (GPIO1)', value: '1' },
        { label: 'A2 (GPIO2)', value: '2' },
        { label: 'A3 (GPIO3)', value: '3' },
        { label: 'A4 (GPIO4)', value: '4' },
        { label: 'A5 (GPIO5)', value: '5' },
    ],
    // PWM：ESP32 全引脚支持 PWM，因此使用特殊值 'any'
    pwm: [
        { label: { zh: '任意 GPIO', en: 'Any GPIO' }, value: 'any' }
    ],
    // I2C 接口
    i2c: [
        { label: 'SDA (GPIO 8)', value: '8' },
        { label: 'SCL (GPIO 9)', value: '9' }
    ],
    // SPI 接口
    spi: [
        { label: 'MOSI (GPIO 6)', value: '6' },
        { label: 'MISO (GPIO 5)', value: '5' },
        { label: 'SCK (GPIO 4)', value: '4' },
    ],
    // 硬件串口
    serial: [
        { label: { zh: 'USB 串口 (Serial)', en: 'USB Serial' }, value: 'Serial' },
        { label: 'UART1 (Tx:21, Rx:20)', value: 'Serial1' }
    ],
    // 声明板载功能能力，用于积木分类过滤
    capabilities: {
        wifi: true,
        bluetooth: true // C3 支持 BLE
    }
};

export const EXAMPLE_C3_SUPERMINI = defineBoard({
    // 唯一 ID，必须全局唯一
    id: 'example_c3_supermini',

    // 显示名称：推荐使用中英双语对象
    name: {
        zh: '示例: C3 SuperMini (无需配置)',
        en: 'Example: C3 SuperMini'
    },

    // 硬件参数：用于 UI 显示
    mcu: 'ESP32-C3',
    freq: '160MHz',
    flash: '4MB',
    ram: '400KB',

    // FQBN (Fully Qualified Board Name)：虽然目前主要使用 PlatformIO，但保留此字段以兼容 Arduino CLI
    fqbn: 'esp32:esp32:esp32c3',

    // 引脚定义引用
    pins: PINS_C3_SUPERMINI,

    // PlatformIO 构建配置 (关键)
    // 这些参数将直接传递给 PlatformIO Core
    build: {
        envName: 'c3_supermini',      // PIO 环境名
        platform: 'espressif32',      // 平台
        board: 'esp32-c3-devkitm-1',  // 使用最接近的通用板型
        framework: 'arduino',         // 框架

        // 可选：自定义上传波特率或其他 PIO 选项
        // upload_speed: '921600' 
    }
});
