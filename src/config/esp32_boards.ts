import { BoardFamily, BoardPins } from '../types/board';

const ESP32_PINS: BoardPins = {
    digital: [
        { label: 'GPIO 0', value: '0' }, { label: 'GPIO 1 (TX0)', value: '1' },
        { label: 'GPIO 2', value: '2' }, { label: 'GPIO 3 (RX0)', value: '3' },
        { label: 'GPIO 4', value: '4' }, { label: 'GPIO 5', value: '5' },
        { label: 'GPIO 12', value: '12' }, { label: 'GPIO 13', value: '13' },
        { label: 'GPIO 14', value: '14' }, { label: 'GPIO 15', value: '15' },
        { label: 'GPIO 16', value: '16' }, { label: 'GPIO 17', value: '17' },
        { label: 'GPIO 18', value: '18' }, { label: 'GPIO 19', value: '19' },
        { label: 'GPIO 21', value: '21' }, { label: 'GPIO 22', value: '22' },
        { label: 'GPIO 23', value: '23' }, { label: 'GPIO 25', value: '25' },
        { label: 'GPIO 26', value: '26' }, { label: 'GPIO 27', value: '27' },
        { label: 'GPIO 32', value: '32' }, { label: 'GPIO 33', value: '33' }
    ],
    analog: [
        { label: 'VP (36)', value: '36' }, { label: 'VN (39)', value: '39' },
        { label: 'D34', value: '34' }, { label: 'D35', value: '35' },
        { label: 'D32', value: '32' }, { label: 'D33', value: '33' },
        { label: 'D25', value: '25' }, { label: 'D26', value: '26' },
        { label: 'D27', value: '27' }, { label: 'D14', value: '14' },
        { label: 'D12', value: '12' }, { label: 'D13', value: '13' },
        { label: 'D15', value: '15' }, { label: 'D2', value: '2' },
        { label: 'D4', value: '4' }, { label: 'D0', value: '0' }
    ],
    pwm: [
        { label: 'Any GPIO', value: 'any' }
    ],
    i2c: [
        { label: 'SDA (21)', value: '21' }, { label: 'SCL (22)', value: '22' }
    ],
    spi: [
        { label: 'MOSI (23)', value: '23' }, { label: 'MISO (19)', value: '19' }, { label: 'SCK (18)', value: '18' }
    ],
    serial: [
        { label: 'Serial0 (1/3)', value: 'Serial' }, { label: 'Serial1 (9/10)', value: 'Serial1' }, { label: 'Serial2 (17/16)', value: 'Serial2' }
    ]
};

const ESP32_S3_PINS: BoardPins = {
    ...ESP32_PINS,
    // S3 has different pin map, especially for USB/JTAG. Using placeholder for now to allow features.
    digital: [
        ...ESP32_PINS.digital,
        { label: 'GPIO 43 (U0TX)', value: '43' }, { label: 'GPIO 44 (U0RX)', value: '44' }
    ]
};

export const ESP32_FAMILY: BoardFamily = {
    id: 'esp32',
    name: 'ESP32',
    series: [
        {
            id: 'esp32_classic',
            name: 'ESP32 Classic',
            boards: [
                {
                    id: 'esp32dev',
                    name: 'ESP32 Dev Module',
                    mcu: 'ESP32-WROOM-32',
                    freq: '240MHz',
                    flash: '4MB',
                    ram: '520KB',
                    fqbn: 'esp32:esp32:esp32',
                    pins: ESP32_PINS,
                    capabilities: { wifi: true, bluetooth: true, rtos: true },
                    build: { envName: 'esp32dev', platform: 'espressif32', board: 'esp32dev', framework: 'arduino', monitor_speed: '115200', upload_speed: '921600' }
                },
                {
                    id: 'lolin32',
                    name: 'WEMOS LOLIN32',
                    mcu: 'ESP32-WROOM-32',
                    freq: '240MHz',
                    flash: '4MB',
                    ram: '520KB',
                    fqbn: 'esp32:esp32:lolin32',
                    pins: ESP32_PINS,
                    capabilities: { wifi: true, bluetooth: true, rtos: true },
                    build: { envName: 'lolin32', platform: 'espressif32', board: 'lolin32', framework: 'arduino', monitor_speed: '115200' }
                }
            ]
        },
        {
            id: 'esp32_s3',
            name: 'ESP32-S3',
            boards: [
                {
                    id: 'esp32_s3_devkit_c',
                    name: 'ESP32-S3 DevKitC-1',
                    mcu: 'ESP32-S3',
                    freq: '240MHz',
                    flash: '8MB',
                    ram: '512KB',
                    fqbn: 'esp32:esp32:esp32s3',
                    pins: ESP32_S3_PINS,
                    capabilities: { wifi: true, bluetooth: true, rtos: true },
                    build: { envName: 'esp32-s3-devkitc-1', platform: 'espressif32', board: 'esp32-s3-devkitc-1', framework: 'arduino', monitor_speed: '115200', upload_flags: '--no-stub' } // no-stub helpful for S3 sometimes
                },
                {
                    id: 'esp32_s3_generic',
                    name: 'Generic ESP32-S3',
                    mcu: 'ESP32-S3',
                    freq: '240MHz',
                    flash: '8MB',
                    ram: '512KB',
                    fqbn: 'esp32:esp32:esp32s3',
                    pins: ESP32_S3_PINS,
                    capabilities: { wifi: true, bluetooth: true, rtos: true },
                    build: { envName: 'esp32-s3-devkitc-1', platform: 'espressif32', board: 'esp32-s3-devkitc-1', framework: 'arduino', monitor_speed: '115200' }
                }
            ]
        },
        {
            id: 'esp32_c3',
            name: 'ESP32-C3',
            boards: [
                {
                    id: 'esp32_c3_devkit_m',
                    name: 'ESP32-C3 DevKitM-1',
                    mcu: 'ESP32-C3',
                    freq: '160MHz',
                    flash: '4MB',
                    ram: '400KB',
                    fqbn: 'esp32:esp32:esp32c3',
                    pins: ESP32_PINS,
                    capabilities: { wifi: true, bluetooth: true, rtos: true },
                    build: { envName: 'esp32-c3-devkitm-1', platform: 'espressif32', board: 'esp32-c3-devkitm-1', framework: 'arduino', monitor_speed: '115200' }
                }
            ]
        },
        {
            id: 'esp32_s2',
            name: 'ESP32-S2',
            boards: [
                {
                    id: 'esp32_s2_saola',
                    name: 'ESP32-S2 Saola-1',
                    mcu: 'ESP32-S2',
                    freq: '240MHz',
                    flash: '4MB',
                    ram: '320KB',
                    fqbn: 'esp32:esp32:esp32s2',
                    pins: ESP32_PINS,
                    capabilities: { wifi: true, bluetooth: true, rtos: true },
                    build: { envName: 'esp32-s2-saola-1', platform: 'espressif32', board: 'esp32-s2-saola-1', framework: 'arduino', monitor_speed: '115200' }
                }
            ]
        }
    ]
};
