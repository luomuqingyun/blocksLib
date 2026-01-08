import { IpcMain } from 'electron';
import { marketplaceService, MarketplaceExtension } from '../services/MarketplaceService';
import { configService } from '../services/ConfigService';

export function registerMarketplaceHandlers(ipcMain: IpcMain) {

    ipcMain.handle('marketplace:list-urls', () => {
        return configService.get('extensions.marketplaces') || [];
    });

    ipcMain.handle('marketplace:add-url', (_, url: string) => {
        const current = configService.get('extensions.marketplaces') || [];
        if (!current.includes(url)) {
            configService.set('extensions.marketplaces', [...current, url]);
        }
        return true;
    });

    ipcMain.handle('marketplace:remove-url', (_, url: string) => {
        const current = configService.get('extensions.marketplaces') || [];
        configService.set('extensions.marketplaces', current.filter((u: string) => u !== url));
        return true;
    });

    ipcMain.handle('marketplace:fetch-remote', async (_, url: string) => {
        return await marketplaceService.fetchMarketplace(url);
    });

    ipcMain.handle('marketplace:install', async (_, ext: MarketplaceExtension) => {
        return await marketplaceService.installExtension(ext);
    });
}
