/**
 * ============================================================
 * STM32 板卡家族配置 (STM32 Board Family Configuration)
 * ============================================================
 * 
 * 自动从 src/data/boards/stm32/ 目录扫描并生成 STM32 板卡列表。
 * 
 * 优化说明:
 * - 使用 Vite 的 import.meta.glob 动态导入芯片数据
 * - 按系列 (F1, F4, H7 等) 自动分组
 * - 无需维护单独的系列数据文件，直接从芯片 JSON 生成
 * 
 * 数据来源: src/data/boards/stm32/[系列]/[芯片].json
 * 
 * @file src/config/stm32_boards.ts
 * @module EmbedBlocks/Config/Boards
 */

import { BoardFamily, BoardPins, Board, BoardSeries } from '../types/board';

// ------------------------------------------------------------------
// 自动扫描 STM32 芯片数据 (Auto-discovery STM32 Chip Data)
// ------------------------------------------------------------------

/**
 * 使用 Vite 的 import.meta.glob 自动导入所有 STM32 芯片 JSON 文件
 * 路径格式: ../data/boards/stm32/[系列]/[芯片].json
 */
const stm32ChipModules = import.meta.glob('../data/boards/stm32/**/*.json', { eager: true });

/**
 * 解析芯片 JSON 并按系列分组
 */
const parseChipsBySeries = (): Map<string, any[]> => {
    const seriesMap = new Map<string, any[]>();

    for (const path in stm32ChipModules) {
        const chipData = (stm32ChipModules[path] as any).default || stm32ChipModules[path];

        // 从路径提取系列名: ../data/boards/stm32/STM32F1/STM32F103C8.json -> STM32F1
        const pathParts = path.split('/');
        const seriesName = pathParts[pathParts.length - 2]; // e.g., "STM32F1"

        if (seriesName && seriesName.startsWith('STM32')) {
            if (!seriesMap.has(seriesName)) {
                seriesMap.set(seriesName, []);
            }
            seriesMap.get(seriesName)!.push(chipData);
        }
    }

    return seriesMap;
};

// ------------------------------------------------------------------
// 引脚转换工具 (Pin Conversion Utilities)
// ------------------------------------------------------------------

/**
 * 从芯片数据中提取引脚选项，转换为 BoardPins 格式
 */
const extractBoardPins = (chipData: any): BoardPins => {
    const pins: BoardPins = {
        digital: [],
        analog: [],
        pwm: [],
        i2c: [],
        spi: [],
        serial: []
    };

    // 使用预生成的 pin_options (如果存在)
    if (chipData.pin_options) {
        const opts = chipData.pin_options;

        if (opts.digital) {
            pins.digital = opts.digital.map((pin: [string, string]) => ({
                label: pin[0],
                value: pin[1]
            }));
        }
        if (opts.analog) {
            pins.analog = opts.analog.map((pin: [string, string]) => ({
                label: pin[0],
                value: pin[1]
            }));
        }
        if (opts.pwm) {
            pins.pwm = opts.pwm.map((pin: [string, string]) => ({
                label: pin[0],
                value: pin[1]
            }));
        }
        if (opts.i2c) {
            pins.i2c = opts.i2c.map((pin: [string, string]) => ({
                label: pin[0],
                value: pin[1]
            }));
        }
        if (opts.spi) {
            pins.spi = opts.spi.map((pin: [string, string]) => ({
                label: pin[0],
                value: pin[1]
            }));
        }
        if (opts.serial) {
            pins.serial = opts.serial.map((pin: [string, string]) => ({
                label: pin[0],
                value: pin[1]
            }));
        }
    }

    return pins;
};

// ------------------------------------------------------------------
// 系列构建配置映射 (Series Build Configuration Mapping)
// ------------------------------------------------------------------

/**
 * 映射系列到默认的构建环境
 * 用于未明确指定 build 配置的芯片
 */
