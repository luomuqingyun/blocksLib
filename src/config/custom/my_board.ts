
import { defineBoard } from '../../utils/extension_helpers';

/**
 * 示例: 自定义开发板配置 (独立文件)
 * 使用 defineBoard 助手函数，享受丝滑的类型提示。
 */

const PIN_LIST_DEMO = {
    digital: [
        { label: 'GPIO 0', value: '0' }, { label: 'GPIO 2', value: '2' },
        { label: 'GPIO 12', value: '12' }, { label: 'GPIO 13', value: '13' }
    ],
    analog: [
        { label: 'ADC1 (32)', value: '32' }, { label: 'ADC2 (33)', value: '33' }
    ],
    pwm: [{ label: { zh: '所有引脚', en: 'All GPIOs' }, value: 'any' }],
    i2c: [{ label: 'SDA (21)', value: '21' }, { label: 'SCL (22)', value: '22' }],
    spi: [{ label: 'MOSI (23)', value: '23' }, { label: 'MISO (19)', value: '19' }, { label: 'SCK (18)', value: '18' }],
    serial: [{ label: { zh: '默认串口', en: 'Serial0' }, value: 'Serial' }]
};

export const MY_CUSTOM_BOARD = defineBoard({
    id: 'my_custom_board_v1',
    name: { zh: '我的自定义开发板 V1', en: 'My Custom Board V1' },
    mcu: 'ESP32',
    freq: '240MHz',
    flash: '4MB',
    ram: '520KB',
    fqbn: 'platformio:esp32dev',
    pins: PIN_LIST_DEMO,
    capabilities: {
        wifi: true
    },
    build: {
        envName: 'custom_board',
        platform: 'espressif32',
        board: 'esp32dev',
        framework: 'arduino'
    }
});
