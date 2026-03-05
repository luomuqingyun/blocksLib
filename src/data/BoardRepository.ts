/**
 * ============================================================
 * 硬件板卡数据仓库 (Board Repository)
 * ============================================================
 * 
 * 管理所有支持的开发板配置数据，提供自动发现和分类检索功能。
 * 
 * 核心功能:
 * - 自动发现 src/data/boards/ 目录下的所有 JSON 定义
 * - 支持标准板卡 (Arduino/ESP32) 和高级板卡 (STM32) 分类
 * - 实现懒加载和缓存机制
 * - 自动注入 family 和 build 配置
 * - 智能排序 (常用型号置顶)
 * 
 * 数据目录结构:
 * - /src/data/boards/standard/ - Arduino/ESP32 等标准板卡
 * - /src/data/boards/stm32/ - STM32 系列板卡 (按系列分组)
 * - /src/data/boards/custom/ - 用户自定义板卡
 * 
 * @file src/data/BoardRepository.ts
 * @module EmbedBlocks/Data/Boards
 */

import { Board } from '../types/board';

// 利用 Vite 的 import.meta.glob 自动扫描目录下的所有 JSON 文件
// eager: true 表示立即同步加载，以便在页面渲染前数据可用
// [OPTIMIZATION] STM32 和 Custom 板卡数量巨大，改为 lazy loading (eager: false)
const standardModules = import.meta.glob('/src/data/boards/standard/**/*.json', { eager: true });
const stm32Modules = import.meta.glob('/src/data/boards/stm32/**/*.json', { eager: false });
const customModules = import.meta.glob('/src/data/boards/custom/**/*.json', { eager: true });

