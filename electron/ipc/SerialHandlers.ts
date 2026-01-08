import { IpcMain, BrowserWindow } from 'electron';
import { serialService } from '../services/SerialService';

export function registerSerialHandlers(ipcMain: IpcMain) {
    ipcMain.handle('serial:list', async () => serialService.listPorts());

    ipcMain.handle('serial:open', async (event, portPath, baudRate, dataBits, stopBits, parity) => {
        return await serialService.open({ path: portPath, baudRate, dataBits, stopBits, parity });
    });

    ipcMain.handle('serial:close', async () => {
        serialService.close();
        return { success: true };
    });

    ipcMain.handle('serial:status', async () => serialService.getStatus());

    ipcMain.handle('serial:send', async (event, data, options) => serialService.send(data, options));

    ipcMain.handle('serial:set-signals', async (event, dtr, rts) => serialService.setSignals({ dtr, rts }));
}

// Hook up events separately to avoid passing mainWindow around indiscriminately in the handler registration if possible,
// but for Serial events, we need the window.
export function setupSerialEvents(mainWindow: BrowserWindow) {
    serialService.removeAllListeners('data');
    serialService.removeAllListeners('error');
    serialService.removeAllListeners('status');

    serialService.on('data', (data) => mainWindow.webContents.send('monitor-data', data));
    serialService.on('error', (msg) => mainWindow.webContents.send('monitor-error', msg));
    serialService.on('status', (status) => mainWindow.webContents.send('monitor-status', status));
}
