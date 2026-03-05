/**
 * ============================================================
 * 扩展插件注册服务 (Extension Registry Service)
 * ============================================================
 * 
 * 负责管理第三方扩展插件的加载、注册和代码生成。
 * 使用沙箱 iframe 隔离不可信的扩展代码。
 * 
 * 核心功能:
 * - 扫描并加载扩展目录中的所有插件
 * - 加载插件的 Blocks 定义和 Generator 脚本
 * - 在沙箱环境中执行代码生成
 * - 支持多语言翻译
 * 
 * 安全机制:
 * - 沙箱 iframe 隔离执行不可信代码
 * - 开发环境使用 allow-same-origin，生产环境严格隔离
 * - 通过 postMessage 与沙箱通信
 * 
 * 扩展清单格式 (manifest.json):
 * - id: 唯一标识符
 * - version: 版本号
 * - name/description: 名称和描述
 * - compatibility: 兼容的板卡家族/型号
 * - contributes: 贡献的 boards/blocks/generators
 * 
 * @file src/registries/ExtensionRegistry.ts
 * @module EmbedBlocks/Frontend/Registries
 */

import * as Blockly from 'blockly';
import { BoardConfig } from '../types/board';
import { BoardRegistry } from './BoardRegistry';
import i18n from '../i18n';
import { notificationService } from '../services/NotificationService';

/**
 * 扩展清单接口
 * 定义扩展插件的元数据和贡献项
 */
export interface ExtensionManifest {
    /** 扩展唯一标识符 */
    id: string;
    /** 版本号 */
    version: string;
    /** 扩展名称 (支持国际化键) */
    name: string;
    /** 扩展描述 (支持国际化键) */
    description: string;
    /** 扩展分类标签 */
    categories?: string[];
    /** 图标路径 */
    icon?: string;
    /** 兼容性约束 */
    compatibility?: {
        /** 兼容的板卡家族列表 (如 ['arduino', 'esp32']) */
        families?: string[];
        /** 兼容的具体板卡型号列表 (如 ['uno', 'nano']) */
        boards?: string[];
    };
    /** 贡献项配置 */
    contributes: {
        /** 板卡定义文件路径列表 */
        boards?: string[];
        /** Block 定义文件路径列表 */
        blocks?: string[];
        /** Generator 脚本文件路径列表 */
        generators?: string[];
    };
}

/**
 * 已加载的扩展信息接口
 */
export interface LoadedExtension {
    /** 扩展清单 */
    manifest: ExtensionManifest;
    /** 扩展目录路径 */
    path: string;
    /** 图标 Base64 数据 */
    icon?: string;
    /** 是否包含板卡定义 */
    hasBoards: boolean;
    /** 是否包含 Block 定义 */
    hasBlocks: boolean;
    /** 是否包含 Generator */
    hasGenerators: boolean;
    /** 是否包含库依赖 */
    hasLibraries: boolean;
    /** 支持的语言列表 */
    languages: string[];

    // [性能优化] 主进程预取的高速缓存内容
    boardContents?: Record<string, string>;
    blockContents?: Record<string, string>;
    generatorContents?: Record<string, string>;
    localeContents?: Record<string, string>;

    /** 原始清单 (用于语言切换时恢复) */
    originalManifest?: ExtensionManifest;
}

/**
 * 扩展插件注册服务类
 * 管理扩展的加载、注册和沙箱通信
 */

class ExtensionRegistryService {
    private extensions: LoadedExtension[] = [];
    private sandboxInfo: { iframe: HTMLIFrameElement; loaded: boolean } | null = null;
    private pendingMessages: any[] = [];
    private codeGenRequests: Map<string, { resolve: (code: string) => void; reject: (err: any) => void }> = new Map();
    private initPromise: Promise<void> | null = null;

    constructor() {
        // 推迟初始化 - 仅在需要时延迟触发
        // 避免在构造函数中调用 async 的反模式
    }

    /**
     * 确保注册表已初始化。可安全多次调用。
     * 使用缓存的 Promise 避免重复初始化。
     */
    public ensureInitialized(): Promise<void> {
        if (!this.initPromise) {
            this.initPromise = this.init();
        }
        return this.initPromise;
    }

