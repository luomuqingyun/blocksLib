import { IpcMain, shell, dialog } from 'electron';
import * as fs from 'fs';
import { configService } from '../services/ConfigService';

export function registerConfigHandlers(ipcMain: IpcMain, callbacks: { onMenuUpdate: () => void }) {

    ipcMain.handle('config:get', (event, key?: string) => configService.get(key));

    ipcMain.handle('config:set', (event, key: string, value: any) => {
        configService.set(key, value);
        if (key === 'general.language' || key === 'language') {
            callbacks.onMenuUpdate();
        }
        return true;
    });

    ipcMain.handle('config:update-history', (event, history: string[]) => configService.updateSerialHistory(history));

    ipcMain.handle('config:restore-defaults', async (_, section, clearHistory) => configService.restoreDefaults(section, clearHistory));

    ipcMain.handle('config:open-dir', async () => configService.openConfigDir());

    ipcMain.handle('config:open-work-dir', async () => {
        const workDir = configService.get('general.workDir');
        if (workDir && fs.existsSync(workDir)) {
            shell.openPath(workDir);
        }
    });

    ipcMain.handle('config:open-file', () => configService.openConfigDir());

    ipcMain.handle('select-work-dir', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Select Working Directory',
            defaultPath: configService.get('general.workDir'),
            properties: ['openDirectory']
        });
        if (canceled || filePaths.length === 0) return null;
        configService.set('general.workDir', filePaths[0]);
        return filePaths[0];
    });

    ipcMain.handle('get-work-dir', () => configService.get('general.workDir'));
}
