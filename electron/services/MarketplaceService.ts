/**
 * ============================================================
 * 插件市场服务 (Marketplace Service)
 * ============================================================
 * 
 * 负责从远程市场源获取和安装扩展。
 * 支持 GitHub 等平台的插件仓库。
 * 
 * 工作流程:
 * 1. fetchMarketplace: 从 URL 获取插件列表 (marketplace.json)
 * 2. installExtension: 下载 ZIP、解压、通过 ExtensionService 安装
 * 3. getCachedIcon: 缓存插件图标以提高性能
 * 
 * 市场 URL 支持:
 * - 直接的 raw JSON URL
 * - GitHub 仓库 URL (自动转换为 raw.githubusercontent.com)
 * 
 * @file electron/services/MarketplaceService.ts
 * @module EmbedBlocks/Electron/Services/MarketplaceService
 */

import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { extensionService } from './ExtensionService';
import { configService } from './ConfigService';

/** 市场扩展信息 - marketplace.json 中的单个扩展 */
export interface MarketplaceExtension {
    id: string;          // 扩展唯一 ID
    version: string;     // 版本号
    name: string;        // 显示名称
    description: string; // 描述
    icon?: string;       // 图标 URL (可选)
    downloadUrl: string; // ZIP 下载地址
    author?: string;     // 作者 (可选)
}

/** 市场清单 - marketplace.json 根结构 */
export interface MarketplaceManifest {
    extensions: MarketplaceExtension[]; // 扩展列表
}

export class MarketplaceService {
    /** 临时目录 - 用于下载和解压扩展 */
    private tempDir: string;

