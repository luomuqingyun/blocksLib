/**
 * ============================================================
 * 扩展插件 IPC 处理器 (Extension IPC Handlers)
 * ============================================================
 * 
 * 处理与本地扩展/插件相关的所有 IPC 请求:
 * - extensions:check-lib-paths 获取扩展库路径
 * - extensions:list    列出已安装扩展
 * - extensions:read-file 读取扩展内文件
 * - extensions:import  导入新扩展
 * - extensions:uninstall 卸载扩展
 * 
 * 扩展由 ExtensionService 管理，存储在配置目录的 extensions 子目录
 * 
 * @file electron/ipc/ExtensionHandlers.ts
 * @module EmbedBlocks/Electron/IPC/ExtensionHandlers
 */

import { IpcMain, dialog } from 'electron';
import { extensionService } from '../services/ExtensionService';

/** 注册所有扩展管理相关的 IPC 处理器 */
export function registerExtensionHandlers(ipcMain: IpcMain) {
    // 获取所有扩展的库路径 (用于编译时注入)
    ipcMain.handle('extensions:check-lib-paths', () => extensionService.getExtensionLibPaths());

    // 列出所有已安装的扩展
    ipcMain.handle('extensions:list', () => extensionService.getExtensions());

    // 读取扩展内的文件
    ipcMain.handle('extensions:read-file', async (event, extId, relativePath, encoding) => {
        return await extensionService.loadFileFromExtension(extId, relativePath, encoding);
    });

    /**
     * 导入扩展
     * 支持两种调用方式:
     * 1. 传递路径字符串: 'C:/path/to/extension'
     * 2. 传递对象: { sourcePath: 'C:/...', force: true }
     * 3. 不传参数: 弹出文件选择对话框
     */
    ipcMain.handle('extensions:import', async (event, arg?: string | { sourcePath?: string, force?: boolean }) => {
        let finalPath: string | undefined;
        let force = false;

        // 解析参数
        if (typeof arg === 'string') {
            finalPath = arg;
        } else if (typeof arg === 'object') {
            finalPath = arg.sourcePath;
            force = !!arg.force;
        }

        // 如果没有提供路径，弹出文件选择对话框
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

    // 卸载扩展
    ipcMain.handle('extensions:uninstall', async (event, extId) => {
        return await extensionService.uninstallExtension(extId);
    });
}
