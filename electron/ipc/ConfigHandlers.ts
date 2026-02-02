/**
 * ============================================================
 * 配置管理 IPC 处理器 (Config IPC Handlers)
 * ============================================================
 * 
 * 处理与用户配置相关的所有 IPC 请求:
 * - config:get       获取配置值
 * - config:set       设置配置值
 * - config:update-history 更新串口历史
 * - config:restore-defaults 恢复默认设置
 * - config:open-dir  打开配置文件目录
 * - config:open-work-dir 打开工作目录
 * - select-work-dir  选择工作目录对话框
 * - get-work-dir     获取当前工作目录
 * 
 * 配置由 ConfigService 管理，持久化到 config.json
 * 
 * @file electron/ipc/ConfigHandlers.ts
 * @module EmbedBlocks/Electron/IPC/ConfigHandlers
 */

import { IpcMain, shell, dialog } from 'electron';
import * as fs from 'fs';
import { configService } from '../services/ConfigService';

/**
 * 注册所有配置管理相关的 IPC 处理器
 * @param ipcMain Electron IPC 主模块
 * @param callbacks 回调函数集合 (用于语言切换时更新菜单)
 */
export function registerConfigHandlers(ipcMain: IpcMain, callbacks: { onMenuUpdate: () => void }) {

    // 获取配置 (key 可选，不传则返回全部配置)
    ipcMain.handle('config:get', (event, key?: string) => configService.get(key));

    // 设置配置 (语言切换时触发菜单更新)
    ipcMain.handle('config:set', (event, key: string, value: any) => {
        configService.set(key, value);

        // 语言切换时更新菜单
        if (key === 'general.language' || key === 'language') {
            callbacks.onMenuUpdate();
        }

        // 启用自动清理无效历史项目时，立即执行一次清理
        if (key === 'general.autoCleanNoMatchRecent' && value === true) {
            configService.validateRecentProjects();
            callbacks.onMenuUpdate(); // 更新菜单中的最近项目列表
        }

        return true;
    });

    // 更新串口历史记录
    ipcMain.handle('config:update-history', (event, history: string[]) => configService.updateSerialHistory(history));

    // 恢复默认设置
    ipcMain.handle('config:restore-defaults', async (_, section, clearHistory) => configService.restoreDefaults(section, clearHistory));

    // 打开配置文件目录
    ipcMain.handle('config:open-dir', async () => configService.openConfigDir());

    // 打开工作目录 (在文件浏览器中)
    ipcMain.handle('config:open-work-dir', async () => {
        const workDir = configService.get('general.workDir');
        if (workDir && fs.existsSync(workDir)) {
            shell.openPath(workDir);
        }
    });

    // 打开配置文件 (别名)
    ipcMain.handle('config:open-file', () => configService.openConfigDir());

    // 选择工作目录对话框
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

    // 获取当前工作目录
    ipcMain.handle('get-work-dir', () => configService.get('general.workDir'));
}
