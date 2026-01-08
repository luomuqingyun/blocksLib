import { BoardFamily } from '../types/board';
import { STM32_FAMILY } from './stm32_boards';
import { ARDUINO_FAMILY } from './arduino_boards';
import { ESP32_FAMILY } from './esp32_boards';

export const ALL_BOARD_FAMILIES: BoardFamily[] = [
    ARDUINO_FAMILY,
    STM32_FAMILY,
    ESP32_FAMILY
];
