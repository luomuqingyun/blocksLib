/**
 * ============================================================
 * 项目操作 IPC 处理器 (Project IPC Handlers)
 * ============================================================
 * 
 * 处理与项目相关的所有 IPC 请求:
 * - project:create  创建新项目
 * - project:copy    复制项目
 * - project:save    保存项目
 * - project:open    打开项目对话框
 * - project:open-path 通过路径打开项目
 * - project:backup  备份/恢复/丢弃备份
 * - save-code-dialog 导出代码对话框
 * - save-file-content 保存文件内容
 * 
 * 所有操作都通过 ProjectService 执行，
 * 成功后自动更新最近项目列表和菜单。
 * 
 * @file electron/ipc/ProjectHandlers.ts
 * @module EmbedBlocks/Electron/IPC/ProjectHandlers
 */

import { IpcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { projectService } from '../services/ProjectService';
import { configService } from '../services/ConfigService';

/**
 * 注册所有项目相关的 IPC 处理器
 * @param ipcMain Electron IPC 主模块
 * @param callbacks 回调函数集合，包含菜单更新回调
 */
export function registerProjectHandlers(ipcMain: IpcMain, callbacks: {
    onMenuUpdate: () => void,
    onConfigChange?: (key: string, value: any) => void
}) {

    // =========================================================
    // 创建项目 (Create Project)
    // 创建后自动添加到最近项目列表并更新菜单
    // =========================================================
    ipcMain.handle('project:create', async (event, parentDir, name, boardId, buildConfig) => {
        const result = await projectService.createProject(parentDir, name, boardId, buildConfig);
        if (result.success && result.path) {
            configService.addRecentProject(result.path);
            callbacks.onMenuUpdate();
        }
        return result;
    });

    // 移除最近项目记录 (从列表中删除，不删除文件)
    ipcMain.handle('project:remove-recent', async (event, pathToRemove) => {
        configService.removeRecentProject(pathToRemove);
        callbacks.onMenuUpdate();
        return { success: true };
    });

    // 复制项目 (另存为)
    ipcMain.handle('project:copy', async (event, srcPath, parentDir, newName) => {
        return await projectService.copyProject(srcPath, parentDir, newName);
    });

    // 保存项目
    ipcMain.handle('project:save', async (event, path, data) => {
        const result = await projectService.saveProject(path, data);
        if (result.success) {
            const updatedRecent = configService.addRecentProject(path);
            if (callbacks.onConfigChange) {
                callbacks.onConfigChange('general.recentProjects', updatedRecent);
            }
            callbacks.onMenuUpdate();
        }
        return result;
    });

    // 打开项目对话框 (用户选择 .ebproj 文件)
    ipcMain.handle('project:open', async () => {
        const result = await projectService.openProjectDialog();
        if (!result.cancelled && result.projectPath) {
            configService.addRecentProject(result.projectPath);
            callbacks.onMenuUpdate();
        }
        return result;
    });

    // 通过路径打开项目 (用于最近项目列表)
    ipcMain.handle('project:open-path', async (event, path) => {
        const result = await projectService.openProject(path);
        if (!result.error && !result.cancelled && result.projectPath) {
            const updatedRecent = configService.addRecentProject(result.projectPath);
            if (callbacks.onConfigChange) {
                callbacks.onConfigChange('general.recentProjects', updatedRecent);
            }
            callbacks.onMenuUpdate();
        }
        return result;
    });

    // ==================== 备份操作 ====================
    ipcMain.handle('project:backup', async (event, path, data) => projectService.backupProject(path, data));
    ipcMain.handle('project:check-backup', async (event, path) => projectService.checkBackup(path));
    ipcMain.handle('project:restore-backup', async (event, path) => projectService.restoreBackup(path));
    ipcMain.handle('project:discard-backup', async (event, path) => projectService.discardBackup(path));

    // ==================== 文件操作 ====================

    // 导出代码对话框 (保存为 .ino 或 .cpp)
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
