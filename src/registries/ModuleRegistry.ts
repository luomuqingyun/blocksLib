export interface BlockModule {
    id: string;
    name: string;
    category?: string; // Optional Toolbox Category ID
    description?: string;
    init: () => void; // Function to register blocks and generators
}

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
