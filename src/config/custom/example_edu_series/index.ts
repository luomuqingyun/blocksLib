
import { BoardSeries, Board } from '../../../types/board';
import { defineBoard } from '../../../utils/extension_helpers';

/**
 * [示例-B] 批量导入系列 (The Series Pattern)
 * 
 * 此文件演示了如何通过单个 `index.ts` 定义一个完整的开发板系列。
 * 这种模式非常适合教育套件（包含不同版本的板子）或系列化产品。
 * 
 * 核心原理：
 * `all_boards.ts` 中的 `import.meta.glob` 会自动发现此文件，
 * 并将其导出的 `BoardSeries` 对象注册到“芯片实验室”分类下。
 */

// 定义系列中的第一块板子：Nano Kit (基础版)
const BOARD_NANO: Board = defineBoard({
    id: 'edu_kit_nano',
    name: { zh: 'EduKit Nano (基础型)', en: 'EduKit Nano' },
    mcu: 'ATmega328P',
    freq: '16MHz',
    flash: '32KB',
    ram: '2KB',
    fqbn: 'arduino:avr:nano',
    pins: {
        digital: [{ label: 'D2', value: '2' }, { label: 'D3', value: '3' }], // 仅展示部分用于示例
        analog: [{ label: 'A0', value: '0' }],
        pwm: [{ label: 'D3 ~', value: '3' }],
        i2c: [], spi: [],
        serial: [{ label: 'Serial', value: 'Serial' }]
    },
    build: {
        envName: 'nano_old',
        platform: 'atmelavr',
        board: 'nanoatmega328', // Old Bootloader
        framework: 'arduino'
    }
});

// 定义系列中的第二块板子：Mega Kit (增强版)
const BOARD_MEGA: Board = defineBoard({
    id: 'edu_kit_mega',
    name: { zh: 'EduKit Mega (增强型)', en: 'EduKit Mega' },
    mcu: 'ATmega2560',
    freq: '16MHz',
    flash: '256KB',
    ram: '8KB',
    fqbn: 'arduino:avr:mega',
    pins: {
        digital: [{ label: 'D2', value: '2' }, { label: 'D53', value: '53' }],
        analog: [{ label: 'A0', value: '0' }, { label: 'A15', value: '15' }],
        pwm: [{ label: 'any', value: 'any' }],
        i2c: [], spi: [], serial: []
    },
    build: {
        envName: 'mega',
        platform: 'atmelavr',
        board: 'megaatmega2560',
        framework: 'arduino'
    }
});

// 导出系列定义
// 变量名可以是任意的，因为它是通过 glob 导入的
export const EDU_KIT_SERIES: BoardSeries = {
    id: 'edu_kit_series_v2', // 系列 ID
    name: { zh: '教学套件系列 V2', en: 'Education Kit Series V2' }, // 系列名称
    boards: [
        BOARD_NANO,
        BOARD_MEGA
    ]
};
