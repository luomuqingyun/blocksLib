
import { Board } from '../../../types/board';

// 单独定义 V2 版本
export const MY_BOARD_V2: Board = {
    id: 'my_board_v2',
    name: 'My Board V2 (Pro)',
    mcu: 'ESP32-S3', // Updated to S3
    freq: '240MHz',
    flash: '8MB',
    ram: '8MB',
    fqbn: 'platformio:esp32s3',
    // V2 拥有更多引脚
    pins: {
        digital: [
            { label: 'GPIO 0', value: '0' }, { label: 'GPIO 1', value: '1' },
            { label: 'GPIO 2', value: '2' }, { label: 'GPIO 3', value: '3' },
            { label: 'GPIO 4', value: '4' }, { label: 'GPIO 5', value: '5' }
        ],
        analog: [{ label: 'A0 (1)', value: '1' }, { label: 'A1 (2)', value: '2' }],
        pwm: [{ label: 'Any GPIO', value: 'any' }],
        i2c: [{ label: 'SDA (8)', value: '8' }, { label: 'SCL (9)', value: '9' }],
        spi: [{ label: 'MOSI (11)', value: '11' }, { label: 'MISO (13)', value: '13' }, { label: 'SCK (12)', value: '12' }],
        serial: [{ label: 'Serial0', value: 'Serial0' }, { label: 'USB Serial', value: 'Serial' }]
    },
    build: { envName: 'v2', platform: 'espressif32', board: 'esp32-s3-devkitc-1', framework: 'arduino' }
};
