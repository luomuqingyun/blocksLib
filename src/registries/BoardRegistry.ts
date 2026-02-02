/**
 * ============================================================
 * 开发板注册服务 (Board Registry Service)
 * ============================================================
 * 
 * 负责管理所有支持的开发板配置，并根据所选开发板动态生成工具箱 (Toolbox)。
 * 实现了单例模式 (Singleton Pattern)。
 * 
 * 核心功能:
 * - register(): 注册新的开发板配置
 * - get()/getAll(): 获取开发板配置
 * - getToolboxConfig(): 动态生成板卡对应的工具箱
 * - registerExtensionCategory(): 注册扩展插件的工具箱分类
 * - subscribe(): 订阅注册表变更事件
 * 
 * 工具箱生成逻辑:
 * 1. 通用分类 (逻辑、循环、数学等)
 * 2. 硬件分类 (I/O、串口、传感器等)
 * 3. 按能力可选分类 (WiFi/RTOS/CAN等)
 * 4. 板卡家族特定分类 (STM32/ESP32等)
 * 5. 外部扩展插件分类
 * 
 * @file src/registries/BoardRegistry.ts
 * @module EmbedBlocks/Frontend/Registries
 */

import { BoardConfig } from '../types/board';
// @ts-ignore
import * as Blockly from 'blockly';
import { boardRepository } from '../data/BoardRepository';
import {
    LOGIC_CONTENTS, LOOPS_CONTENTS, MATH_CONTENTS, TEXT_CONTENTS, FUNCTIONS_CONTENTS,
    IO_CONTENTS, TIME_CONTENTS, SERIAL_CONTENTS, SERVO_CONTENTS,
    ACTUATOR_CONTENTS, RFID_CONTENTS, QR_CONTENTS, PS2_CONTENTS,
    SENSORS_CONTENTS, MOTORS_CONTENTS, DISPLAYS_CONTENTS,
    IOT_CONTENTS, PROTOCOLS_CONTENTS, AUDIO_CONTENTS, STORAGE_CONTENTS,
    ESP32_CONTENTS, ESP_UTILS_CONTENTS, STM32_CONTENTS, STM32_CAN_CONTENTS, STM32_USB_CONTENTS, STM32_NET_CONTENTS,
    LISTS_CONTENTS, INPUTS_CONTENTS, EXPANSION_CONTENTS, HID_CONTENTS,
    AI_CONTENTS, DATA_SC_CONTENTS, DATA_FMT_CONTENTS, RTOS_CONTENTS, GAME_CONTENTS,
    SYSTEM_CONTENTS, STATS_CONTENTS, AUDIO_IN_CONTENTS,
    ROBOTS_CONTENTS, MENU_CONTENTS, PID_CONTENTS, LOGGING_CONTENTS,
    DIAGNOSTICS_CONTENTS, JSON_CONTENTS, VENDOR_CONTENTS, ADVANCED_VARS_CONTENTS,
    SPECIAL_SENSORS_CONTENTS, SIGNAL_CONTENTS, TEST_DEV_CONTENTS
} from '../config/toolbox_categories';
import { CATEGORY_COLORS } from '../config/theme';

/**
 * 开发板注册服务类
 * 管理所有支持的开发板配置，动态生成工具箱
 */
class BoardRegistryService {
    // 存储所有已注册的板卡配置，Key 为板卡 ID
    private boards: Map<string, BoardConfig> = new Map();
    // 缓存已生成的工具箱配置，提升切换性能
    private toolboxCache: Map<string, any> = new Map();
    // 当前选中的板卡 ID
    private currentBoardId: string | null = null;

    constructor() {
        // 初始化时从仓库加载预置板卡
        this.initializeBoards();
        this.toolboxCache.clear();
    }

    /**
     * 设置当前选中的开发板 ID
     * @param id 开发板 ID
     */
    public setCurrentBoard(id: string) {
        this.currentBoardId = id;
    }

    /**
     * 获取当前选中的开发板配置
     */
    public getCurrentBoard(): BoardConfig | undefined {
        if (!this.currentBoardId) return undefined;
        return this.get(this.currentBoardId);
    }

