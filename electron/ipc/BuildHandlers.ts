/**
 * ============================================================
 * 编译构建 IPC 处理器 (Build IPC Handlers)
 * ============================================================
 * 
 * 处理与 PlatformIO 编译上传相关的所有 IPC 请求:
 * - pio:check       检查 PlatformIO 环境
 * - build-project   编译项目
 * - upload-project  上传固件到开发板
 * 
 * 实际编译由 BuildWorkflowService 编排，
 * 它协调 PioService 执行 pio run 命令
 * 
 * @file electron/ipc/BuildHandlers.ts
 * @module EmbedBlocks/Electron/IPC/BuildHandlers
 */

import { IpcMain, BrowserWindow } from 'electron';
import { pioService } from '../services/PioService';
import { buildWorkflowService } from '../services/BuildWorkflowService';

/**
 * 注册所有编译构建相关的 IPC 处理器
 * @param ipcMain Electron IPC 主模块
 * @param getMainWindow 获取主窗口的函数 (用于发送实时日志)
 */
export function registerBuildHandlers(ipcMain: IpcMain, getMainWindow: () => BrowserWindow | null) {

    /**
     * 检查 PlatformIO 环境
     * 返回环境状态和运行模式 (SYSTEM/PORTABLE)
     */
    ipcMain.handle('pio:check', async () => await pioService.checkEnvironment());

    /**
     * 编译项目
     * @param code 源代码
     * @param buildConfig 构建配置
     * @param projectPath 项目路径
     */
    ipcMain.handle('build-project', async (event, code, buildConfig, projectPath) => {
        await buildWorkflowService.runOrchestration(getMainWindow(), code, buildConfig, 'build', undefined, projectPath);
    });

    /**
     * 上传固件到开发板
     * @param code 源代码
     * @param buildConfig 构建配置
     * @param port 监视器端口 (可能与上传端口不同)
     * @param projectPath 项目路径
     */
    ipcMain.handle('upload-project', async (event, code, buildConfig, port, projectPath) => {
        // port 参数是监视器端口，如果 buildConfig 中指定了 upload_port 则优先使用
        await buildWorkflowService.runOrchestration(getMainWindow(), code, buildConfig, 'upload', port, projectPath);
    });
}
