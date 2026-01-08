
import { Board } from '../../../types/board';

// 单独定义 V1 版本
export const MY_BOARD_V1: Board = {
    id: 'my_board_v1',
    name: 'My Board V1 (Basic)',
    mcu: 'ESP32',
    freq: '240MHz',
    flash: '4MB',
    ram: '520KB',
    fqbn: 'platformio:esp32dev',
    // 填充一些示例引脚，让它看起来更真实
    pins: {
        digital: [{ label: 'GPIO 0', value: '0' }, { label: 'GPIO 2', value: '2' }],
        analog: [{ label: 'VP (36)', value: '36' }],
        pwm: [{ label: 'Any GPIO', value: 'any' }],
        i2c: [{ label: 'SDA (21)', value: '21' }, { label: 'SCL (22)', value: '22' }],
        spi: [],
        serial: [{ label: 'Serial0', value: 'Serial' }]
    },
    build: { envName: 'v1', platform: 'espressif32', board: 'esp32dev', framework: 'arduino' }
};
