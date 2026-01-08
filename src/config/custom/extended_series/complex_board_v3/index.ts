
import { Board } from '../../../../types/board';

// 这是一个文件夹形式的板子定义
// 适合包含复杂的引脚映射文件、资源文件等
export const MY_COMPLEX_BOARD: Board = {
    id: 'my_complex_board_v3',
    name: { zh: '复杂开发板 V3 (文件夹)', en: 'Complex Board V3 (Folder)' },
    mcu: 'ESP32-S3',
    freq: '240MHz',
    flash: '16MB',
    ram: '8MB',
    fqbn: 'platformio:esp32s3',
    pins: {
        digital: [
            { label: { zh: '按钮 1', en: 'BTN 1' }, value: '0' },
            { label: { zh: 'LED 1', en: 'LED 1' }, value: '2' }
        ], // 使用自定义 Label
        analog: [],
        pwm: [],
        i2c: [],
        spi: [],
        serial: [{ label: { zh: 'USB 串口', en: 'USB' }, value: 'Serial' }]
    },
    build: { envName: 'v3', platform: 'espressif32', board: 'esp32-s3-devkitc-1', framework: 'arduino' }
};