    private async init(): Promise<void> {
        const initStart = performance.now();
        // 创建沙箱 iframe
        const iframe = document.createElement('iframe');
        // 开发环境：Vite 直接从 src 提供文件
        // 生产环境：sandbox.html 构建到 dist/ 根目录 (参考 vite.sandbox.config.ts)
        iframe.src = import.meta.env.DEV ? '/src/sandbox/sandbox.html' : './sandbox.html';
        iframe.style.display = 'none';

        // 开发环境：我们需要 allow-same-origin 以支持 Vite HMR 和从 localhost 加载脚本
        // 生产环境：我们需要严格隔离，仅允许脚本运行 (allow-scripts)
        const sandboxAttr = import.meta.env.DEV ? 'allow-scripts allow-same-origin' : 'allow-scripts';
        iframe.setAttribute('sandbox', sandboxAttr);

        document.body.appendChild(iframe);

        iframe.onload = () => {
            console.log('[ExtensionRegistry] Sandbox Iframe Loaded');
            if (this.sandboxInfo) this.sandboxInfo.loaded = true;
            this.flushPendingMessages();
        };

        this.sandboxInfo = { iframe, loaded: false };
        window.addEventListener('message', this.handleMessage.bind(this));

        if (window.electronAPI) {
            try {
                const step1 = performance.now();
                this.extensions = await window.electronAPI.extensionsList();
                const step2 = performance.now();
                console.log(`[ExtensionRegistry.init] extensionsList IPC took ${(step2 - step1).toFixed(2)}ms`, this.extensions);

                // [FIX] 确保所有硬件注册表已就绪
                await BoardRegistry.waitReady();
                const step3 = performance.now();
                console.log(`[ExtensionRegistry.init] BoardRegistry.waitReady took ${(step3 - step2).toFixed(2)}ms`);

                await this.loadResources();
                const step4 = performance.now();
                console.log(`[ExtensionRegistry.init] loadResources took ${(step4 - step3).toFixed(2)}ms`);

                // 当语言变更时重新加载资源以更新本地化字符串
                i18n.on('languageChanged', async () => {
                    console.log('[ExtensionRegistry] Language changed, refreshing resources...');
                    await this.loadResources();
                });
            } catch (e) {
                console.error("Failed to load extensions list", e);
            }
        }
        const initEnd = performance.now();
        console.log(`[ExtensionRegistry.init] Total time: ${(initEnd - initStart).toFixed(2)}ms`);
    }

    /**
     * 处理来自沙箱的消息
     */
    private handleMessage(event: MessageEvent) {
        const data = event.data;
        if (!data) return;

        // 处理代码生成请求的回调
        if (data.type === 'code-generated') {
            const request = this.codeGenRequests.get(data.requestId);
            if (request) {
                if (data.success) request.resolve(data.code);
                else request.reject(new Error(data.error));
                this.codeGenRequests.delete(data.requestId);
            }
        }
    }

    /**
     * 向沙箱发送消息
     */
    private sendMessage(msg: any) {
        if (this.sandboxInfo && this.sandboxInfo.loaded && this.sandboxInfo.iframe.contentWindow) {
            this.sandboxInfo.iframe.contentWindow.postMessage(msg, '*');
        } else {
            // 如果沙箱尚未加载，则缓存消息
            this.pendingMessages.push(msg);
        }
    }

    /**
     * 发送所有待处理的消息
     */
    private flushPendingMessages() {
        if (!this.sandboxInfo || !this.sandboxInfo.loaded || !this.sandboxInfo.iframe.contentWindow) return;
        while (this.pendingMessages.length > 0) {
            const msg = this.pendingMessages.shift();
            this.sandboxInfo.iframe.contentWindow.postMessage(msg, '*');
        }
    }

    /**
     * 获取已加载的扩展列表
     */
    public getExtensions(): LoadedExtension[] {
        return this.extensions;
    }

    /**
     * 重新加载所有扩展
     */
    public async reload() {
        if (window.electronAPI) {
            try {
                // 从 Electron 进程获取最新的扩展列表
                this.extensions = await window.electronAPI.extensionsList();
                console.log('Extensions reloaded:', this.extensions);
                // 重新加载扩展相关的资源（如 Blockly 定义）
                await this.loadResources();
            } catch (e) {
                console.error("Failed to reload extensions", e);
            }
        }
    }

