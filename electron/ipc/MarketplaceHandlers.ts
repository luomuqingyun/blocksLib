/**
 * ============================================================
 * 插件市场 IPC 处理器 (Marketplace IPC Handlers)
 * ============================================================
 * 
 * 处理与远程插件市场相关的所有 IPC 请求:
 * - marketplace:list-urls   列出已配置的市场 URL
 * - marketplace:add-url     添加新市场源
 * - marketplace:remove-url  移除市场源
 * - marketplace:fetch-remote 获取远程插件列表
 * - marketplace:install     安装远程插件
 * - marketplace:get-cached-icon 获取缓存的插件图标
 * 
 * 市场 URL 存储在 config.extensions.marketplaces 配置项中
 * 
 * @file electron/ipc/MarketplaceHandlers.ts
 * @module EmbedBlocks/Electron/IPC/MarketplaceHandlers
 */

import { IpcMain } from 'electron';
import { marketplaceService, MarketplaceExtension } from '../services/MarketplaceService';
import { configService } from '../services/ConfigService';

/** 注册所有插件市场相关的 IPC 处理器 */
export function registerMarketplaceHandlers(ipcMain: IpcMain) {

    // 获取已配置的市场 URL 列表
    ipcMain.handle('marketplace:list-urls', () => {
        return configService.get('extensions.marketplaces') || [];
    });

    // 添加新的市场源 URL
    ipcMain.handle('marketplace:add-url', (_, url: string) => {
        const current = configService.get('extensions.marketplaces') || [];
        if (!current.includes(url)) {
            configService.set('extensions.marketplaces', [...current, url]);
        }
        return true;
    });

    // 移除市场源 URL
    ipcMain.handle('marketplace:remove-url', (_, url: string) => {
        const current = configService.get('extensions.marketplaces') || [];
        configService.set('extensions.marketplaces', current.filter((u: string) => u !== url));
        return true;
    });

    // 从远程市场获取扩展列表
    ipcMain.handle('marketplace:fetch-remote', async (_, url: string) => {
        return await marketplaceService.fetchMarketplace(url);
    });

    // 安装远程市场扩展
    ipcMain.handle('marketplace:install', async (_, ext: MarketplaceExtension, force: boolean = false) => {
        return await marketplaceService.installExtension(ext, force);
    });

    // 获取缓存的插件图标 (Base64 Data URL)
    ipcMain.handle('marketplace:get-cached-icon', async (_, url: string) => {
        return await marketplaceService.getCachedIcon(url);
    });
}
