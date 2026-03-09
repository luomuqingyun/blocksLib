/**
 * ============================================================
 * 配置管理服务 (Config Service)
 * ============================================================
 * 
 * 负责应用配置的读取、保存和迁移。
 * 配置文件存储在 Electron 的 userData 目录下 (config.json)
 * 
 * 配置结构 (AppConfig):
 * - general: 通用设置 (语言、工作目录、最近项目)
 * - serialSettings: 串口监视器设置 (波特率、历史记录等)
 * - toolbox: 工具箱设置 (隐藏的分类)
 * - extensions: 扩展设置 (插件市场 URL)
 * 
 * 主要功能:
 * - get/set: 读写配置项 (支持点号路径如 'general.language')
 * - loadConfig: 加载配置并执行版本迁移
 * - restoreDefaults: 恢复默认设置
 * - addRecentProject: 添加最近打开的项目
 * - validateRecentProjects: 清理无效的最近项目
 * 
 * @file electron/services/ConfigService.ts
 * @module EmbedBlocks/Electron/Services/ConfigService
 */

import { app, shell, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

/** 应用配置接口 */
export interface AppConfig {
    general: {
        workDir: string;                   // 工作目录
        language: string;                  // 界面语言
        autoCleanNoMatchRecent?: boolean;  // 自动清理不存在的最近项目
        projectHistoryLimit?: number;      // 最近项目列表上限
        recentProjects: string[];          // 最近打开的项目路径
        favoriteLimit?: number;            // 常用板卡收藏上限
        favoriteBoardsCache?: any[];       // 收藏板卡的数据缓存，用于秒开预览
        lastOpenDir?: string;              // 上次打开项目的目录
    };
    serialSettings: {
        baudRate: number;                  // 波特率
        dataBits: number;                  // 数据位
        stopBits: number;                  // 停止位
        parity: string;                    // 校验位
        hexDisplay: boolean;               // 十六进制显示
        hexSend: boolean;                  // 十六进制发送
        lineEnding?: string;               // 行尾符
        enterSends?: boolean;              // 回车发送
        clearInputOnSend?: boolean;        // 发送后清空输入框
        mergeIncomplete?: boolean;         // 合并不完整行
        historyDeduplication?: boolean;    // 历史记录去重
        inputSpellCheck?: boolean;         // 输入拼写检查
        lastPort?: string;                 // 上次使用的端口
        serialHistory: string[];           // 串口发送历史
        historyLimit: number;              // 历史记录上限
    };
    toolbox?: {
        hiddenCategories: string[];        // 隐藏的工具箱分类
    };
    extensions?: {
        marketplaces: string[];            // 插件市场 URL 列表
    };
    ai?: {
        apiKey?: string;                   // AI API Key (加密存储)
        baseUrl?: string;                  // API 代理地址
        model?: string;                    // 默认模型
        provider?: string;                 // 服务商 (如 deepseek, google)
    };
}


export class ConfigService {
    /** 配置文件路径 (userData/config.json) */
    private configPath: string;
    /** 当前配置对象 */
    private config: AppConfig;

    constructor() {
        // 配置文件位于 Electron userData 目录
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        // 加载配置 (包含版本迁移)
        this.config = this.loadConfig();
    }

    /**
     * 加载配置文件
     * 包含版本迁移逻辑，确保旧版配置可以正确升级
     */
    private loadConfig(): AppConfig {
        if (!fs.existsSync(this.configPath)) {
            return this.loadDefaults();
        }
        try {
            const data = fs.readFileSync(this.configPath, 'utf8');
            let userConfig = JSON.parse(data);

            // --- 配置迁移 ---

            // 1. 将最近项目记录数限制 (projectHistoryLimit) 统一迁移到 general 目录下
            if ('projectHistoryLimit' in userConfig) {
                if (!userConfig.general) userConfig.general = {};
                userConfig.general.projectHistoryLimit = userConfig.projectHistoryLimit;
                delete userConfig.projectHistoryLimit;
            }
            // 2. 字段重命名：清理逻辑中的 autoCleanInvalidRecent 更新为 autoCleanNoMatchRecent
            if (userConfig.general && 'autoCleanInvalidRecent' in userConfig.general) {
                userConfig.general.autoCleanNoMatchRecent = userConfig.general.autoCleanInvalidRecent;
                delete userConfig.general.autoCleanInvalidRecent;
            }

            // 3. 将最近项目列表 (recentProjects) 移至 general 目录下，保持结构清晰
            if ('recentProjects' in userConfig) {
                if (!userConfig.general) userConfig.general = {};
                userConfig.general.recentProjects = userConfig.recentProjects;
                delete userConfig.recentProjects;
            }

            // 4. 将串口相关的历史记录与上限字段归并到 serialSettings 结构中
            if (!userConfig.serialSettings) userConfig.serialSettings = {};

            if ('serialHistory' in userConfig) {
                userConfig.serialSettings.serialHistory = userConfig.serialHistory;
                delete userConfig.serialHistory;
            }
            if ('historyLimit' in userConfig) {
                userConfig.serialSettings.historyLimit = userConfig.historyLimit;
                delete userConfig.historyLimit;
            }

            // 5. 清理旧版冗余及错误命名的字段
            if (userConfig.serialSettings && 'sendNewline' in userConfig.serialSettings) {
                delete userConfig.serialSettings.sendNewline;
            }

            // 将默认配置与用户现有配置进行深度合并，确保新增字段始终存在
            const defaults = this.loadDefaults();
            const result = this.deepMerge(defaults, userConfig);

            // 最终格式校验 (针对根级冗余)
            delete (result as any).recentProjects;
            delete (result as any).serialHistory;
            delete (result as any).historyLimit;
            delete (result as any).settings;

            return result;
        } catch (e) {
            console.error('[ConfigService] Failed to load config, using defaults:', e);
            return this.loadDefaults();
        }
    }

    /**
     * --- 安全存储：敏感信息解密 ---
     * 使用 Electron 的 safeStorage API 将存储在 config.json 中的加密十六进制字符串还原。
     * 必须在 app.whenReady() 之后调用。
     */
    public decryptSensitiveData(): void {
        if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
            console.warn('[ConfigService] safeStorage is not available for decryption.');
            return;
        }

        try {
            if (this.config.ai && this.config.ai.apiKey && this.config.ai.apiKey.startsWith('encrypted:')) {
                const encryptedHex = this.config.ai.apiKey.replace('encrypted:', '');
                const decrypted = safeStorage.decryptString(Buffer.from(encryptedHex, 'hex'));
                this.config.ai.apiKey = decrypted;
                console.log('[ConfigService] Sensitive data decrypted successfully.');
            }
        } catch (e) {
            console.error('[ConfigService] Failed to decrypt API Key:', e);
        }
    }

    /** 加载默认配置 */
    private loadDefaults(): any {
        // [核心增强] 尝试从注册表读取安装时设置的工作目录 (仅限 Windows)
        let initialWorkDir = app.getPath('documents');
        const regPath = this.getRegistryWorkspacePath();
        if (regPath && fs.existsSync(regPath)) {
            console.log('[ConfigService] Detected workspace from registry:', regPath);
            initialWorkDir = regPath;
        }

        const defaults: any = {
            general: {
                language: 'system',                 // 系统语言
                workDir: initialWorkDir,            // 默认工作目录
                autoCleanNoMatchRecent: false,
                projectHistoryLimit: 10,
                favoriteLimit: 10,              // 收藏板卡上限
                recentProjects: [],
                favoriteBoardsCache: [],         // 收藏板卡数据缓存
                lastOpenDir: initialWorkDir      // 上次打开项目的目录
            },
            serialSettings: {
                baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none',
                hexDisplay: false, hexSend: false,
                enterSends: true, lastPort: '',
                historyLimit: 100,
                mergeIncomplete: true,              // 默认启用不完整行合并
                serialHistory: []
            },
            advanced: {
                clearHistoryOnRestore: false        // 恢复默认时是否清除历史
            },
            toolbox: {
                hiddenCategories: []
            },
            extensions: {
                marketplaces: [
                    'https://raw.githubusercontent.com/luomuqingyun/blocksLib/main/marketplace.json'
                ]
            }
        };
        return defaults;
    }

    /**
     * 深度合并对象
     * 用于将用户配置与默认配置合并
     */
    private deepMerge(target: any, source: any): any {
        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) Object.assign(output, { [key]: source[key] });
                    else output[key] = this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    /** 判断是否为对象 (非数组) */
    private isObject(item: any) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    /**
     * 保存配置到硬盘 (config.json)
     * 在写入之前，会执行两项关键操作：1. 瘦身常用数据缓存；2. 对敏感信息进行加密。
     */
    private isSaving = false;
    private pendingSave = false;

    /**
     * 保存配置到硬盘 (config.json)
     * 使用异步写入，防止阻塞主线程
     */
    private async saveConfig(config: AppConfig = this.config) {
        // 如果正在写入，标记有新的待写入内容并退出
        if (this.isSaving) {
            this.pendingSave = true;
            return;
        }

        this.isSaving = true;
        try {
            // 制作一份副本用于保存
            const saveObj = JSON.parse(JSON.stringify(config));

            // 1. 结构优化
            if (saveObj.serialSettings && saveObj.serialSettings.serialHistory) {
                const { serialHistory, ...rest } = saveObj.serialSettings;
                saveObj.serialSettings = { ...rest, serialHistory } as any;
            }

            // 2. 性能与体积优化
            if (saveObj.general && saveObj.general.favoriteBoardsCache) {
                saveObj.general.favoriteBoardsCache = saveObj.general.favoriteBoardsCache.map((board: any) => ({
                    id: board.id,
                    name: board.name,
                    _isPruned: true
                }));
            }

            // 3. 安全加固
            if (saveObj.ai && saveObj.ai.apiKey && safeStorage.isEncryptionAvailable()) {
                try {
                    if (!saveObj.ai.apiKey.startsWith('encrypted:')) {
                        const encrypted = safeStorage.encryptString(saveObj.ai.apiKey);
                        saveObj.ai.apiKey = `encrypted:${encrypted.toString('hex')}`;
                    }
                } catch (e) {
                    console.error('[ConfigService] 加密 API Key 失败:', e);
                }
            }

            // 执行异步物理写入
            await fs.promises.writeFile(this.configPath, JSON.stringify(saveObj, null, 2));
            // console.log('[ConfigService] Config saved asynchronously.');
        } catch (e) {
            console.error("配置文件保存失败:", e);
        } finally {
            this.isSaving = false;
            // 如果在写入期间有新的请求，立即再次触发写入
            if (this.pendingSave) {
                this.pendingSave = false;
                this.saveConfig();
            }
        }
    }

    /**
     * 获取配置项
     * 支持点号路径，如 'general.language'
     * @param key 配置键，不传则返回整个配置
     */
    public get(key?: string): any {
        if (!key) return this.config;
        if (key.includes('.')) {
            const keys = key.split('.');
            let result: any = this.config;
            for (const k of keys) {
                if (result) result = result[k];
            }
            return result;
        }
        return (this.config as any)[key];
    }

    /**
     * 设置配置项
     * 支持点号路径，如 'general.language'
     * @param key 配置键
     * @param value 配置值
     */
    public set(key: string, value: any): void {
        if (key === 'serialSettings') {
            // 特殊处理: 防止前端保存部分设置时覆盖历史记录
            const existing = this.config.serialSettings || {};
            const incoming = value || {};
            this.config.serialSettings = {
                ...existing,
                ...incoming,
                // 显式保留历史/限制 (如果传入了则允许覆盖)
                serialHistory: incoming.serialHistory !== undefined ? incoming.serialHistory : (existing.serialHistory || []),
                historyLimit: incoming.historyLimit !== undefined ? incoming.historyLimit : (existing.historyLimit || 100)
            };
        } else if (key.includes('.')) {
            // 支持点号路径
            const keys = key.split('.');
            let target: any = this.config;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!target[keys[i]]) target[keys[i]] = {}; // 自动创建缺失的层级
                target = target[keys[i]];
            }
            target[keys[keys.length - 1]] = value;
        } else {
            (this.config as any)[key] = value;
        }

        // 强制执行所有限制
        this.enforceLimits();

        this.saveConfig();
    }

    /**
     * 强制执行数值限制和数组长度限制
     * 确保数据严格遵守配置文件定义的上限
     */
    private enforceLimits(): void {
        const gen = this.config.general;
        const ser = this.config.serialSettings;

        // 1. 最近项目记录限制
        if (gen) {
            const histLimit = Math.max(1, Math.min(50, Number(gen.projectHistoryLimit) || 10));
            gen.projectHistoryLimit = histLimit;
            if (gen.recentProjects && gen.recentProjects.length > histLimit) {
                // 最近项目是 unshift 进去的，保留前面的 (最新的)
                gen.recentProjects = gen.recentProjects.slice(0, histLimit);
            }

            // 2. 收藏板卡上限
            const favLimit = Math.max(1, Math.min(50, Number(gen.favoriteLimit) || 10));
            gen.favoriteLimit = favLimit;
            if (gen.favoriteBoardsCache && gen.favoriteBoardsCache.length > favLimit) {
                // 收藏是 push 进去的，保留后面的 (最新的)
                gen.favoriteBoardsCache = gen.favoriteBoardsCache.slice(-favLimit);
            }
        }

        // 3. 串口发送历史上限
        if (ser) {
            const serLimit = Math.max(10, Math.min(1000, Number(ser.historyLimit) || 100));
            ser.historyLimit = serLimit;
            if (ser.serialHistory && ser.serialHistory.length > serLimit) {
                // 串口历史是 push 进去的，保留后面的 (最新的)
                ser.serialHistory = ser.serialHistory.slice(-serLimit);
            }
        }
    }

    /**
     * 更新串口发送历史记录
     * @param history 新的历史记录数组
     * @returns 截断后的历史记录
     */
    public updateSerialHistory(history: string[]): string[] {
        const limit = this.config.serialSettings.historyLimit || 100;
        this.config.serialSettings.serialHistory = history.slice(-limit);
        this.saveConfig();
        return this.config.serialSettings.serialHistory;
    }

    /**
     * 添加最近打开的项目
     * @param projectPath 项目路径
     * @returns 更新后的最近项目列表
     */
    public addRecentProject(projectPath: string): string[] {
        const limit = this.config.general.projectHistoryLimit || 10;
        let recent = this.config.general.recentProjects || [];
        // 如果已存在，移除后重新添加到头部
        recent = recent.filter((p: string) => p !== projectPath);
        recent.unshift(projectPath);
        this.config.general.recentProjects = recent.slice(0, limit);
        this.saveConfig();
        return this.config.general.recentProjects;
    }

    /** 获取最近打开的项目列表 */
    public getRecentProjects(): string[] {
        return this.config.general.recentProjects || [];
    }

    /**
     * 恢复默认设置
     * @param section 指定恢复的部分，不传则恢复全部
     * @param clearHistory 是否清除历史记录
     */
    public restoreDefaults(section?: string, clearHistory: boolean = false): AppConfig {
        const defaults = this.loadDefaults();
        if (section && section in defaults) {
            (this.config as any)[section] = JSON.parse(JSON.stringify(defaults[section]));
        } else {
            if (clearHistory) {
                this.config = JSON.parse(JSON.stringify(defaults));
            } else {
                // 保留历史记录
                const serialHistory = this.config.serialSettings.serialHistory;
                const recentProjects = this.config.general.recentProjects;

                this.config = JSON.parse(JSON.stringify(defaults));

                if (this.config.serialSettings) this.config.serialSettings.serialHistory = serialHistory;
                if (this.config.general) this.config.general.recentProjects = recentProjects;
            }
        }
        this.saveConfig();
        return this.config;
    }

    /** 在文件管理器中打开配置目录 */
    public openConfigDir(): void {
        shell.showItemInFolder(this.configPath);
    }

    /** 获取完整配置对象 */
    public getConfig(): AppConfig {
        return this.config;
    }

    /**
     * 验证最近项目列表
     * 如果启用了自动清理，则移除不存在的项目
     */
    public validateRecentProjects(): void {
        if (!this.config.general.autoCleanNoMatchRecent) return;

        const current = this.config.general.recentProjects || [];
        const valid = current.filter(p => fs.existsSync(p));

        if (valid.length !== current.length) {
            this.config.general.recentProjects = valid;
            this.saveConfig();
        }
    }

    /**
     * 从最近项目列表中移除指定项目
     * @param pathToRemove 要移除的项目路径
     */
    public removeRecentProject(pathToRemove: string): void {
        const current = this.config.general.recentProjects || [];
        this.config.general.recentProjects = current.filter(p => p !== pathToRemove);
        this.saveConfig();
    }

    /**
     * [核心辅助] 从注册表读取安装时设置的路径
     * 用于 Windows 平台的安装后首次启动配置
     */
    private getRegistryWorkspacePath(): string | null {
        if (process.platform !== 'win32') return null;
        try {
            // 使用 reg query 查询之前 installer.nsh 写入的路径
            const cmd = 'reg query "HKCU\\Software\\EmbedBlocks" /v WorkspacePath';
            const output = execSync(cmd, { encoding: 'utf8', timeout: 2000 });

            // 解析输出格式: WorkspacePath    REG_SZ    C:\Users\...\xxx
            const match = /WorkspacePath\s+REG_SZ\s+(.*)/.exec(output);
            if (match && match[1]) {
                const result = match[1].trim();
                return result;
            }
        } catch (e) {
            // 正常现象：如果键不存在，reg query 会抛出错误
        }
        return null;
    }
}

/** 导出单例服务实例 */
export const configService = new ConfigService();
