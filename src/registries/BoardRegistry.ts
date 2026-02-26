/**
 * ============================================================
 * 开发板注册服务 (Board Registry Service)
 * ============================================================
 * 
 * 负责管理所有支持的开发板配置，并根据所选开发板动态生成工具箱 (Toolbox)。
 * 实现了单例模式 (Singleton Pattern)。
 * 
 * 重构说明 (Phase 3):
 * 原有的硬编码工具箱生成逻辑已被策略模式 (Strategy Pattern) 取代。
 * 现在通过注册 `ToolboxCategoryProvider` 来扩展工具箱，支持更灵活的硬件能力 (WiFi, RTOS, etc.)。
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
 * 3. 动态策略分类 (通过 ToolboxStrategies 提供，如 IoT, RTOS, STM32)
 * 4. 外部扩展插件分类
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
    PROTOCOLS_CONTENTS, AUDIO_CONTENTS, STORAGE_CONTENTS,
    ESP_UTILS_CONTENTS, STM32_CONTENTS,
    LISTS_CONTENTS, INPUTS_CONTENTS, EXPANSION_CONTENTS, HID_CONTENTS,
    AI_CONTENTS, DATA_SC_CONTENTS, DATA_FMT_CONTENTS, GAME_CONTENTS,
    SYSTEM_CONTENTS, STATS_CONTENTS, AUDIO_IN_CONTENTS,
    ROBOTS_CONTENTS, MENU_CONTENTS, PID_CONTENTS, LOGGING_CONTENTS,
    DIAGNOSTICS_CONTENTS, JSON_CONTENTS, VENDOR_CONTENTS, ADVANCED_VARS_CONTENTS,
    SPECIAL_SENSORS_CONTENTS, SIGNAL_CONTENTS, TEST_DEV_CONTENTS
} from '../config/toolbox_categories';
import { CATEGORY_COLORS } from '../config/theme';
import { ToolboxCategoryProvider, STM32ToolboxProvider, IoTToolboxProvider, RTOSToolboxProvider } from './ToolboxStrategies';

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
    // 注册的工具箱策略提供者
    private strategies: ToolboxCategoryProvider[] = [];

    private isInitialized = false;

    constructor() {
        // 初始化预设策略
        this.strategies.push(new IoTToolboxProvider());
        this.strategies.push(new RTOSToolboxProvider());
        this.strategies.push(new STM32ToolboxProvider());

        // [OPTIMIZATION] 订阅数据仓库更新，解耦循环依赖
        boardRepository.onDataLoaded(() => {
            console.log('[BoardRegistry] Data repository updated, refreshing boards...');
            this.initializeBoards();
        });

        // [OPTIMIZATION] 不再在构造函数中同步加载板卡，延迟到第一次请求时
        // this.initializeBoards();
        this.toolboxCache.clear();
    }

    /**
     * 确保注册表已初始化
     */
    public ensureInitialized() {
        if (!this.isInitialized) {
            this.isInitialized = true; // Set early to prevent potential recursion from inner calls
            console.time('[BoardRegistry] ensureInitialized');
            this.initializeBoards();
            console.timeEnd('[BoardRegistry] ensureInitialized');

            // [FIX] 触发 STM32 模块的后台加载
            // 这里不再需要 .then() 里的回调，因为我们已经在 constructor 里订阅了 onDataLoaded
            boardRepository.loadSTM32Boards().catch(e => {
                console.error('[BoardRegistry] Background STM32 load failed:', e);
            });
        }
    }

    /**
     * [NEW] 异步等待注册表完全就绪 (包括背景加载的板卡)
     */
    public async waitReady(): Promise<void> {
        this.ensureInitialized();
        // [OPTIMIZATION] 移除强制 await loadSTM32Boards 的阻塞逻辑。
        // STM32 的上千个板卡允许在后台完全异步加载，完成后会通过 notifyListeners 自动刷新 UI。
        // 这将直接消除 ~1985ms 的启动卡顿！
    }

    /**
     * 设置当前选中的开发板 ID
     * @param id 开发板 ID
     */
    public setCurrentBoard(id: string) {
        this.ensureInitialized();
        this.currentBoardId = id;
    }

    /**
     * 获取当前选中的开发板配置
     */
    public getCurrentBoard(): BoardConfig | undefined {
        this.ensureInitialized();
        if (!this.currentBoardId) return undefined;
        return this.get(this.currentBoardId);
    }

    /**
     * 初始化板卡列表
     * 从统一仓库加载已发现的板卡和家族注入信息
     */
    public initializeBoards() {
        this.boards.clear();

        // 批量加载标准/自定义板卡 (非 STM32 此时为同步加载)
        const allBoards = boardRepository.getAllBoards();
        console.log(`[BoardRegistry] Loaded ${allBoards.length} boards from repository.`);

        allBoards.forEach(board => {
            // 直接操作 Map 避免触发 register 中的 notify
            this.boards.set(board.id, board as unknown as BoardConfig);
        });

        // 统一清理缓存
        this.toolboxCache.clear();
        // 统一通知监听器
        this.notifyListeners();
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
        this.ensureInitialized();
        return this.boards.get(id);
    }

    /**
     * 获取所有已注册的开发板配置
     */
    public getAll(): BoardConfig[] {
        this.ensureInitialized();
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
        this.ensureInitialized();
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

        // 2.5 利用策略生成动态可选分类 (Standard + Family Specific)
        const dynamicCategories: any[] = [];
        let hasSeparator = false;

        this.strategies.forEach(strategy => {
            if (strategy.canHandle(boardConfig)) {
                const cats = strategy.getCategories(boardConfig);
                if (cats && cats.length > 0) {
                    if (!hasSeparator && hardwareCategories.length > 0) {
                        dynamicCategories.push({ kind: 'sep' });
                        hasSeparator = true;
                    }
                    dynamicCategories.push(...cats);
                }
            }
        });

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
                        dynamicCategories.push({ kind: 'sep' });
                        hasExternal = true;
                    }
                    dynamicCategories.push(item.category);
                });
            });
        }

        // Debug: 输出生成的分类数量，方便确认动态分类是否生效
        console.log(`[BoardRegistry] Generated ${commonCategories.length} common, ${hardwareCategories.length} hardware, ${dynamicCategories.length} dynamic, and ${this.externalCategories.size} external categories.`);

        return {
            kind: 'categoryToolbox',
            contents: [
                ...commonCategories,
                ...hardwareCategories,
                ...dynamicCategories
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
        this.ensureInitialized();
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
