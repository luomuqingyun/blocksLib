/**
 * ============================================================
 * 扩展插件服务 (Extension Service)
 * ============================================================
 * 
 * 负责本地扩展/插件的加载、导入和管理。
 * 扩展存储在 userData/extensions 目录下。
 * 
 * 扩展结构:
 * - manifest.json (扩展清单: id, version, contributes)
 * - blocks/ (Blockly 积木块定义)
 * - generators/ (代码生成器)
 * - libraries/ (C++ 库文件)
 * - locales/ (多语言翻译)
 * 
 * 主要功能:
 * - scanExtensions: 扫描并加载所有扩展
 * - importExtension: 导入新扩展
 * - uninstallExtension: 卸载扩展
 * - loadFileFromExtension: 读取扩展内文件
 * - getExtensionLibPaths: 获取所有扩展的库路径
 * 
 * @file electron/services/ExtensionService.ts
 * @module EmbedBlocks/Electron/Services/ExtensionService
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 轻量级语义版本比较函数
 * 用于判断扩展版本是升级还是降级
 * @param v1 第一个版本号 (如 "1.2.3")
 * @param v2 第二个版本号
 * @returns 1: v1 > v2, -1: v1 < v2, 0: 相等
 */
function compareVersions(v1: string, v2: string): number {
    // 将版本字符串按 "." 分割并转为数字数组
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    // 逐位比较，缺失的位视为 0
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;  // v1 较新
        if (p1 < p2) return -1; // v1 较旧
    }
    return 0; // 版本相同
}

/** 扩展清单接口 - manifest.json 的结构定义 */
export interface ExtensionManifest {
    id: string;           // 扩展唯一标识符
    version: string;      // 版本号 (语义化版本)
    name: string;         // 扩展显示名称
    description: string;  // 扩展描述
    categories?: string[]; // 分类标签
    contributes: {        // 扩展贡献的资源
        boards?: string[];     // 板卡定义文件路径
        blocks?: string[];     // 积木块定义文件路径
        generators?: string[]; // 代码生成器文件路径
    };
}

/** 已加载的扩展信息 - 运行时扩展状态 */
export interface LoadedExtension {
    manifest: ExtensionManifest; // 扩展清单
    path: string;                // 扩展目录绝对路径
    hasBoards: boolean;          // 是否包含板卡定义
    hasBlocks: boolean;          // 是否包含积木块
    hasGenerators: boolean;      // 是否包含代码生成器
    hasLibraries: boolean;       // 是否包含 C++ 库
    languages: string[];         // 支持的语言列表 (如 ['zh', 'en'])

    // [性能优化] 缓存的文件内容，以便前端瞬间读取，消除海量 IPC 调用
    boardContents?: Record<string, string>;
    blockContents?: Record<string, string>;
    generatorContents?: Record<string, string>;
    localeContents?: Record<string, string>;
}

export class ExtensionService {
    /** 扩展存储目录 (userData/extensions) */
    private extensionsDir: string;
    /** 高速缓存文件路径 (用于提升前端启动速度) */
    private cacheFilePath: string;
    /** 已加载扩展的缓存 Map<扩展ID, 扩展信息> */
    private extensions: Map<string, LoadedExtension> = new Map();

    constructor() {
        // 设置扩展目录为 Electron userData 下的 extensions 子目录
        this.extensionsDir = path.join(app.getPath('userData'), 'extensions');
        // 初始化高速缓存文件路径
        this.cacheFilePath = path.join(this.extensionsDir, 'extensionsCache.json');

        // 如果目录不存在则创建
        if (!fs.existsSync(this.extensionsDir)) {
            fs.mkdirSync(this.extensionsDir, { recursive: true });
        }
        // 启动时扫描并加载所有扩展
        this.scanExtensions();
    }

