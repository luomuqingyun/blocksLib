import { BoardFamily, BoardPins, Board, BoardSeries } from '../types/board';
import stm32SeriesData from '../../stm32_series_data.json';

// Helper to generate generic pins for STM32
const generateGenericPins = (count: number, hasAnalog: boolean = true): BoardPins => {
    const pins: BoardPins = {
        digital: [], analog: [], pwm: [], i2c: [], spi: [], serial: []
    };

    // Standard STM32 naming: PA0-PA15, PB0-PB15, etc.
    const ports = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let pinCount = 0;

    for (const port of ports) {
        for (let i = 0; i <= 15; i++) {
            if (pinCount >= count) break;
            const pinName = `P${port}${i}`;
            pins.digital.push({ label: pinName, value: pinName });

            // Simplified assumptions for generic boards
            if (hasAnalog && port < 'C') pins.analog.push({ label: pinName, value: pinName }); // PA/PB often analog
            if (i % 2 !== 0) pins.pwm.push({ label: pinName, value: pinName }); // Rough approximation for generic

            pinCount++;
        }
    }

    return pins;
};

// Map Series to a representative generic environment for build compatibility
// Since we are generating hundreds of variants, we map them to a safe "Common Denominator" build config
// The user selects the specific chip for logic reasons, but compilation uses a generic target.
const SERIES_BUILD_MAP: Record<string, any> = {
    'STM32C0': { env: 'nucleo_c031c6', board: 'nucleo_c031c6', mcu: 'STM32C0xx', pins: 20 },
    'STM32F0': { env: 'nucleo_f030r8', board: 'nucleo_f030r8', mcu: 'STM32F0xx', pins: 48 },
    'STM32F1': { env: 'genericSTM32F103C8', board: 'genericSTM32F103C8', mcu: 'STM32F1xx', pins: 48 },
    'STM32F2': { env: 'nucleo_f207zg', board: 'nucleo_f207zg', mcu: 'STM32F2xx', pins: 100 },
    'STM32F3': { env: 'nucleo_f303re', board: 'nucleo_f303re', mcu: 'STM32F3xx', pins: 64 },
    'STM32F4': { env: 'genericSTM32F401CC', board: 'genericSTM32F401CC', mcu: 'STM32F4xx', pins: 48 },
    'STM32F7': { env: 'nucleo_f746zg', board: 'nucleo_f746zg', mcu: 'STM32F7xx', pins: 144 },
    'STM32G0': { env: 'disco_g071rb', board: 'disco_g071rb', mcu: 'STM32G0xx', pins: 32 },
    'STM32G4': { env: 'nucleo_g474re', board: 'nucleo_g474re', mcu: 'STM32G4xx', pins: 48 },
    'STM32H5': { env: 'nucleo_h563zi', board: 'nucleo_h563zi', mcu: 'STM32H5xx', pins: 100 },
    'STM32H7': { env: 'nucleo_h743zi', board: 'nucleo_h743zi', mcu: 'STM32H7xx', pins: 144 },
    'STM32L0': { env: 'nucleo_l073rz', board: 'nucleo_l073rz', mcu: 'STM32L0xx', pins: 32 },
    'STM32L1': { env: 'nucleo_l152re', board: 'nucleo_l152re', mcu: 'STM32L1xx', pins: 64 },
    'STM32L4': { env: 'nucleo_l476rg', board: 'nucleo_l476rg', mcu: 'STM32L4xx', pins: 64 },
    'STM32L5': { env: 'nucleo_l552ze_q', board: 'nucleo_l552ze_q', mcu: 'STM32L5xx', pins: 64 },
    'STM32MP1': { env: 'disco_mp157_caa', board: 'disco_mp157_caa', mcu: 'STM32MP1xx', pins: 100 }, // Approximate
    'STM32MP2': { env: 'disco_mp157_caa', board: 'disco_mp157_caa', mcu: 'STM32MP2xx', pins: 100 }, // Placeholder
    'STM32N6': { env: 'nucleo_h743zi', board: 'nucleo_h743zi', mcu: 'STM32N6xx', pins: 100 }, // Placeholder
    'STM32U0': { env: 'nucleo_u083rc', board: 'nucleo_u083rc', mcu: 'STM32U0xx', pins: 32 },
    'STM32U3': { env: 'nucleo_u575zi_q', board: 'nucleo_u575zi_q', mcu: 'STM32U3xx', pins: 64 }, // Placeholder
    'STM32U5': { env: 'nucleo_u575zi_q', board: 'nucleo_u575zi_q', mcu: 'STM32U5xx', pins: 100 },
    'STM32WB': { env: 'p_nucleo_wb55', board: 'p_nucleo_wb55', mcu: 'STM32WBxx', pins: 48 },
    'STM32WB0': { env: 'p_nucleo_wb55', board: 'p_nucleo_wb55', mcu: 'STM32WB0xx', pins: 32 }, // Placeholder
    'STM32WBA': { env: 'nucleo_wba52cg', board: 'nucleo_wba52cg', mcu: 'STM32WBAxx', pins: 48 },
    'STM32WL': { env: 'nucleo_wl55jc', board: 'nucleo_wl55jc', mcu: 'STM32WLxx', pins: 48 },
    'STM32WL3': { env: 'nucleo_wl55jc', board: 'nucleo_wl55jc', mcu: 'STM32WL3xx', pins: 32 }, // Placeholder
};

// Generate Series array from JSON
const generateSeries = (): BoardSeries[] => {
    const seriesList: BoardSeries[] = [];

    // Keys are "STM32F1", "STM32F4", etc.
    const keys = Object.keys(stm32SeriesData).sort();

    keys.forEach(seriesKey => {
        const variants = (stm32SeriesData as any)[seriesKey] as string[];
        const mapping = SERIES_BUILD_MAP[seriesKey] || SERIES_BUILD_MAP['STM32F1']; // FallbackF1

        const boards: Board[] = variants.map(variant => {
            // variant is like "STM32F103xx"
            return {
                id: variant.toLowerCase(), // stm32f103xx
                name: `${variant} Generic`, // STM32F103xx Generic
                mcu: variant, // STM32F103xx
                freq: 'N/A', // Generic don't imply freq
                flash: 'N/A',
                ram: 'N/A',
                fqbn: `STMicroelectronics:stm32:Gen${seriesKey.replace('STM32', '')}:pnum=Generic_${variant.replace('STM32', '').substring(0, 4)}`, // Rough guess or unused
                pins: generateGenericPins(mapping.pins),
                capabilities: {
                    rtos: true,
                    analogOut: true, // Most STM32s have DAC
                    wifi: seriesKey === 'STM32WB' || seriesKey === 'STM32WL' // Rudimentary check
                },
                build: {
                    envName: mapping.env,
                    platform: 'ststm32',
                    board: mapping.board,
                    framework: 'arduino',
                    upload_protocol: 'stlink'
                }
            };
        });

        seriesList.push({
            id: seriesKey.toLowerCase(),
            name: `${seriesKey} Series`,
            boards: boards
        });
    });

    return seriesList;
};

export const STM32_FAMILY: BoardFamily = {
    id: 'stm32',
    name: 'STM32',
    series: generateSeries()
};
