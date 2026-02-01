import { Board } from '../types/board';

/**
 * BoardRepository: 硬件板卡数据仓库
 * 
 * 功能:
 * 1. 自动发现并加载 `src/data/boards/` 下的所有 JSON 定义。
 * 2. 提供标准版卡 (Arduino/ESP32) 和 高级板卡 (STM32) 的分类检索。
 * 3. 实现懒加载机制和基于分类内容的排序逻辑。
 */

// 利用 Vite 的 import.meta.glob 自动扫描目录下的所有 JSON 文件
// eager: true 表示立即同步加载，以便在页面渲染前数据可用
const standardModules = import.meta.glob('/src/data/boards/standard/**/*.json', { eager: true });
const stm32Modules = import.meta.glob('/src/data/boards/stm32/**/*.json', { eager: true });
const customModules = import.meta.glob('/src/data/boards/custom/**/*.json', { eager: true });

export interface BoardRepository {
    /** 获取标准分类板卡 (按品牌分组) */
    getStandardBoards: () => Record<string, Board[]>;
    /** 获取 STM32 分类板卡 (按系列分组) */
    getSTM32Boards: () => Record<string, any>;
    /** 获取系统支持的所有板卡扁平列表 */
    getAllBoards: () => Board[];
}

class BoardRepositoryImpl implements BoardRepository {
    private standardCache: Record<string, Board[]> | null = null;
    private stm32Cache: Record<string, any> | null = null;

    constructor() {
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
                    // 对于 standard 目录，提取一级子目录作为分类名 (parts[5])
                    category = parts[5];
                }

                // 格式化分类显示名 (首字母大写，修正 ESP 等缩写)
                const catName = category.charAt(0).toUpperCase() + category.slice(1).replace('Esp', 'ESP');

                if (!result[catName]) result[catName] = [];
                const rawBoard = mod.default || mod;

                // Inject family based on category (e.g. Arduino -> arduino, ESP32 -> esp32)
                // Also ensure 'build' config exists to prevent crashes in FileSystemContext
                const board = {
                    ...rawBoard,
                    family: category.toLowerCase(),
                    page_url: rawBoard.page_url || `https://www.google.com/search?q=${rawBoard.name ? rawBoard.name.replace(/\s+/g, '+') : rawBoard.id}+${category}+board`,
                    build: rawBoard.build || {
                        envName: rawBoard.mcu || `${rawBoard.id}`,
                        platform: rawBoard.platform || 'atmelavr', // Fallback
                        board: rawBoard.id,
                        framework: 'arduino'
                    }
                };

                result[catName].push(board);
            });
        };

        // 处理内置标准板卡和用户自定义板卡
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
     * 获取 STM32 数据并按系列分组
     */
    getSTM32Boards() {
        if (this.stm32Cache) return this.stm32Cache;

        const result: any = { STM32: {} };
        const stmRoot = result.STM32;

        Object.entries(stm32Modules).forEach(([path, mod]: [string, any]) => {
            // 路径结构: /src/data/boards/stm32/[Series]/[mcu].json
            const parts = path.split('/');
            const series = parts[5]; // 例如: STM32F4

            if (!stmRoot[series]) stmRoot[series] = [];
            const rawBoard = mod.default || mod;

            // Smart URL generation for ST
            let pageUrl = rawBoard.page_url;
            if (!pageUrl) {
                const mcu = rawBoard.mcu || "";
                // Use site search to ensure valid results (direct links are flaky)
                pageUrl = `https://www.st.com/content/st_com/en/search.html#q=${mcu}`;
            }

            // 为板卡注入系列（Family）信息，并确保 build 配置存在
            // 注意: 此处不再硬编码 'env:' 前缀，交给 templates.ts 的 sanitizeEnvName 统一处理
            const board = {
                ...rawBoard,
                family: 'stm32',
                page_url: pageUrl,
                build: rawBoard.build || {
                    envName: rawBoard.mcu || `${rawBoard.id}`, // 环境名优先使用 MCU 型号，阅读更友好
                    platform: rawBoard.platform || 'ststm32',
                    board: rawBoard.id,
                    framework: 'arduino'
                }
            };

            stmRoot[series].push(board);
        });

        this.stm32Cache = result;
        return result;
    }

    /**
     * 获取系统支持的所有板卡数组
     */
    getAllBoards() {
        const std = Object.values(this.getStandardBoards()).flat();
        const stm = Object.values(this.getSTM32Boards().STM32).flat();
        return [...std, ...stm] as Board[];
    }
}

// 导出单例，确保全局共用同一份缓存
export const boardRepository = new BoardRepositoryImpl();
