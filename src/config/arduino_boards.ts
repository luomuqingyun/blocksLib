import { BoardFamily, BoardPins } from '../types/board';

const STANDARD_PINS: BoardPins = {
    digital: [
        { label: 'D0 (RX)', value: '0' }, { label: 'D1 (TX)', value: '1' },
        { label: 'D2', value: '2' }, { label: 'D3 (~)', value: '3' },
        { label: 'D4', value: '4' }, { label: 'D5 (~)', value: '5' },
        { label: 'D6 (~)', value: '6' }, { label: 'D7', value: '7' },
        { label: 'D8', value: '8' }, { label: 'D9 (~)', value: '9' },
        { label: 'D10 (~)', value: '10' }, { label: 'D11 (~)', value: '11' },
        { label: 'D12', value: '12' }, { label: 'D13', value: '13' }
    ],
    analog: [
        { label: 'A0', value: 'A0' }, { label: 'A1', value: 'A1' },
        { label: 'A2', value: 'A2' }, { label: 'A3', value: 'A3' },
        { label: 'A4 (SDA)', value: 'A4' }, { label: 'A5 (SCL)', value: 'A5' }
    ],
    pwm: [
        { label: 'D3', value: '3' }, { label: 'D5', value: '5' },
        { label: 'D6', value: '6' }, { label: 'D9', value: '9' },
        { label: 'D10', value: '10' }, { label: 'D11', value: '11' }
    ],
    i2c: [
        { label: 'SDA (A4)', value: 'A4' }, { label: 'SCL (A5)', value: 'A5' }
    ],
    spi: [
        { label: 'MOSI (D11)', value: '11' }, { label: 'MISO (D12)', value: '12' }, { label: 'SCK (D13)', value: '13' }
    ],
    serial: [
        { label: 'Serial (D0/D1)', value: 'Serial' }
    ]
};

const MEGA_PINS: BoardPins = {
    digital: [
        ...STANDARD_PINS.digital,
        { label: 'D14 (TX3)', value: '14' }, { label: 'D15 (RX3)', value: '15' },
        { label: 'D16 (TX2)', value: '16' }, { label: 'D17 (RX2)', value: '17' },
        { label: 'D18 (TX1)', value: '18' }, { label: 'D19 (RX1)', value: '19' },
        { label: 'D20 (SDA)', value: '20' }, { label: 'D21 (SCL)', value: '21' },
        // ... simplified for brevity, Mega has many pins
        { label: 'D53 (SS)', value: '53' }
    ],
    analog: [
        { label: 'A0', value: 'A0' }, { label: 'A1', value: 'A1' },
        { label: 'A2', value: 'A2' }, { label: 'A3', value: 'A3' },
        { label: 'A4', value: 'A4' }, { label: 'A5', value: 'A5' },
        { label: 'A6', value: 'A6' }, { label: 'A7', value: 'A7' },
        { label: 'A8', value: 'A8' }, { label: 'A9', value: 'A9' },
        { label: 'A10', value: 'A10' }, { label: 'A11', value: 'A11' },
        { label: 'A12', value: 'A12' }, { label: 'A13', value: 'A13' },
        { label: 'A14', value: 'A14' }, { label: 'A15', value: 'A15' }
    ],
    pwm: [
        { label: 'D2', value: '2' }, { label: 'D3', value: '3' },
        { label: 'D4', value: '4' }, { label: 'D5', value: '5' },
        { label: 'D6', value: '6' }, { label: 'D7', value: '7' },
        { label: 'D8', value: '8' }, { label: 'D9', value: '9' },
        { label: 'D10', value: '10' }, { label: 'D11', value: '11' },
        { label: 'D12', value: '12' }, { label: 'D13', value: '13' }
    ],
    i2c: [
        { label: 'SDA (D20)', value: '20' }, { label: 'SCL (D21)', value: '21' }
    ],
    spi: [
        { label: 'MOSI (D51)', value: '51' }, { label: 'MISO (D50)', value: '50' }, { label: 'SCK (D52)', value: '52' }
    ],
    serial: [
        { label: 'Serial (D0/D1)', value: 'Serial' },
        { label: 'Serial1 (D19/D18)', value: 'Serial1' },
        { label: 'Serial2 (D17/D16)', value: 'Serial2' },
        { label: 'Serial3 (D15/D14)', value: 'Serial3' }
    ]
};

export const ARDUINO_FAMILY: BoardFamily = {
    id: 'arduino',
    name: 'Arduino',
    series: [
        {
            id: 'avr_standard',
            name: 'AVR Standard',
            boards: [
                {
                    id: 'uno',
                    name: 'Arduino Uno',
                    mcu: 'ATmega328P',
                    freq: '16MHz',
                    flash: '32KB',
                    ram: '2KB',
                    fqbn: 'arduino:avr:uno',
                    pins: STANDARD_PINS,
                    capabilities: { analogOut: false, wifi: false },
                    build: { envName: 'uno', platform: 'atmelavr', board: 'uno', framework: 'arduino' }
                },
                {
                    id: 'nano',
                    name: 'Arduino Nano',
                    mcu: 'ATmega328P',
                    freq: '16MHz',
                    flash: '32KB',
                    ram: '2KB',
                    fqbn: 'arduino:avr:nano',
                    pins: {
                        ...STANDARD_PINS,
                        analog: [...STANDARD_PINS.analog, { label: 'A6', value: 'A6' }, { label: 'A7', value: 'A7' }]
                    },
                    build: { envName: 'nanoatmega328', platform: 'atmelavr', board: 'nanoatmega328', framework: 'arduino' },
                    capabilities: { wifi: false }
                },
                {
                    id: 'leonardo',
                    name: 'Arduino Leonardo',
                    mcu: 'ATmega32u4',
                    freq: '16MHz',
                    flash: '32KB',
                    ram: '2.5KB',
                    fqbn: 'arduino:avr:leonardo',
                    pins: {
                        ...STANDARD_PINS,
                        i2c: [{ label: 'SDA (D2)', value: '2' }, { label: 'SCL (D3)', value: '3' }]
                    },
                    build: { envName: 'leonardo', platform: 'atmelavr', board: 'leonardo', framework: 'arduino' },
                    capabilities: { wifi: false }
                }
            ]
        },
        {
            id: 'avr_mega',
            name: 'AVR Mega',
            boards: [
                {
                    id: 'mega2560',
                    name: 'Arduino Mega 2560',
                    mcu: 'ATmega2560',
                    freq: '16MHz',
                    flash: '256KB',
                    ram: '8KB',
                    fqbn: 'arduino:avr:mega',
                    pins: MEGA_PINS,
                    build: { envName: 'megaatmega2560', platform: 'atmelavr', board: 'megaatmega2560', framework: 'arduino' },
                    capabilities: { wifi: false }
                }
            ]
        }
    ]
};
