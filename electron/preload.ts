import { contextBridge, ipcRenderer } from 'electron';
import { PlatformIOTemplate } from './shared/types';

// We could import types, but for preload simplicity and to avoid module issues in some electron setups
// without strict compilation path mapping, we will keep explicit typed functions here 
// that match the interface we expect.

contextBridge.exposeInMainWorld('electronAPI', {
  // --- 系统环境 (System) ---
  checkSystem: () => ipcRenderer.invoke('pio:check'),

  // 构建与上传 (Build & Upload)
  buildProject: (code: string, buildConfig: PlatformIOTemplate, projectPath?: string) => ipcRenderer.invoke('build-project', code, buildConfig, projectPath),
  uploadProject: (code: string, buildConfig: PlatformIOTemplate, port?: string, projectPath?: string) => ipcRenderer.invoke('upload-project', code, buildConfig, port, projectPath),

  // 构建日志监听 (Logs)
  // Handles both legacy string format and new {buildId, message} format
  onLog: (callback: (msg: string, buildId?: string) => void) => {
    const handler = (_event: any, value: string | { buildId: string; message: string }) => {
      if (typeof value === 'string') {
        callback(value);
      } else {
        callback(value.message, value.buildId);
      }
    };
    ipcRenderer.on('build-log', handler);
    return () => ipcRenderer.removeListener('build-log', handler);
  },
  // New build session started notification
  onBuildStart: (callback: (info: { buildId: string; operation: 'build' | 'upload' }) => void) => {
    const handler = (_event: any, value: any) => callback(value);
    ipcRenderer.on('build-start', handler);
    return () => ipcRenderer.removeListener('build-start', handler);
  },

  // --- 串口监视器 (Serial Monitor) ---
  listPorts: () => ipcRenderer.invoke('serial:list'),
  openSerial: (port: string, baud: number, dataBits?: number, stopBits?: number, parity?: string) =>
    ipcRenderer.invoke('serial:open', port, baud, dataBits, stopBits, parity),
  closeSerial: () => ipcRenderer.invoke('serial:close'),
  sendSerial: (data: string | Uint8Array, options?: { encoding?: string }) => ipcRenderer.invoke('serial:send', data, options),
  setSerialSignals: (dtr: boolean, rts: boolean) => ipcRenderer.invoke('serial:set-signals', dtr, rts),
  getSerialStatus: () => ipcRenderer.invoke('serial:status'),

  onMonitorData: (callback: (data: string) => void) => {
    const handler = (_event: any, value: string) => callback(value);
    ipcRenderer.on('monitor-data', handler);
    return () => ipcRenderer.removeListener('monitor-data', handler);
  },
  onMonitorStatus: (callback: (status: { connected: boolean; port?: string }) => void) => {
    const handler = (_event: any, value: any) => callback(value);
    ipcRenderer.on('monitor-status', handler);
    return () => ipcRenderer.removeListener('monitor-status', handler);
  },
  onMonitorError: (callback: (error: string) => void) => {
    const handler = (_event: any, value: string) => callback(value);
    ipcRenderer.on('monitor-error', handler);
    return () => ipcRenderer.removeListener('monitor-error', handler);
  },

  // --- 文件操作 (File Operations) ---
  openFileDialog: (options?: any) => ipcRenderer.invoke('open-file-dialog', options),
  saveProjectDialog: () => ipcRenderer.invoke('save-project-dialog'),
  saveCodeDialog: () => ipcRenderer.invoke('save-code-dialog'),
  saveFileContent: (content: string, path: string) => ipcRenderer.invoke('save-file-content', content, path),

  // --- 项目操作 (Project Operations - Folder Structure) ---
  createProject: (parentDir: string, name: string, boardId: string, buildConfig?: any) => ipcRenderer.invoke('project:create', parentDir, name, boardId, buildConfig),
  copyProject: (srcPath: string, parentDir: string, newName: string) => ipcRenderer.invoke('project:copy', srcPath, parentDir, newName),
  saveProjectFolder: (path: string, data: any) => ipcRenderer.invoke('project:save', path, data),
  openProjectFolder: () => ipcRenderer.invoke('project:open'),
  openProjectByPath: (path: string) => ipcRenderer.invoke('project:open-path', path),

  // --- Backup ---
  backupProject: (path: string, data: any) => ipcRenderer.invoke('project:backup', path, data),
  checkBackup: (path: string) => ipcRenderer.invoke('project:check-backup', path),
  restoreBackup: (path: string) => ipcRenderer.invoke('project:restore-backup', path),
  discardBackup: (path: string) => ipcRenderer.invoke('project:discard-backup', path),

  // --- 设置 (Settings) ---
  selectWorkDir: () => ipcRenderer.invoke('select-work-dir'),
  getWorkDir: () => ipcRenderer.invoke('get-work-dir'),

  // --- Legacy Support ---
  saveProject: (content: string, filename: string) => ipcRenderer.invoke('save-project', content, filename),

  // Config
  getConfig: (key?: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  updateHistory: (history: string[]) => ipcRenderer.invoke('config:update-history', history),
  removeRecentProject: (path: string) => ipcRenderer.invoke('project:remove-recent', path),
  restoreDefaults: (section?: string, clearHistory?: boolean) => ipcRenderer.invoke('config:restore-defaults', section, clearHistory),
  openConfigDir: () => ipcRenderer.invoke('config:open-dir'),
  openConfigFile: () => ipcRenderer.invoke('config:open-file'), // Added missing
  openWorkDir: () => ipcRenderer.invoke('config:open-work-dir'),

  // --- Extensions ---
  extensionsList: () => ipcRenderer.invoke('extensions:list'),
  extensionReadFile: (extId: string, path: string, encoding?: string) => ipcRenderer.invoke('extensions:read-file', extId, path, encoding),
  importExtension: () => ipcRenderer.invoke('extensions:import'),
  uninstallExtension: (extId: string) => ipcRenderer.invoke('extensions:uninstall', extId),
  readHelpFile: (type: 'user' | 'plugin') => ipcRenderer.invoke('help:read-file', type),
  openExternal: (path: string) => ipcRenderer.invoke('shell:open', path),

  // Menu
  onMenuAction: (callback: (action: string, arg?: any) => void) => {
    const subscription = (_: any, action: string, arg?: any) => callback(action, arg);
    ipcRenderer.on('menu-action', subscription);
    return () => ipcRenderer.removeListener('menu-action', subscription);
  }
});