    /**
     * 初始化板卡列表
     * 从统一仓库加载已发现的板卡和家族注入信息
     */
    private initializeBoards() {
        const allBoards = boardRepository.getAllBoards();
        console.log(`[BoardRegistry] Loaded ${allBoards.length} boards from repository.`);

        allBoards.forEach(board => {
            this.register(board as unknown as BoardConfig);
        });
    }

    /**
     * 注册一个新的开发板配置
     * @param board - 开发板配置对象
     * @remarks 注册新板子会清除工具箱缓存以保持一致性
     */
    public register(board: BoardConfig) {
        this.boards.set(board.id, board);
        // Clear cache when boards are modified
        this.toolboxCache.clear();
        this.notifyListeners();
    }

    /**
     * 根据 ID 获取开发板配置
     */
    public get(id: string): BoardConfig | undefined {
        return this.boards.get(id);
    }

    /**
     * 获取所有已注册的开发板配置
     */
    public getAll(): BoardConfig[] {
        return Array.from(this.boards.values());
    }

    /**
     * 获取指定开发板的工具箱配置
     * @param boardId - 开发板 ID
     * @returns Blockly 工具箱配置对象
     * @throws {Error} 如果 boardId 无效或系统中没有注册任何板子
     * @remarks 使用缓存机制提升性能，避免重复生成
     */
    public getToolboxConfig(boardId: string) {
        // 输入验证
        if (!boardId || typeof boardId !== 'string') {
            throw new Error('[BoardRegistry] Invalid boardId provided');
        }

        // 优先从缓存获取
        if (this.toolboxCache.has(boardId)) {
            return this.toolboxCache.get(boardId);
        }

        const boardConfig = this.get(boardId);

        // 如果找不到配置，回退到第一个已注册的板子
        if (!boardConfig) {
            console.warn(`Board ${boardId} not found, using default toolbox.`);
            const allBoards = this.getAll();

            if (allBoards.length === 0) {
                throw new Error('[BoardRegistry] No boards registered in the system');
            }

            const defaultBoard = allBoards[0];
            const config = this.generateToolbox(defaultBoard);
            this.toolboxCache.set(boardId, config);
            return config;
        }

        // 生成新配置并存入缓存
        const config = this.generateToolbox(boardConfig);
        this.toolboxCache.set(boardId, config);
        return config;
    }

