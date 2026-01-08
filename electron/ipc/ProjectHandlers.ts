import { IpcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { projectService } from '../services/ProjectService';
import { configService } from '../services/ConfigService';

export function registerProjectHandlers(ipcMain: IpcMain, callbacks: { onMenuUpdate: () => void }) {

    // Create Project
    ipcMain.handle('project:create', async (event, parentDir, name, boardId, buildConfig) => {
        const result = await projectService.createProject(parentDir, name, boardId, buildConfig);
        if (result.success && result.path) {
            configService.addRecentProject(result.path);
            callbacks.onMenuUpdate();
        }
        return result;
    });

    // Remove Recent
    ipcMain.handle('project:remove-recent', async (event, pathToRemove) => {
        configService.removeRecentProject(pathToRemove);
        callbacks.onMenuUpdate();
        return { success: true };
    });

    // Copy Project
    ipcMain.handle('project:copy', async (event, srcPath, parentDir, newName) => {
        return await projectService.copyProject(srcPath, parentDir, newName);
    });

    // Save Project
    ipcMain.handle('project:save', async (event, path, data) => {
        return await projectService.saveProject(path, data);
    });

    // Open Project Dialog
    ipcMain.handle('project:open', async () => {
        const result = await projectService.openProjectDialog();
        if (!result.cancelled && result.projectPath) {
            configService.addRecentProject(result.projectPath);
            callbacks.onMenuUpdate();
        }
        return result;
    });

    // Open Project by Path
    ipcMain.handle('project:open-path', async (event, path) => {
        return await projectService.openProject(path);
    });

    // Backup Operations
    ipcMain.handle('project:backup', async (event, path, data) => projectService.backupProject(path, data));
    ipcMain.handle('project:check-backup', async (event, path) => projectService.checkBackup(path));
    ipcMain.handle('project:restore-backup', async (event, path) => projectService.restoreBackup(path));
    ipcMain.handle('project:discard-backup', async (event, path) => projectService.discardBackup(path));

    // File Operations (Legacy/Misc)
    ipcMain.handle('save-code-dialog', async (event) => {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Export Code',
            defaultPath: path.join(configService.get('general.workDir'), 'sketch.ino'),
            filters: [
                { name: 'Arduino Sketch', extensions: ['ino'] },
                { name: 'C++ Source', extensions: ['cpp'] }
            ]
        });
        if (canceled || !filePath) return null;
        return filePath;
    });

    ipcMain.handle('open-file-dialog', async (event, options?: Electron.OpenDialogOptions) => {
        const { canceled, filePaths } = await dialog.showOpenDialog(options || { properties: ['openFile'] });
        if (canceled || filePaths.length === 0) return null;
        return { path: filePaths[0], content: fs.readFileSync(filePaths[0], 'utf-8') };
    });

    ipcMain.handle('save-file-content', async (event, content, filePath) => {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, content, 'utf-8');
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
}
