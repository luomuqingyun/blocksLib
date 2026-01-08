import { IpcMain, BrowserWindow } from 'electron';
import { pioService } from '../services/PioService';
import { buildWorkflowService } from '../services/BuildWorkflowService';

export function registerBuildHandlers(ipcMain: IpcMain, getMainWindow: () => BrowserWindow | null) {

    ipcMain.handle('pio:check', async () => await pioService.checkEnvironment());

    ipcMain.handle('build-project', async (event, code, buildConfig, projectPath) => {
        await buildWorkflowService.runOrchestration(getMainWindow(), code, buildConfig, 'build', undefined, projectPath);
    });

    ipcMain.handle('upload-project', async (event, code, buildConfig, port, projectPath) => {
        // Port here is the "Monitor Port" passed from UI
        await buildWorkflowService.runOrchestration(getMainWindow(), code, buildConfig, 'upload', port, projectPath);
    });
}
