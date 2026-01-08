import { IpcMain, dialog } from 'electron';
import { extensionService } from '../services/ExtensionService';

export function registerExtensionHandlers(ipcMain: IpcMain) {
    ipcMain.handle('extensions:check-lib-paths', () => extensionService.getExtensionLibPaths());
    ipcMain.handle('extensions:list', () => extensionService.getExtensions());

    ipcMain.handle('extensions:read-file', async (event, extId, relativePath, encoding) => {
        return await extensionService.loadFileFromExtension(extId, relativePath, encoding);
    });

    ipcMain.handle('extensions:import', async (event, arg?: string | { sourcePath?: string, force?: boolean }) => {
        let finalPath: string | undefined;
        let force = false;

        if (typeof arg === 'string') {
            finalPath = arg;
        } else if (typeof arg === 'object') {
            finalPath = arg.sourcePath;
            force = !!arg.force;
        }

        if (!finalPath) {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
                title: 'Select Extension Folder',
                buttonLabel: 'Import Extension'
            });
            if (result.canceled || result.filePaths.length === 0) return { success: false, message: 'Canceled' };
            finalPath = result.filePaths[0];
        }
        return await extensionService.importExtension(finalPath, force);
    });

    ipcMain.handle('extensions:uninstall', async (event, extId) => {
        return await extensionService.uninstallExtension(extId);
    });
}
