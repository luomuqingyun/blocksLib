/**
 * ============================================================
 * 串口通信 IPC 处理器 (Serial IPC Handlers)
 * ============================================================
 * 
 * 处理与串口监视器相关的所有 IPC 请求:
 * - serial:list    列出可用串口
 * - serial:open    打开串口连接
 * - serial:close   关闭串口连接
 * - serial:status  获取连接状态
 * - serial:send    发送数据
 * - serial:set-signals 设置 DTR/RTS 信号
 * 
 * 还提供 setupSerialEvents() 将串口事件转发到渲染进程:
 * - monitor-data   接收数据
 * - monitor-error  错误通知
 * - monitor-status 状态变化
 * 
 * @file electron/ipc/SerialHandlers.ts
 * @module EmbedBlocks/Electron/IPC/SerialHandlers
 */

import { IpcMain, BrowserWindow } from 'electron';
import { serialService } from '../services/SerialService';

/** 注册所有串口通信相关的 IPC 处理器 */
export function registerSerialHandlers(ipcMain: IpcMain) {
    // 列出可用串口
    ipcMain.handle('serial:list', async () => serialService.listPorts());

    // 打开串口连接
    ipcMain.handle('serial:open', async (event, portPath, baudRate, dataBits, stopBits, parity) => {
        return await serialService.open({ path: portPath, baudRate, dataBits, stopBits, parity });
    });

    // 关闭串口连接
    ipcMain.handle('serial:close', async () => {
        serialService.close();
        return { success: true };
    });

    // 获取当前连接状态
    ipcMain.handle('serial:status', async () => serialService.getStatus());

    // 发送数据
    ipcMain.handle('serial:send', async (event, data, options) => serialService.send(data, options));

    // 设置 DTR/RTS 信号 (用于复位等操作)
    ipcMain.handle('serial:set-signals', async (event, dtr, rts) => serialService.setSignals({ dtr, rts }));
}

/**
 * 设置串口事件转发
 * 将 SerialService 的事件转发到渲染进程
 * @param mainWindow 主窗口实例
 */
export function setupSerialEvents(mainWindow: BrowserWindow) {
    // 清除旧的事件监听器，防止窗口重建时重复注册
    serialService.removeAllListeners('data');
    serialService.removeAllListeners('error');
    serialService.removeAllListeners('status');

    // 转发事件到渲染进程
    serialService.on('data', (data) => mainWindow.webContents.send('monitor-data', data));    // 接收的数据
    serialService.on('error', (msg) => mainWindow.webContents.send('monitor-error', msg));    // 错误信息
    serialService.on('status', (status) => mainWindow.webContents.send('monitor-status', status)); // 状态变化
}