    /**
     * 扫描扩展目录，加载所有有效扩展
     * 加入了高速缓存机制 (Cache First) 以优化启动性能
     */
    public scanExtensions() {
        this.extensions.clear(); // 清空内存缓存

        // 步骤 1: 尝试读取高速缓存文件
        if (fs.existsSync(this.cacheFilePath)) {
            try {
                const cacheContent = fs.readFileSync(this.cacheFilePath, 'utf-8');
                const cachedExtensions: LoadedExtension[] = JSON.parse(cacheContent);

                // 验证缓存是否有效 (简单验证：检查缓存里的扩展数量和目录下的文件夹数量是否大致匹配)
                const folders = fs.readdirSync(this.extensionsDir, { withFileTypes: true })
                    .filter(e => e.isDirectory());

                if (cachedExtensions.length === folders.length) {
                    // 缓存命中：将缓存数据反序列化到内存中
                    for (const ext of cachedExtensions) {
                        // 出于绝对安全考虑，确保扩展路径依然存在
                        if (fs.existsSync(ext.path)) {
                            this.extensions.set(ext.manifest.id, ext);
                        }
                    }
                    console.log(`[ExtensionService] Successfully loaded ${this.extensions.size} extensions from high-speed cache.`);

                    // 如果缓存的扩展数量和实际一致，直接返回，跳过昂贵的物理硬盘扫描
                    if (this.extensions.size === folders.length) {
                        return;
                    }
                } else {
                    console.log(`[ExtensionService] Cache invalidated (Folder count mismatch: ${folders.length} vs ${cachedExtensions.length}). Rebuilding...`);
                }
            } catch (e) {
                console.warn("[ExtensionService] Failed to read cache file, rebuilding...", e);
            }
        }

        // 步骤 2: 物理扫描与缓存重建 (Cache Miss or Invalidated)
        try {
            if (fs.existsSync(this.extensionsDir)) {
                // 遍历扩展目录下的所有子目录
                const entries = fs.readdirSync(this.extensionsDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        // 尝试深度加载每个子目录作为扩展，并读取内部所有的 JSON/JS 以备缓存
                        this.loadExtensionDeep(path.join(this.extensionsDir, entry.name));
                    }
                }

                // 步骤 3: 物理扫描完毕，将全量带有文件内容的 Payload 写入硬盘缓存
                this.buildAndSaveCache();
            }
        } catch (e) {
            console.error("[ExtensionService] Failed to scan extensions:", e);
        }
    }

    /**
     * 构建并持久化高速缓存
     * 将 this.extensions 序列化到 extensionsCache.json
     */
    private buildAndSaveCache() {
        try {
            const allExtensions = Array.from(this.extensions.values());
            fs.writeFileSync(this.cacheFilePath, JSON.stringify(allExtensions), 'utf-8');
            console.log(`[ExtensionService] Optimization cache built and saved globally for ${allExtensions.length} extensions.`);
        } catch (e) {
            console.error("[ExtensionService] Failed to write cache file:", e);
        }
    }

    /**
     * 消除旧缓存，确保下次需要时强制重构
     */
    private invalidateCache() {
        if (fs.existsSync(this.cacheFilePath)) {
            try {
                fs.unlinkSync(this.cacheFilePath);
                console.log("[ExtensionService] Stale cache invalidated successfully.");
            } catch (e) {
                console.error("[ExtensionService] Failed to invalidate cache:", e);
            }
        }
    }

    /**
     * 深度加载单个扩展 (包括读取各类清单、语言包和定义的文本内容)
     * 专为缓存预热设计
     * @param dirPath 扩展目录的绝对路径
     */
    private loadExtensionDeep(dirPath: string) {
        try {
            // 查找 manifest 文件 (优先 manifest.json，回退到 extension.json)
            let manifestPath = path.join(dirPath, 'manifest.json');
            if (!fs.existsSync(manifestPath)) {
                manifestPath = path.join(dirPath, 'extension.json');
            }
            if (!fs.existsSync(manifestPath)) return; // 没有清单文件，跳过

            // 解析 manifest.json
            const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
            const manifest: ExtensionManifest = JSON.parse(manifestContent);

            // 基本验证: 必须包含 id 和 version
            if (!manifest.id || !manifest.version) {
                console.warn(`[ExtensionService] Skipping invalid extension at ${dirPath}: missing id or version`);
                return;
            }

            // 检查是否包含 libraries 目录
            const libraryPath = path.join(dirPath, 'libraries');
            const hasLibraries = fs.existsSync(libraryPath) && fs.statSync(libraryPath).isDirectory();

            // 文件文本缓存字典 (用于存储即将被传送到前端的文件内容)
            const localeContents: Record<string, string> = {};
            const boardContents: Record<string, string> = {};
            const blockContents: Record<string, string> = {};
            const generatorContents: Record<string, string> = {};

            // 深度检测: 支持的语言并读取内容
            const languages: string[] = [];
            const localesPath = path.join(dirPath, 'locales');
            if (fs.existsSync(localesPath) && fs.statSync(localesPath).isDirectory()) {
                const langFiles = fs.readdirSync(localesPath);
                for (const file of langFiles) {
                    if (file.endsWith('.json')) {
                        const langCode = file.replace('.json', '');
                        languages.push(langCode);
                        // [深度预读] 缓存语言文件内容
                        try {
                            localeContents[`locales/${file}`] = fs.readFileSync(path.join(localesPath, file), 'utf-8');
                        } catch (e) {
                            console.warn(`[ExtensionService] Failed to read locale file ${file} for ${manifest.id}`);
                        }
                    }
                }
            }

            // [深度预读] 循环预读所有的 boards (板卡) 定义
            if (manifest.contributes?.boards) {
                for (const boardFile of manifest.contributes.boards) {
                    try {
                        const fp = path.join(dirPath, boardFile);
                        if (fs.existsSync(fp)) boardContents[boardFile] = fs.readFileSync(fp, 'utf-8');
                    } catch (e) {
                        console.warn(`[ExtensionService] Failed to cache board ${boardFile} for ${manifest.id}`);
                    }
                }
            }

            // [深度预读] 循环预读所有的 blocks (积木) 定义
            if (manifest.contributes?.blocks) {
                for (const blockFile of manifest.contributes.blocks) {
                    try {
                        const fp = path.join(dirPath, blockFile);
                        if (fs.existsSync(fp)) blockContents[blockFile] = fs.readFileSync(fp, 'utf-8');
                    } catch (e) {
                        console.warn(`[ExtensionService] Failed to cache block ${blockFile} for ${manifest.id}`);
                    }
                }
            }

            // [深度预读] 循环预读所有的 generators (代码生成器) 定义
            if (manifest.contributes?.generators) {
                for (const genFile of manifest.contributes.generators) {
                    try {
                        const fp = path.join(dirPath, genFile);
                        if (fs.existsSync(fp)) generatorContents[genFile] = fs.readFileSync(fp, 'utf-8');
                    } catch (e) {
                        console.warn(`[ExtensionService] Failed to cache generator ${genFile} for ${manifest.id}`);
                    }
                }
            }

            // 构建带有全量缓存的最终扩展对象
            const loadedExt: LoadedExtension = {
                manifest,
                path: dirPath,
                hasBoards: !!(manifest.contributes?.boards?.length),
                hasBlocks: !!(manifest.contributes?.blocks?.length),
                hasGenerators: !!(manifest.contributes?.generators?.length),
                hasLibraries,
                languages,
                // 将预读取的值挂载上来
                localeContents,
                boardContents,
                blockContents,
                generatorContents
            };

            // 注册到内存缓存
            this.extensions.set(manifest.id, loadedExt);
            console.log(`[ExtensionService] Loaded and deeply cached extension: ${manifest.id} (${manifest.name})`);

        } catch (e) {
            console.error(`[ExtensionService] Error loading extension at ${dirPath}:`, e);
        }
    }

    /** 获取所有已加载的扩展列表 */
    public getExtensions(): LoadedExtension[] {
        return Array.from(this.extensions.values());
    }

    /**
     * 获取所有扩展的库路径
     * 用于编译时注入 PLATFORMIO_LIB_EXTRA_DIRS
     * @returns 扩展库目录路径数组
     */
    public getExtensionLibPaths(): string[] {
        const paths: string[] = [];
        this.extensions.forEach(ext => {
            if (ext.hasLibraries) {
                paths.push(path.join(ext.path, 'libraries'));
            }
        });
        return paths;
    }

    /**
     * 从扩展中读取文件内容
     * @param extId 扩展 ID
     * @param relativePath 相对于扩展目录的文件路径
     * @param encoding 文件编码，默认 utf-8
     * @returns 文件内容，或文件不存在时返回 null
     */
    public async loadFileFromExtension(extId: string, relativePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string | null> {
        const ext = this.extensions.get(extId);
        if (!ext) return null;

        const fullPath = path.join(ext.path, relativePath);
        // 安全检查: 确保访问的文件在扩展目录内，防止路径穿越攻击
        if (!fullPath.startsWith(ext.path)) {
            console.warn(`Security Warning: Attempted to access file outside extension: ${fullPath}`);
            return null;
        }

        try {
            if (fs.existsSync(fullPath)) {
                return fs.readFileSync(fullPath, encoding);
            }
        } catch (e) {
            console.error(`Failed to read extension file: ${fullPath}`, e);
        }
        return null;
    }

    /**
     * 导入扩展
     * @param sourcePath 扩展源目录路径
     * @param force 是否强制导入 (允许降级)
     * @returns 导入结果，包含状态、版本信息等
     */
    public async importExtension(sourcePath: string, force: boolean = false): Promise<{ success: boolean, message: string, extensionId?: string, status?: 'ok' | 'downgrade' | 'error', currentVersion?: string, newVersion?: string, actualSourcePath?: string }> {
        try {
            // 检查源路径是否存在
            if (!fs.existsSync(sourcePath)) {
                return { success: false, message: 'Source path does not exist' };
            }

            // 查找 manifest 文件
            let manifestPath = path.join(sourcePath, 'manifest.json');
            if (!fs.existsSync(manifestPath)) {
                // 回退到旧版文件名
                manifestPath = path.join(sourcePath, 'extension.json');
            }

            if (!fs.existsSync(manifestPath)) {
                // 智能文件夹检测: 处理用户选择了包裹文件夹的情况
                // 例如: 'download/my-plugin-v1/my-plugin/manifest.json'
                try {
                    const subEntries = await fs.promises.readdir(sourcePath, { withFileTypes: true });
                    const dirs = subEntries.filter(e => e.isDirectory() && !e.name.startsWith('.'));

                    // 如果只有一个子目录，检查其中是否有 manifest
                    if (dirs.length === 1) {
                        const nestedPath = path.join(sourcePath, dirs[0].name);
                        const nestedManifest = path.join(nestedPath, 'manifest.json');
                        if (fs.existsSync(nestedManifest)) {
                            console.log(`[Smart Import] Detected nested extension at: ${nestedPath}`);
                            sourcePath = nestedPath; // 重写源路径
                            manifestPath = nestedManifest;
                        }
                    }
                } catch (e) {
                    console.log("[Smart Import] Scanning failed, ignoring fallback.");
                }
            }

            // 最终检查: manifest 必须存在
            if (!fs.existsSync(manifestPath)) {
                return { success: false, message: 'Invalid extension: manifest.json missing (checked root and 1-level deep)' };
            }

            // 解析 manifest
            const manifestContent = await fs.promises.readFile(manifestPath, 'utf-8');
            let manifest: ExtensionManifest;
            try {
                manifest = JSON.parse(manifestContent);
            } catch (e) {
                return { success: false, message: 'Invalid manifest format' };
            }

            // id 字段必须存在
            if (!manifest.id) {
                return { success: false, message: 'Extension manifest missing "id"' };
            }

            // 目标安装目录
            const targetDir = path.join(this.extensionsDir, manifest.id);
            if (fs.existsSync(targetDir)) {
                // 检查版本：防止意外降级
                const currentExt = this.extensions.get(manifest.id);
                if (currentExt && !force) {
                    const comparison = compareVersions(manifest.version, currentExt.manifest.version);
                    if (comparison < 0) {
                        // 检测到降级，返回警告让用户确认
                        return {
                            success: false,
                            status: 'downgrade',
                            message: `Downgrade detected: v${currentExt.manifest.version} -> v${manifest.version}`,
                            extensionId: manifest.id,
                            currentVersion: currentExt.manifest.version,
                            newVersion: manifest.version,
                            actualSourcePath: sourcePath // 返回路径以便前端重试 force
                        };
                    }
                }

                // 删除旧版本
                await fs.promises.rm(targetDir, { recursive: true, force: true });
            }

            // 异步复制扩展文件
            // 注: fs.promises.cp 需要 Node 16.7+
            if (fs.promises.cp) {
                await fs.promises.cp(sourcePath, targetDir, { recursive: true });
            } else {
                // 回退处理 (Electron 通常包含较新的 Node)
                await (fs.promises as any).cp(sourcePath, targetDir, { recursive: true });
            }

            // 重新扫描扩展列表前，先报废过期的旧缓存以确保拿到最新的插件状态
            this.invalidateCache();
            this.scanExtensions();
            return { success: true, status: 'ok', message: `Extension ${manifest.name} imported successfully!`, extensionId: manifest.id };

        } catch (e: any) {
            return { success: false, message: `Import failed: ${e.message}` };
        }
    }

    /**
     * 卸载扩展
     * @param extId 要卸载的扩展 ID
     * @returns 卸载结果
     */
    public async uninstallExtension(extId: string): Promise<{ success: boolean, message: string, extensionId?: string }> {
        const ext = this.extensions.get(extId);
        if (!ext) {
            return { success: false, message: 'Extension not found' };
        }

        try {
            // 安全检查: 确保只能删除 extensions 目录内的扩展
            if (!ext.path.startsWith(this.extensionsDir)) {
                return { success: false, message: 'Cannot delete built-in or external extension' };
            }

            // 删除扩展目录
            await fs.promises.rm(ext.path, { recursive: true, force: true });
            // 从缓存中移除
            this.extensions.delete(extId);
            // 刷新内部状态前抹除过期的高速缓存
            this.invalidateCache();
            this.scanExtensions();
            return { success: true, message: `Extension ${ext.manifest.name} uninstalled.` };
        } catch (e: any) {
            console.error(`Uninstall failed for ${extId}:`, e);
            return { success: false, message: `Uninstall failed: ${e.message}` };
        }
    }
}

/** 导出单例服务实例 */
export const extensionService = new ExtensionService();