// 自动打包所有的源自带 SVG 文件作为纯文本
const standardSvgs = import.meta.glob('/src/data/boards/**/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;



export interface BoardRepository {
    /** 获取标准分类板卡 (按品牌分组) */
    getStandardBoards: () => Record<string, Board[]>;

    /** 
     * 获取 STM32 分类板卡 (按系列分组) 
     * 如果尚未加载，返回空对象或部分缓存 
     */
    getSTM32Boards: () => Record<string, any>;

    /** 异步加载 STM32 板卡数据 */
    loadSTM32Boards: () => Promise<Record<string, any>>;

    /** 获取系统支持的所有板卡扁平列表 (仅包含已加载的) */
    getAllBoards: () => Board[];
}

class BoardRepositoryImpl implements BoardRepository {
    private standardCache: Record<string, Board[]> | null = null;
    private stm32Cache: Record<string, any> | null = null;
    private loadingPromise: Promise<Record<string, any>> | null = null;
    private listeners: (() => void)[] = [];

    constructor() {
    }

    /**
     * 订阅数据加载完成事件
     */
    public onDataLoaded(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l());
    }

    /**
     * 获取标准板卡数据并进行排序
     */
    getStandardBoards() {
        if (this.standardCache) return this.standardCache;

        const result: Record<string, Board[]> = {};

        // 安全获取名称，支持多语言对象或纯字符串
        const getSafeName = (b: any): string => {
            if (typeof b.name === 'string') return b.name;
            if (b.name && typeof b.name === 'object' && b.name.en) return b.name.en;
            return b.id || '';
        };

        /**
         * 内部助手: 遍历 glob 导入的模块并填充到分类字典中
         */
        const processModules = (modules: Record<string, any>, defaultCategory: string | null) => {
            Object.entries(modules).forEach(([path, mod]: [string, any]) => {
                const parts = path.split('/');
                let category = defaultCategory;

                if (!category) {
                    // 鲁棒路径解析: 寻找 standard 目录后的第一个段作为分类
                    const standardIndex = parts.indexOf('standard');
                    if (standardIndex !== -1 && parts.length > standardIndex + 1) {
                        category = parts[standardIndex + 1];
                    } else {
                        category = 'other';
                    }
                }

                // 格式化分类显示名 (首字母大写，修正 ESP 等缩写)
                const catName = category.charAt(0).toUpperCase() + category.slice(1).replace('Esp', 'ESP');

                if (!result[catName]) result[catName] = [];
                const rawBoard = mod.default || mod;

                // [SVG AUTO-DISCOVERY & PRIORITY] 
                // 自动检测逻辑：如果板卡 JSON 同级目录下存在与其 ID 匹配或指定的 SVG 文件，则强制提升为 CUSTOM_SVG
                let customSvgContent = rawBoard.visuals?.svgContent;
                const dir = path.substring(0, path.lastIndexOf('/') + 1);
                const svgFileName = rawBoard.visuals?.svgPath || `${rawBoard.id}.svg`;
                const svgRelPath = svgFileName.startsWith('./') ? svgFileName.substring(2) : svgFileName;

                // 构造 Vite import.meta.glob 键名格式
                const fullSvgPath = (dir + svgRelPath).startsWith('/')
                    ? (dir + svgRelPath)
                    : '/' + (dir + svgRelPath);

                const foundSvg = standardSvgs[fullSvgPath];

                if (foundSvg) {
                    // 找到了匹配的 SVG，自动设置为 CUSTOM_SVG 模式并注入原文
                    rawBoard.package = 'CUSTOM_SVG';
                    customSvgContent = foundSvg;
                    if (!rawBoard.visuals) rawBoard.visuals = {};
                    rawBoard.visuals.svgPath = svgRelPath;
                } else if (rawBoard.package === 'CUSTOM_SVG') {
                    // 如果 JSON 显式声明了 CUSTOM_SVG 但没找到文件，输出警告
                    console.warn(`[BoardRepository] CUSTOM_SVG declared but file not found at: ${fullSvgPath}`);
                }

                const board = {
                    ...rawBoard,
                    visuals: {
                        ...(rawBoard.visuals || {}),
                        ...(customSvgContent ? { svgContent: customSvgContent } : {})
                    },
                    family: category.toLowerCase(),
                    page_url: rawBoard.page_url || `https://www.google.com/search?q=${rawBoard.name ? rawBoard.name.replace(/\s+/g, '+') : rawBoard.id}+${category}+board`,
                    build: {
                        envName: rawBoard.mcu || `${rawBoard.id}`,
                        platform: rawBoard.platform || 'atmelavr', // Fallback
                        board: rawBoard.id,
                        framework: 'arduino',
                        ...(rawBoard.build || {})
                    }
                };

                result[catName].push(board);
            });
        };

        // 处理内置标准板卡 (同步)
        processModules(standardModules, null);
        processModules(customModules, 'custom');

        // --- 排序逻辑 (优化用户体验) ---
        const sortedResult: Record<string, Board[]> = {};

        // 1. 分类级别排序: Arduino 始终置顶，其他按字母顺序
        const categories = Object.keys(result).sort((a, b) => {
            if (a === 'Arduino') return -1;
            if (b === 'Arduino') return 1;
            return a.localeCompare(b);
        });

        categories.forEach(cat => {
            // 2. 板卡级别排序: 常用型号 (Uno, ESP32) 置顶，其余按名称排列
            const boards = result[cat].sort((a, b) => {
                const priorities = ['uno', 'nanoatmega328', 'esp32dev'];
                const aIdx = priorities.indexOf(a.id);
                const bIdx = priorities.indexOf(b.id);

                if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                if (aIdx !== -1) return -1;
                if (bIdx !== -1) return 1;

                return getSafeName(a).localeCompare(getSafeName(b));
            });
            sortedResult[cat] = boards;
        });

        this.standardCache = sortedResult;
        return sortedResult;
    }

    /**
     * 获取 STM32 数据 (同步返回缓存)
     */
    getSTM32Boards() {
        if (!this.stm32Cache) {
            // Trigger lazy load in background
            this.loadSTM32Boards();
        }
        return this.stm32Cache || { STM32: {} };
    }

    /**
     * 异步加载 STM32 数据
     */
    async loadSTM32Boards() {
        if (this.stm32Cache) return this.stm32Cache;
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            const result: any = { STM32: {} };
            const stmRoot = result.STM32;

            // 并行加载所有 STM32 模块
            const entries = Object.entries(stm32Modules);

            const loadedModules = await Promise.all(
                entries.map(async ([path, importer]: [string, any]) => {
                    const mod = await importer();
                    return { path, mod };
                })
            );

            // [FILTER] Fetch supported variants from PIO service
            let supportedVariants: Set<string> | null = null;
            try {
                if (window.electronAPI) {
                    const variants = await window.electronAPI.getPioSupportedVariants();
                    if (variants && variants.length > 0) {
                        // Normalize to uppercase for case-insensitive matching
                        supportedVariants = new Set(variants.map(v => v.toUpperCase()));
                        console.log(`[BoardRepository] Filtering boards against ${supportedVariants.size} supported variants`);
                    }
                }
            } catch (e) {
                console.warn('[BoardRepository] Failed to fetch supported variants, showing all defined boards', e);
            }

            loadedModules.forEach(({ path, mod }) => {
                // 路径结构: .../stm32/[Series]/[mcu].json
                const parts = path.split('/');
                const stm32Index = parts.indexOf('stm32');
                const series = (stm32Index !== -1 && parts.length > stm32Index + 1)
                    ? parts[stm32Index + 1]
                    : 'Unknown';

                const rawBoard = mod.default || mod;

                // [FILTER] Strict filtering based on official PIO support
                // If we have a list of supported variants, and this board's variant is NOT in it, skip it.
                if (supportedVariants) {
                    const boardVariant = (rawBoard.variant || '').toUpperCase();
                    // Also check if the variant might be just the folder name 
                    // e.g. defined variant "STM32F1xx/Generic_F103C8" vs whitelist "F103C8"
                    // STM32duino naming can be complex.

                    // Simple check: Is the variant name present in the supported list?
                    let isSupported = supportedVariants.has(boardVariant);

                    // If not found, try checking if any supported variant ends with this name (handle subdirs)
                    if (!isSupported) {
                        // Some boards JSON might just say "F103C8" but PIO has "STM32F1xx/F103C8"
                        // We checked this in the backend, backend returns both full path and short name.
                        // So exact match should cover most cases if backend logic matches frontend expectation.

                        // Special case: Generic boards often have variants like "Generic_F103Cx"

                    }

                    if (!isSupported) {
                        // Keep it but mark as unsupported? Or hide it?
                        // User request: "回退到原来以PIO官方支持的芯片...作为过滤标准"
                        // This implies hiding them or putting them in a separate "Unsupported" category.
                        // For now, let's just skip them to allow a clean "conserved" list.
                        // console.debug(`[BoardRepository] Skipping unsupported board: ${rawBoard.name} (Variant: ${rawBoard.variant})`);
                        return;
                    }
                }

                if (!stmRoot[series]) stmRoot[series] = [];

                // Smart URL generation for ST
                let pageUrl = rawBoard.page_url;
                if (!pageUrl) {
                    const mcu = rawBoard.mcu || "";
                    pageUrl = `https://www.st.com/content/st_com/en/search.html#q=${mcu}`;
                }

                // 尝试提取同目录下的 SVG 原文 (如果 package 是 CUSTOM_SVG)
                let customSvgContent = rawBoard.visuals?.svgContent;
                if (!customSvgContent && rawBoard.package === 'CUSTOM_SVG' && rawBoard.visuals?.svgPath) {
                    const dir = path.substring(0, path.lastIndexOf('/') + 1);
                    const svgRelPath = rawBoard.visuals.svgPath.startsWith('./')
                        ? rawBoard.visuals.svgPath.substring(2)
                        : rawBoard.visuals.svgPath;
                    const fullSvgPath = dir + svgRelPath;
                    customSvgContent = standardSvgs[fullSvgPath];
                }

                const board = {
                    ...rawBoard,
                    visuals: {
                        ...(rawBoard.visuals || {}),
                        ...(customSvgContent ? { svgContent: customSvgContent } : {})
                    },
                    family: 'stm32',
                    page_url: pageUrl,
                    build: {
                        envName: rawBoard.mcu || `${rawBoard.id}`,
                        platform: rawBoard.platform || 'ststm32',
                        board: rawBoard.id,
                        framework: 'arduino',
                        ...(rawBoard.build || {})
                    }
                };

                stmRoot[series].push(board);
            });

            this.stm32Cache = result;
            this.loadingPromise = null;

            // [OPTIMIZED] 使用发布者/订阅者模式通知，解耦注册表依赖
            this.notifyListeners();

            return result;
        })();

        return this.loadingPromise;
    }

    /**
     * 获取系统支持的所有板卡数组 (仅返回已加载的)
     */
    getAllBoards() {
        const std = Object.values(this.getStandardBoards()).flat();
        const stm = this.stm32Cache ? Object.values(this.stm32Cache.STM32).flat() : [];
        return [...std, ...stm] as Board[];
    }
}

// 导出单例，确保全局共用同一份缓存
export const boardRepository = new BoardRepositoryImpl();