    constructor() {
        // 初始化临时目录
        this.tempDir = path.join(app.getPath('temp'), 'embedblocks-marketplace');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * 从 URL 获取 JSON 数据
     * @param url 目标 URL
     * @returns 解析后的 JSON 对象
     */
    private fetchJson(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to fetch JSON: status code ${res.statusCode}`));
                    return;
                }

                // 累积响应数据
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse JSON response'));
                    }
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * 规范化市场 URL
     * 将 GitHub 仓库 URL 转换为 raw.githubusercontent.com 格式
     * @param url 原始 URL
     * @returns 规范化后的 URL
     */
    private normalizeUrl(url: string): string {
        let cleanUrl = url.trim();
        // 处理 GitHub 链接: 转换为 raw 内容 URL
        if (cleanUrl.includes('github.com') && !cleanUrl.includes('raw.githubusercontent.com')) {
            if (!cleanUrl.endsWith('.json')) {
                // 假设是仓库链接，默认指向 main 分支的 marketplace.json
                cleanUrl = cleanUrl.replace('github.com', 'raw.githubusercontent.com')
                    .replace(/\/$/, '') // 移除尾部斜杠
                    + '/main/marketplace.json';
            } else {
                // 转换 blob 链接为 raw 链接
                cleanUrl = cleanUrl.replace('github.com', 'raw.githubusercontent.com')
                    .replace('/blob/', '/');
            }
        }
        return cleanUrl;
    }

    /**
     * 从市场 URL 获取扩展列表
     * @param url 市场 URL
     * @returns 扩展信息数组
     */
    public async fetchMarketplace(url: string): Promise<MarketplaceExtension[]> {
        const targetUrl = this.normalizeUrl(url);
        try {
            const manifest = await this.fetchJson(targetUrl) as MarketplaceManifest;
            if (manifest && Array.isArray(manifest.extensions)) {
                return manifest.extensions;
            }
            return [];
        } catch (e) {
            console.error(`Failed to fetch marketplace from ${targetUrl}:`, e);
            throw e;
        }
    }

    /**
     * 安装远程市场扩展
     * @param ext 扩展信息
     * @param force 是否强制安装 (允许降级)
     * @returns 安装结果
     */
    public async installExtension(ext: MarketplaceExtension, force: boolean = false): Promise<{ success: boolean, message: string, status?: string, currentVersion?: string, newVersion?: string }> {
        const downloadUrl = ext.downloadUrl;
        const targetZip = path.join(this.tempDir, `${ext.id}.zip`);
        const targetExtractDir = path.join(this.tempDir, ext.id);

        try {
            // 1. 下载 ZIP 文件
            await this.downloadFile(downloadUrl, targetZip);

            // 2. 解压 ZIP
            // 注意: 没有内置 ZIP 库，使用系统工具
            if (process.platform === 'win32') {
                // Windows: 使用 PowerShell Expand-Archive
                const { execSync } = require('child_process');
                if (fs.existsSync(targetExtractDir)) fs.rmSync(targetExtractDir, { recursive: true, force: true });
                fs.mkdirSync(targetExtractDir, { recursive: true });
                execSync(`powershell -command "Expand-Archive -Path '${targetZip}' -DestinationPath '${targetExtractDir}' -Force"`);
            } else {
                // Linux/Mac: 使用 unzip 命令
                const { execSync } = require('child_process');
                if (fs.existsSync(targetExtractDir)) fs.rmSync(targetExtractDir, { recursive: true, force: true });
                fs.mkdirSync(targetExtractDir, { recursive: true });
                execSync(`unzip -o "${targetZip}" -d "${targetExtractDir}"`);
            }

            // 3. 查找扩展根目录 (ZIP 可能包含子文件夹)
            const sourcePath = await this.findExtensionRoot(targetExtractDir);
            if (!sourcePath) {
                return { success: false, message: 'Invalid extension ZIP: manifest.json not found' };
            }

            // 4. 通过 ExtensionService 安装
            const result = await extensionService.importExtension(sourcePath, force);

            // 5. 清理临时文件
            fs.rmSync(targetZip, { force: true });
            fs.rmSync(targetExtractDir, { recursive: true, force: true });

            return result;
        } catch (e: any) {
            return { success: false, message: `Installation failed: ${e.message}` };
        }
    }

    /**
     * 下载文件
     * 支持 301/302 重定向 (GitHub 常用)
     * @param url 下载 URL
     * @param targetPath 保存路径
     */
    private downloadFile(url: string, targetPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(targetPath);
            const request = https.get(url, (response) => {
                if (response.statusCode !== 200 && response.statusCode !== 302 && response.statusCode !== 301) {
                    reject(new Error(`Failed to download file: status code ${response.statusCode}`));
                    return;
                }

                // 处理 301/302 重定向 (GitHub 常见)
                if (response.statusCode === 302 || response.statusCode === 301) {
                    const nextUrl = response.headers.location;
                    if (nextUrl) {
                        // 递归跟随重定向
                        this.downloadFile(nextUrl, targetPath).then(resolve).catch(reject);
                        return;
                    }
                }

                // 将响应写入文件
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                // 下载失败，清理临时文件
                fs.unlink(targetPath, () => { });
                reject(err);
            });
        });
    }

    /**
     * 递归查找扩展根目录
     * ZIP 可能包含子文件夹，需要找到包含 manifest.json 的目录
     * @param dir 开始搜索的目录
     * @returns 扩展根目录路径，找不到则返回 null
     */
    private async findExtensionRoot(dir: string): Promise<string | null> {
        const files = fs.readdirSync(dir);
        // 检查当前目录是否包含 manifest
        if (files.includes('manifest.json') || files.includes('extension.json')) {
            return dir;
        }
        // 递归搜索子目录
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                const found = await this.findExtensionRoot(fullPath);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * 获取并缓存图标
     * 下载远程图标并缓存到本地，返回 Base64 数据
     * @param url 图标 URL
     * @returns Base64 编码的 Data URL，失败则返回 null
     */
    public async getCachedIcon(url: string): Promise<string | null> {
        if (!url) return null;

        // 在 userData 中创建持久化缓存目录
        const cacheDir = path.join(app.getPath('userData'), 'icon-cache');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        // 生成安全的文件名 (使用 Base64 编码 URL)
        const safeName = Buffer.from(url).toString('base64').replace(/[\/\+=]/g, '_') + path.extname(url);
        const cachePath = path.join(cacheDir, safeName);

        try {
            // 检查缓存
            if (fs.existsSync(cachePath)) {
                return this.readFileAsBase64(cachePath);
            }

            // 下载并缓存
            await this.downloadFile(url, cachePath);
            return this.readFileAsBase64(cachePath);
        } catch (e) {
            console.error(`Failed to cache icon from ${url}:`, e);
            return null;
        }
    }

    /**
     * 读取文件并转换为 Base64 Data URL
     * @param filePath 文件路径
     * @returns Data URL 格式的字符串
     */
    private readFileAsBase64(filePath: string): string {
        const bitmap = fs.readFileSync(filePath);
        // 根据扩展名确定 MIME 类型
        const ext = path.extname(filePath).toLowerCase();
        let mime = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        if (ext === '.svg') mime = 'image/svg+xml';
        if (ext === '.gif') mime = 'image/gif';
        return `data:${mime};base64,${bitmap.toString('base64')}`;
    }
}

/** 导出单例服务实例 */
export const marketplaceService = new MarketplaceService();