const SERIES_BUILD_DEFAULTS: Record<string, { env: string; board: string }> = {
    'STM32C0': { env: 'nucleo_c031c6', board: 'nucleo_c031c6' },
    'STM32F0': { env: 'nucleo_f030r8', board: 'nucleo_f030r8' },
    'STM32F1': { env: 'genericSTM32F103C8', board: 'genericSTM32F103C8' },
    'STM32F2': { env: 'nucleo_f207zg', board: 'nucleo_f207zg' },
    'STM32F3': { env: 'nucleo_f303re', board: 'nucleo_f303re' },
    'STM32F4': { env: 'genericSTM32F401CC', board: 'genericSTM32F401CC' },
    'STM32F7': { env: 'nucleo_f746zg', board: 'nucleo_f746zg' },
    'STM32G0': { env: 'disco_g071rb', board: 'disco_g071rb' },
    'STM32G4': { env: 'nucleo_g474re', board: 'nucleo_g474re' },
    'STM32H5': { env: 'nucleo_h563zi', board: 'nucleo_h563zi' },
    'STM32H7': { env: 'nucleo_h743zi', board: 'nucleo_h743zi' },
    'STM32L0': { env: 'nucleo_l073rz', board: 'nucleo_l073rz' },
    'STM32L1': { env: 'nucleo_l152re', board: 'nucleo_l152re' },
    'STM32L4': { env: 'nucleo_l476rg', board: 'nucleo_l476rg' },
    'STM32L4+': { env: 'nucleo_l496zg', board: 'nucleo_l496zg' },
    'STM32L5': { env: 'nucleo_l552ze_q', board: 'nucleo_l552ze_q' },
    'STM32U0': { env: 'nucleo_u083rc', board: 'nucleo_u083rc' },
    'STM32U5': { env: 'nucleo_u575zi_q', board: 'nucleo_u575zi_q' },
    'STM32WB': { env: 'p_nucleo_wb55', board: 'p_nucleo_wb55' },
    'STM32WBA': { env: 'nucleo_wba52cg', board: 'nucleo_wba52cg' },
    'STM32WL': { env: 'nucleo_wl55jc', board: 'nucleo_wl55jc' },
};

// ------------------------------------------------------------------
// 系列生成器 (Series Generator)
// ------------------------------------------------------------------

/**
 * 从扫描的芯片数据生成 BoardSeries 数组
 */
const generateSeriesFromData = (): BoardSeries[] => {
    const seriesMap = parseChipsBySeries();
    const seriesList: BoardSeries[] = [];

    // 按系列名称排序
    const sortedSeriesNames = Array.from(seriesMap.keys()).sort();

    for (const seriesName of sortedSeriesNames) {
        const chips = seriesMap.get(seriesName)!;

        // 获取默认构建配置
        const buildDefaults = SERIES_BUILD_DEFAULTS[seriesName] || SERIES_BUILD_DEFAULTS['STM32F1'];

        // 将每个芯片转换为 Board
        const boards: Board[] = chips.map(chip => {
            const mcuName = chip.mcu || chip.name || 'Unknown';

            return {
                id: chip.id || mcuName.toLowerCase(),
                name: chip.name || mcuName,
                mcu: mcuName,
                freq: chip.fcpu ? `${chip.fcpu / 1000000} MHz` : 'N/A',
                flash: chip.specs?.split('/')[0]?.trim() || 'N/A',
                ram: chip.specs?.split('/')[1]?.trim() || 'N/A',
                fqbn: `STMicroelectronics:stm32:${seriesName}:pnum=${mcuName}`,
                pins: extractBoardPins(chip),
                capabilities: {
                    rtos: true,
                    analogOut: chip.capabilities?.dac !== false,
                    wifi: seriesName.includes('WB') || seriesName.includes('WL'),
                    can: chip.capabilities?.can || false,
                    usb: chip.capabilities?.usb || false,
                    ethernet: chip.capabilities?.ethernet || false
                },
                build: {
                    envName: chip.id || buildDefaults.env,
                    platform: chip.platform || 'ststm32',
                    board: chip.id || buildDefaults.board,
                    framework: 'arduino',
                    upload_protocol: 'stlink'
                },
                // 附加原始数据供高级功能使用
                _rawData: {
                    package: chip.package,
                    pinCount: chip.pinCount,
                    variant: chip.variant,
                    pinout: chip.pinout,
                    pinMap: chip.pinMap,
                    defaults: chip.defaults
                }
            };
        });

        // 按芯片名称排序 (处理 I18nString 类型)
        boards.sort((a, b) => {
            const nameA = typeof a.name === 'string' ? a.name : a.name.en;
            const nameB = typeof b.name === 'string' ? b.name : b.name.en;
            return nameA.localeCompare(nameB);
        });

        seriesList.push({
            id: seriesName.toLowerCase(),
            name: `${seriesName} Series`,
            boards: boards
        });
    }

    return seriesList;
};

// ------------------------------------------------------------------
// 导出 STM32 板卡家族 (Export STM32 Board Family)
// ------------------------------------------------------------------

export const STM32_FAMILY: BoardFamily = {
    id: 'stm32',
    name: 'STM32',
    series: generateSeriesFromData()
};

// 调试: 输出加载的芯片数量
if (import.meta.env.DEV) {
    const totalChips = STM32_FAMILY.series.reduce((sum, s) => sum + s.boards.length, 0);
    console.log(`[STM32Boards] Loaded ${STM32_FAMILY.series.length} series, ${totalChips} chips`);
}
