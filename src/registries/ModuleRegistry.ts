/**
 * ============================================================
 * 积木模块注册服务 (Module Registry Service)
 * ============================================================
 * 
 * 管理 Blockly 积木块的模块化注册和初始化。
 * 每个功能模块 (如传感器、显示器等) 独立注册，支持按需加载。
 * 
 * 核心功能:
 * - register(): 注册新的积木模块
 * - initAll(): 初始化所有已注册模块
 * - reinitializeAll(): 强制重新初始化 (语言切换等场景)
 * 
 * 模块结构:
 * - id: 唯一标识符 (如 'core.variables', 'sensors.dht')
 * - name: 模块显示名称
 * - category: 对应的工具箱分类 ID
 * - init(): 初始化函数，注册 blocks 和 generators
 * 
 * @file src/registries/ModuleRegistry.ts
 * @module EmbedBlocks/Frontend/Registries
 */

/**
 * 积木模块接口
 * 定义一个可注册的功能模块
 */
export interface BlockModule {
    /** 模块唯一标识符 */
    id: string;
    /** 模块显示名称 */
    name: string;
    /** 可选的工具箱分类 ID */
    category?: string;
    /** 模块描述 */
    description?: string;
    /** 初始化函数，注册 blocks 和 generators */
    init: () => void;
}

/**
 * 模块注册服务类
 * 管理积木模块的注册和初始化
 */

class ModuleRegistryService {
    private modules: Map<string, BlockModule> = new Map();
    private initialized: Set<string> = new Set();
    private failed: Set<string> = new Set();

    /**
     * 注册一个新的积木模块到注册表
     * @param module - 要注册的模块配置对象
     * @throws {Error} 如果模块 ID 为空或无效
     * @example
     * ModuleRegistry.register({
     *   id: 'core.variables',
     *   name: 'Variables',
     *   category: 'VARIABLES',
     *   init: () => { ... }
     * });
     */
    public register(module: BlockModule) {
        if (this.modules.has(module.id)) {
            console.warn(`[ModuleRegistry] Module ${module.id} is already registered. Overwriting.`);
        }
        this.modules.set(module.id, module);
    }

    /**
     * 初始化所有已注册的模块
     * - 跳过已初始化或已失败的模块
     * - 捕获初始化错误并记录到 failed 集合
     * - 在控制台输出初始化结果摘要
     * @returns {void}
     */
    public initAll() {
        console.log(`[ModuleRegistry] Initializing ${this.modules.size} modules...`);
        const errors: Array<{ id: string, error: any }> = [];

        for (const [id, module] of this.modules) {
            if (!this.initialized.has(id) && !this.failed.has(id)) {
                try {
                    module.init();
                    this.initialized.add(id);
                    // console.log(`[ModuleRegistry] Initialized: ${module.name} (${id})`);
                } catch (e) {
                    console.error(`[ModuleRegistry] Failed to initialize module ${id}:`, e);
                    this.failed.add(id);
                    errors.push({ id, error: e });
                }
            }
        }

        if (errors.length > 0) {
            console.warn(`[ModuleRegistry] ${errors.length} module(s) failed to initialize.`);
            console.warn('[ModuleRegistry] Failed modules:', errors.map(e => e.id).join(', '));
        }

        console.log(`[ModuleRegistry] Initialization complete. Success: ${this.initialized.size}, Failed: ${this.failed.size}`);
    }

    /**
     * 强制重新初始化所有模块
     * 用于语言切换等需要重新定义 Block 的场景
     */
    public reinitializeAll() {
        console.log('[ModuleRegistry] Re-initializing all modules...');
        this.initialized.clear();
        this.failed.clear();
        this.initAll();
    }

    public getModule(id: string): BlockModule | undefined {
        return this.modules.get(id);
    }

    public getModules(): BlockModule[] {
        return Array.from(this.modules.values());
    }

    public getFailedModules(): string[] {
        return Array.from(this.failed);
    }
}

export const ModuleRegistry = new ModuleRegistryService();