    // ----------------------------------------------------------------
    // 生成工具箱配置 (Generate Toolbox)
    // 根据 Board 配置动态拼接 Common, Hardware, Family-Specific 分类
    // ----------------------------------------------------------------
    private generateToolbox(boardConfig: BoardConfig) {
        // 1. Common Categories (Language Core)
        const commonCategories = [
            { kind: 'category', name: '%{BKY_CAT_LOGIC}', colour: CATEGORY_COLORS.LOGIC, contents: LOGIC_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_LOOPS}', colour: CATEGORY_COLORS.LOOPS, contents: LOOPS_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_LISTS}', colour: CATEGORY_COLORS.LISTS, contents: LISTS_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_MATH}', colour: CATEGORY_COLORS.MATH, contents: MATH_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_TEXT}', colour: CATEGORY_COLORS.TEXT, contents: TEXT_CONTENTS },
            { kind: 'category', id: 'CAT_VARIABLES', name: '%{BKY_CAT_VARIABLES}', colour: CATEGORY_COLORS.VARIABLES, custom: 'ARDUINO_VARIABLES' },
            { kind: 'category', id: 'CAT_TYPES', name: '%{BKY_CAT_TYPES}', colour: CATEGORY_COLORS.TYPES, custom: 'ARDUINO_TYPES' },
            { kind: 'category', id: 'CAT_TOOLS', name: '%{BKY_CAT_TOOLS}', colour: CATEGORY_COLORS.TOOLS, custom: 'ARDUINO_TOOLS' },
            { kind: 'category', name: '%{BKY_CAT_SYSTEM_UTILS}', colour: CATEGORY_COLORS.SYSTEM_UTILS, contents: SYSTEM_CONTENTS },
            { kind: 'category', name: 'Dev Test', colour: '#FF0000', contents: TEST_DEV_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_FUNCTIONS}', colour: CATEGORY_COLORS.FUNCTIONS, contents: FUNCTIONS_CONTENTS },
            { kind: 'sep' }
        ];

        // 2. Standard Hardware Categories (Arduino API - Available for all supported families)
        const hardwareCategories: any[] = [
            { kind: 'category', name: '%{BKY_CAT_IO}', colour: CATEGORY_COLORS.IO, contents: IO_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_TIME}', colour: CATEGORY_COLORS.TIME, contents: TIME_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_COMMUNICATION}', colour: CATEGORY_COLORS.SERIAL, contents: SERIAL_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_SERVO}', colour: CATEGORY_COLORS.SERVO, contents: SERVO_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_ACTUATORS}', colour: CATEGORY_COLORS.ACTUATORS, contents: ACTUATOR_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_ROBOTS}', colour: CATEGORY_COLORS.ROBOTS, contents: ROBOTS_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_SENSORS}', colour: CATEGORY_COLORS.SENSORS, contents: [...SENSORS_CONTENTS, ...AUDIO_IN_CONTENTS, ...SPECIAL_SENSORS_CONTENTS] },
            { kind: 'category', name: '%{BKY_CAT_MOTORS}', colour: CATEGORY_COLORS.MOTORS, contents: MOTORS_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_DISPLAYS}', colour: CATEGORY_COLORS.DISPLAYS, contents: DISPLAYS_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_AUDIO}', colour: CATEGORY_COLORS.AUDIO, contents: AUDIO_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_STORAGE}', colour: CATEGORY_COLORS.STORAGE, contents: STORAGE_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_JSON}', colour: CATEGORY_COLORS.DATA_SECURITY, contents: JSON_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_SIGNALS}', colour: CATEGORY_COLORS.SIGNALS, contents: [...SIGNAL_CONTENTS, ...STATS_CONTENTS] },
            { kind: 'category', name: '%{BKY_CAT_CONTROL}', colour: CATEGORY_COLORS.CONTROL, contents: PID_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_MENU}', colour: CATEGORY_COLORS.MENU, contents: MENU_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_DIAGNOSTICS}', colour: CATEGORY_COLORS.DIAGNOSTICS, contents: [...DIAGNOSTICS_CONTENTS, ...LOGGING_CONTENTS] },
            { kind: 'category', name: '%{BKY_CAT_GAME}', colour: CATEGORY_COLORS.GAME, contents: GAME_CONTENTS },
            { kind: 'category', name: '%{BKY_CAT_VENDOR}', colour: CATEGORY_COLORS.VENDOR, contents: VENDOR_CONTENTS }
        ];

        // 2.5 根据能力可选的硬件分类
        const cap = boardConfig.capabilities || {};
        const optionalHardware: any[] = [];

        // 如果支持 WiFi 或属于 ESP32 家族，添加 IoT 和联网分类
        if (cap.wifi || boardConfig.family === 'esp32') {
            optionalHardware.push({ kind: 'category', name: '%{BKY_CAT_IOT}', colour: CATEGORY_COLORS.IOT, contents: IOT_CONTENTS });
            optionalHardware.push({ kind: 'category', name: '%{BKY_CAT_NETWORK}', colour: CATEGORY_COLORS.ESP_NETWORK, contents: ESP32_CONTENTS });
        }

        if (cap.ethernet) {
            // 如果支持以太网且不在 IOT 分类中，此处可扩展
        }

        // 如果支持 RTOS 或属于常见的高性能家族，添加 RTOS 分类
        if (cap.rtos || boardConfig.family === 'esp32' || boardConfig.family === 'stm32') {
            optionalHardware.push({ kind: 'category', name: '%{BKY_CAT_RTOS}', colour: CATEGORY_COLORS.RTOS, contents: RTOS_CONTENTS });
        }

        if (optionalHardware.length > 0) {
            hardwareCategories.push({ kind: 'sep' });
            hardwareCategories.push(...optionalHardware);
        }

        // 3. 家族特定分类 (STM32, ESP32 等)
        let specificCategories: Array<{ kind: string; name?: string; colour?: string; contents?: any[]; custom?: string }> = [];

        if (boardConfig.family === 'stm32') {
            const stm32Cat: any[] = [];

            // 检查板卡具体的硬件能力
            // 默认行为：如果 capabilities 对象缺失，则不显示以确保安全。
            const hasCap = (key: string) => !!(boardConfig.capabilities && (boardConfig.capabilities as any)[key]);

            if (hasCap('can')) {
                stm32Cat.push(...STM32_CAN_CONTENTS);
            }
            if (hasCap('usb')) {
                if (stm32Cat.length > 0) stm32Cat.push({ kind: 'sep', gap: 20 });
                stm32Cat.push(...STM32_USB_CONTENTS);
            }
            if (hasCap('ethernet')) { // 或 'network'
                if (stm32Cat.length > 0) stm32Cat.push({ kind: 'sep', gap: 20 });
                stm32Cat.push(...STM32_NET_CONTENTS);
            }

            // 对于没有任何能力定义的 STM32 开发板，可以保持分类为空或显示全部
            if (stm32Cat.length > 0) {
                specificCategories.push({ kind: 'sep' });
                specificCategories.push({ kind: 'category', name: '%{BKY_CAT_STM32}', colour: CATEGORY_COLORS.STM32, contents: stm32Cat });
            }
        }

        // 4. 外部扩展分类
        if (this.externalCategories.size > 0) {
            let hasExternal = false;
            this.externalCategories.forEach((items) => {
                items.forEach(item => {
                    // 检查扩展与当前板卡的兼容性
                    if (item.compatibility) {
                        const { families, boards } = item.compatibility;
                        let allowed = true;

                        // 检查所属家族
                        if (families && families.length > 0) {
                            const normalizedFamilies = families.map(f => f.toLowerCase());
                            if (!normalizedFamilies.includes(boardConfig.family.toLowerCase())) {
                                allowed = false;
                            }
                        }

                        // 检查具体板卡 ID
                        if (boards && boards.length > 0) {
                            const normalizedBoards = boards.map(b => b.toLowerCase());
                            if (!normalizedBoards.includes(boardConfig.id.toLowerCase())) {
                                allowed = false;
                            }
                        }

                        if (!allowed) return;
                    }

                    if (!hasExternal) {
                        specificCategories.push({ kind: 'sep' });
                        hasExternal = true;
                    }
                    specificCategories.push(item.category);
                });
            });
        }

        // Debug: 输出生成的分类数量，方便确认动态分类是否生效
        console.log(`[BoardRegistry] Generated ${commonCategories.length} common, ${hardwareCategories.length} hardware, ${specificCategories.length} specific, and ${this.externalCategories.size} external categories.`);

        return {
            kind: 'categoryToolbox',
            contents: [
                ...commonCategories,
                ...hardwareCategories,
                ...specificCategories
            ]
        };
    }

    // 存储扩展提供的分类
    private externalCategories: Map<string, { category: any; compatibility?: { families?: string[]; boards?: string[] } }[]> = new Map();
    // 监听注册表变更的回调列表
    private listeners: (() => void)[] = [];

    /**
     * 注册来自扩展的工具箱分类
     * @param extId 扩展 ID
     * @param category 分类定义对象
     * @param compatibility 兼容性约束（可选）
     */
    public registerExtensionCategory(extId: string, category: any, compatibility?: { families?: string[]; boards?: string[] }) {
        if (!this.externalCategories.has(extId)) {
            this.externalCategories.set(extId, []);
        }
        this.externalCategories.get(extId)?.push({ category, compatibility });
        // 清除缓存以使新注册生效
        this.toolboxCache.clear();
        this.notifyListeners();
    }

    /**
     * 取消注册特定扩展的所有分类和板卡
     * @param extId 扩展 ID
     */
    public unregisterExtension(extId: string) {
        let changed = false;

        // 1. 移除由该扩展贡献的板卡
        const prefix = `${extId}:`;
        for (const [id] of this.boards.entries()) {
            if (id.startsWith(prefix)) {
                this.boards.delete(id);
                changed = true;
            }
        }

        // 2. 移除对应的工具箱分类
        if (this.externalCategories.has(extId)) {
            this.externalCategories.delete(extId);
            changed = true;
        }

        if (changed) {
            this.toolboxCache.clear();
            this.notifyListeners();
        }
    }

    /**
     * 订阅注册表变更事件
     * @param listener 回调函数
     * @returns 取消订阅的函数
     */
    public subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * 通知所有订阅者注册表已变更
     */
    private notifyListeners() {
        this.listeners.forEach(l => l());
    }
}

export const BoardRegistry = new BoardRegistryService();
