/**
 * ============================================================
 * 工具箱生成策略 (Toolbox Generation Strategies)
 * ============================================================
 * 
 * 定义和实现不同家族板卡的工具箱扩展策略，以替换 BoardRegistry 中的硬编码逻辑。
 * 符合 OCP (Open-Closed Principle) 原则。
 * 
 * @file src/registries/ToolboxStrategies.ts
 */

import { BoardConfig } from '../types/board';
import {
    STM32_CONTENTS, STM32_CAN_CONTENTS, STM32_USB_CONTENTS, STM32_NET_CONTENTS,
    IOT_CONTENTS, ESP32_CONTENTS, RTOS_CONTENTS
} from '../config/toolbox_categories';
import { CATEGORY_COLORS } from '../config/theme';

/**
 * 工具箱类目生成器接口
 */
export interface ToolboxCategoryProvider {
    /**
     * 判断当前策略是否适用于该开发板
     */
    canHandle(board: BoardConfig): boolean;

    /**
     * 生成特定的工具箱分类数组
     */
    getCategories(board: BoardConfig): any[];
}

/**
 * STM32 家族工具箱策略
 */
export class STM32ToolboxProvider implements ToolboxCategoryProvider {
    canHandle(board: BoardConfig): boolean {
        return board.family === 'stm32';
    }

    getCategories(board: BoardConfig): any[] {
        const categories: any[] = [];
        const hasCap = (key: string) => !!(board.capabilities && (board.capabilities as any)[key]);

        const stm32Contents: any[] = [];

        if (hasCap('can')) {
            stm32Contents.push(...STM32_CAN_CONTENTS);
        }
        if (hasCap('usb')) {
            if (stm32Contents.length > 0) stm32Contents.push({ kind: 'sep', gap: 20 });
            stm32Contents.push(...STM32_USB_CONTENTS);
        }
        if (hasCap('ethernet')) {
            if (stm32Contents.length > 0) stm32Contents.push({ kind: 'sep', gap: 20 });
            stm32Contents.push(...STM32_NET_CONTENTS);
        }

        // 仅当包含内容时才添加 STM32 主分类
        if (stm32Contents.length > 0) {
            categories.push({ kind: 'sep' });
            categories.push({
                kind: 'category',
                name: '%{BKY_CAT_STM32}',
                colour: CATEGORY_COLORS.STM32,
                contents: stm32Contents
            });
        }

        return categories;
    }
}

/**
 * IoT 能力 (WiFi/ESP32) 工具箱策略
 */
export class IoTToolboxProvider implements ToolboxCategoryProvider {
    canHandle(board: BoardConfig): boolean {
        return !!(board.capabilities?.wifi) || board.family === 'esp32';
    }

    getCategories(board: BoardConfig): any[] {
        const categories: any[] = [];
        // 添加 IoT 通用分类
        categories.push({ kind: 'category', name: '%{BKY_CAT_IOT}', colour: CATEGORY_COLORS.IOT, contents: IOT_CONTENTS });

        // ESP32 特有的网络与工具分类
        if (board.family === 'esp32') {
            categories.push({ kind: 'category', name: '%{BKY_CAT_NETWORK}', colour: CATEGORY_COLORS.ESP_NETWORK, contents: ESP32_CONTENTS });
        }
        return categories;
    }
}

/**
 * RTOS 实时操作系统工具箱策略
 */
export class RTOSToolboxProvider implements ToolboxCategoryProvider {
    canHandle(board: BoardConfig): boolean {
        return !!(board.capabilities?.rtos) || ['esp32', 'stm32'].includes(board.family);
    }

    getCategories(board: BoardConfig): any[] {
        return [{ kind: 'category', name: '%{BKY_CAT_RTOS}', colour: CATEGORY_COLORS.RTOS, contents: RTOS_CONTENTS }];
    }
}