    private async loadResources() {
        // [OPTIMIZATION] 并行处理所有扩展的资源加载
        await Promise.all(this.extensions.map(async (ext) => {
            // 恢复原始 Manifest（如果存在），避免切换语言时重复翻译
            if (ext.originalManifest) {
                ext.manifest = JSON.parse(JSON.stringify(ext.originalManifest));
            } else {
                // 首次加载：备份原始 Manifest
                ext.originalManifest = JSON.parse(JSON.stringify(ext.manifest));
            }

            // 0. 清除该扩展之前的资源，防止重复/残留
            BoardRegistry.unregisterExtension(ext.manifest.id);

            // 并行执行多语言、板卡、积木、生成器的加载任务
            const loadTasks: Promise<void>[] = [];

            // 0.1 加载翻译文件
            if (ext.languages && ext.languages.length > 0) {
                loadTasks.push((async () => {
                    const currentLang = i18n.language.split('-')[0]; // 简单匹配 (en-US -> en)
                    const targetLang = ext.languages.includes(currentLang) ? currentLang :
                        (ext.languages.includes('en') ? 'en' : ext.languages[0]);

                    try {
                        // [性能优化] 优先从内存高速缓存中读取，消除底层 IPC 损耗
                        let langContent = ext.localeContents?.[`locales/${targetLang}.json`];

                        if (!langContent) {
                            // [安全后备] 如果由于任何原因缓存丢失，退回到老式的 IPC 逐个读取
                            langContent = await window.electronAPI.extensionReadFile(ext.manifest.id, `locales/${targetLang}.json`);
                        }

                        if (langContent) {
                            const translations = JSON.parse(langContent);
                            // 合并到 i18next 用于通用 UI 字符串
                            i18n.addResourceBundle(targetLang, 'translation', translations, true, true);
                            // 同时合并到 Blockly 用于积木特定字符串
                            Object.assign(Blockly.Msg, translations);

                            // 如果 Manifest 字段是键值引用，则进行翻译
                            const translateFieldHelper = (val: string) => {
                                if (val && val.startsWith('%{') && val.endsWith('}')) {
                                    const key = val.substring(2, val.length - 1);
                                    return translations[key] || val;
                                }
                                return val;
                            };
                            ext.manifest.name = translateFieldHelper(ext.manifest.name);
                            ext.manifest.description = translateFieldHelper(ext.manifest.description);

                            console.log(`[Extension] Loaded translations for ${ext.manifest.id} (${targetLang})`);
                        }
                    } catch (e) {
                        console.error(`[Extension] Failed to load translations for ${ext.manifest.id}`, e);
                    }
                })());
            }

            // 必须等待多语言加载完成再处理板卡，因为板卡可能需要翻译
            // 使用 await 等待语言加载任务完成 (当前唯一的一个由闭包封装的任务)
            await Promise.all(loadTasks);
            loadTasks.length = 0; // 清空任务队列


            // 重新获取加载后的字典，供 translateField 使用
            const currentLangLocalesStr = ext.localeContents?.[`locales/${i18n.language.split('-')[0]}.json`] || ext.localeContents?.['locales/en.json'];
            const pluginTranslations: Record<string, string> = currentLangLocalesStr ? JSON.parse(currentLangLocalesStr) : {};

            // 定义本地翻译助手，用于板卡和积木
            const translateField = (val: any) => {
                if (typeof val === 'object' && val !== null) {
                    const targetLang = i18n.language || 'en';
                    // 支持直接对象格式，如 { "zh": "...", "en": "..." }
                    return val[targetLang] || val['en'] || Object.values(val)[0] || '';
                }
                if (typeof val === 'string' && val.startsWith('%{') && val.endsWith('}')) {
                    let key = val.substring(2, val.length - 1);
                    // 支持 Blockly 风格的 BKY_ 前缀
                    if (key.startsWith('BKY_')) {
                        key = key.substring(4);
                    }
                    // 尝试顺序：全局 Blockly Msg (系统) -> 插件共享 Locales -> 键名作为降级
                    return (Blockly.Msg as any)[key] || pluginTranslations[key] || val;
                }
                return val;
            };

            // 1. 加载自定义板卡 (受信任的 JSON，在 Main/Renderer 中处理)
            if (ext.hasBoards && ext.manifest.contributes.boards) {
                for (const boardFile of ext.manifest.contributes.boards) {
                    loadTasks.push((async () => {
                        try {
                            // [性能优化] 尝试直接从主进程预先打包的缓存字典中命中数据
                            let content = ext.boardContents?.[boardFile];

                            if (!content) {
                                // [安全后备] 缓存未命中时依然可以通过 IPC 读取，保证系统健壮性
                                content = await window.electronAPI.extensionReadFile(ext.manifest.id, boardFile);
                            }

                            if (content) {
                                try {
                                    const boardConfig: BoardConfig = JSON.parse(content);
                                    // 确保 ID 唯一/命名空间化，以避免冲突
                                    boardConfig.id = `${ext.manifest.id}:${boardConfig.id}`;

                                    // 翻译板卡名称（如果它是一个键）
                                    const displayName = translateField(boardConfig.name);
                                    boardConfig.name = `${displayName} (Ext)`;

                                    // 深度翻译引脚标签
                                    if (boardConfig.pins) {
                                        Object.keys(boardConfig.pins).forEach(group => {
                                            const pins = (boardConfig.pins as any)[group];
                                            if (Array.isArray(pins)) {
                                                pins.forEach(pin => {
                                                    if (pin.label) {
                                                        pin.label = translateField(pin.label);
                                                    }
                                                });
                                            }
                                        });
                                    }

                                    // 处理插件自带的 CUSTOM_SVG 模型加载
                                    if (boardConfig.package === 'CUSTOM_SVG' && boardConfig.visuals?.svgPath) {
                                        try {
                                            const svgContent = await window.electronAPI.extensionReadFile(ext.manifest.id, boardConfig.visuals.svgPath);
                                            if (svgContent) {
                                                boardConfig.visuals.svgContent = svgContent;
                                            } else {
                                                console.warn(`[Extension] SVG file not found: ${boardConfig.visuals.svgPath} in ${ext.manifest.id}`);
                                            }
                                        } catch (e) {
                                            console.error(`[Extension] Failed to load SVG asset for board ${boardConfig.id}:`, e);
                                        }
                                    }

                                    BoardRegistry.register(boardConfig);
                                    console.log(`Registered extension board: ${boardConfig.id}`);
                                } catch (parseErr) {
                                    const errMsg = `[Extension] Failed to parse board JSON: ${boardFile} in ${ext.manifest.id}. Error: ${(parseErr as Error).message}`;
                                    console.error(errMsg);
                                    notificationService.show(errMsg, 'error', 10000);
                                }
                            }
                        } catch (e) {
                            const errMsg = `[Extension] Failed to load board ${boardFile} from ${ext.manifest.id}. Error: ${(e as Error).message}`;
                            console.error(errMsg);
                            notificationService.show(errMsg, 'error', 10000);
                        }
                    })());
                }
            }

            // 2. 加载积木和生成器
            const blockFiles = ext.manifest.contributes.blocks || [];
            const generatorFiles = ext.manifest.contributes.generators || [];

            // 2.1 处理积木定义 (JSON -> UI & 沙箱)
            for (const blockFile of blockFiles) {
                loadTasks.push((async () => {
                    try {
                        // [性能优化] 内存级秒读积木文件
                        let content = ext.blockContents?.[blockFile];

                        if (!content) {
                            // [安全后备] 回退机制
                            content = await window.electronAPI.extensionReadFile(ext.manifest.id, blockFile);
                        }

                        if (content) {
                            try {
                                // 如果是 JSON，则是 UI 定义
                                if (blockFile.endsWith('.json')) {
                                    const definitions = JSON.parse(content);
                                    // 在主窗口注册 (用于编辑器 UI)
                                    Blockly.defineBlocksWithJsonArray(definitions);
                                    console.log(`[Extension] Registered ${definitions.length} blocks from ${blockFile}`);

                                    // 生成工具箱分类
                                    if (definitions.length > 0) {
                                        const contents = definitions.map((def: any) => ({
                                            kind: 'block',
                                            type: def.type
                                        }));

                                        const category = {
                                            kind: 'category',
                                            name: ext.manifest.name,
                                            colour: '#2ecc71', // Standard Green for Extensions
                                            contents: contents
                                        };

                                        BoardRegistry.registerExtensionCategory(ext.manifest.id, category, ext.manifest.compatibility);
                                    }

                                    // 同步到沙箱 (用于无头工作区)
                                    this.sendMessage({
                                        type: 'load-definitions',
                                        id: ext.manifest.id,
                                        definitions: definitions
                                    });
                                } else {
                                    // 如果是 JS 文件，可能是旧版定义或逻辑。
                                    // 发送到沙箱。
                                    this.sendMessage({
                                        type: 'load-script',
                                        id: ext.manifest.id,
                                        content: content
                                    });
                                }
                            } catch (parseErr) {
                                console.error(`Failed to parse/load block file ${blockFile}`, parseErr);
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to read block file ${blockFile} from ${ext.manifest.id}`, e);
                    }
                })());
            }

            // 2.2 处理生成器 (JS -> 仅沙箱)
            for (const scriptFile of generatorFiles) {
                loadTasks.push((async () => {
                    try {
                        // [性能优化] 生成器脚本同样走内存缓存
                        let content = ext.generatorContents?.[scriptFile];

                        if (!content) {
                            content = await window.electronAPI.extensionReadFile(ext.manifest.id, scriptFile);
                        }

                        if (content) {
                            this.sendMessage({
                                type: 'load-script',
                                id: ext.manifest.id,
                                content: content
                            });
                        }
                    } catch (e) {
                        console.error(`Failed to load generator ${scriptFile} from ${ext.manifest.id}`, e);
                    }
                })());
            }

            // 等待所有并行的板卡、积木、生成器加载完成
            await Promise.all(loadTasks);
        }));
    }

    // 用于代码生成的公共 API
    public generateCode(xml: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).substring(7);
            this.codeGenRequests.set(requestId, { resolve, reject });
            this.sendMessage({ type: 'generate-code', xml, requestId });

            // 超时处理
            setTimeout(() => {
                if (this.codeGenRequests.has(requestId)) {
                    this.codeGenRequests.get(requestId)?.reject(new Error('Timeout'));
                    this.codeGenRequests.delete(requestId);
                }
            }, 5000);
        });
    }
}

export const ExtensionRegistry = new ExtensionRegistryService();
