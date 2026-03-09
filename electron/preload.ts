/**
 * ============================================================
 * EmbedBlocks Electron 预加载脚本 (Preload Script)
 * ============================================================
 * 
 * 预加载脚本是 Electron 安全架构的核心部分。
 * 它运行在渲染进程的"隔离世界"中，可以访问 Node.js API，
 * 但通过 contextBridge 只向渲染进程暴露安全的、经过筛选的 API。
 * 
 * 本文件定义了 window.electronAPI 对象，前端代码通过它与主进程通信。
 * 
 * 暴露的 API 分类:
 * - 系统环境: PlatformIO 检查
 * - 构建上传: 编译、烧录项目
 * - 串口监视: 串口通信操作
 * - 文件操作: 对话框、文件读写
 * - 项目操作: 项目 CRUD 和备份
 * - 配置管理: 用户设置读写
 * - 扩展系统: 插件加载和管理
 * - 插件市场: 远程插件下载安装
 * - 菜单事件: 接收原生菜单点击
 * 
 * 安全说明:
 * - nodeIntegration: false (渲染进程无法直接访问 Node)
 * - contextIsolation: true (渲染进程使用隔离的上下文)
 * - 所有敏感操作都通过 IPC 在主进程执行
 * 
 * @file electron/preload.ts
 * @module EmbedBlocks/Electron/Preload
 */

import { contextBridge, ipcRenderer } from 'electron';
import { PlatformIOTemplate } from './shared/types';

/**
 * 向渲染进程暴露的 Electron API 集合
 * 前端通过 window.electronAPI.xxx() 调用这些方法
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // =========================================================
  // 系统环境检测 (System Environment)
  // =========================================================
  /** 检查 PlatformIO 是否已安装并可用 */
  checkSystem: () => ipcRenderer.invoke('pio:check'),
  /** 获取 PIO 支持的变体列表 */
  getPioSupportedVariants: () => ipcRenderer.invoke('pio:supported-variants'),

  // 构建与上传 (Build & Upload)
  buildProject: (code: string, buildConfig: PlatformIOTemplate, projectPath?: string) => ipcRenderer.invoke('build-project', code, buildConfig, projectPath),
  uploadProject: (code: string, buildConfig: PlatformIOTemplate, port?: string, projectPath?: string) => ipcRenderer.invoke('upload-project', code, buildConfig, port, projectPath),
  cleanProject: (buildConfig: PlatformIOTemplate, projectPath?: string) => ipcRenderer.invoke('clean-project', buildConfig, projectPath),

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
  importExtension: (options?: { force?: boolean, sourcePath?: string }) => ipcRenderer.invoke('extensions:import', options),
  uninstallExtension: (extId: string) => ipcRenderer.invoke('extensions:uninstall', extId),
  readHelpFile: (type: 'user' | 'plugin') => ipcRenderer.invoke('help:read-file', type),
  openHelpGuide: (type: 'user' | 'plugin' | 'marketplace') => ipcRenderer.invoke('help:open-guide', type),
  openExternal: (path: string) => ipcRenderer.invoke('shell:open', path),
  openPath: (path: string) => ipcRenderer.invoke('shell:open-path', path),

  // --- Marketplace ---
  marketplaceListUrls: () => ipcRenderer.invoke('marketplace:list-urls'),
  marketplaceAddUrl: (url: string) => ipcRenderer.invoke('marketplace:add-url', url),
  marketplaceRemoveUrl: (url: string) => ipcRenderer.invoke('marketplace:remove-url', url),
  marketplaceFetchRemote: (url: string) => ipcRenderer.invoke('marketplace:fetch-remote', url),
  marketplaceInstall: (ext: any, force?: boolean) => ipcRenderer.invoke('marketplace:install', ext, force),
  marketplaceGetCachedIcon: (url: string) => ipcRenderer.invoke('marketplace:get-cached-icon', url),

  // Menu
  onMenuAction: (callback: (action: string, arg?: any) => void) => {
    const subscription = (_: any, action: string, arg?: any) => callback(action, arg);
    ipcRenderer.on('menu-action', subscription);
    return () => ipcRenderer.removeListener('menu-action', subscription);
  },

  // Config Broadcaster
  onConfigChanged: (callback: (key: string, value: any) => void) => {
    const handler = (_event: any, data: { key: string, value: any }) => callback(data.key, data.value);
    ipcRenderer.on('config-changed', handler);
    return () => ipcRenderer.removeListener('config-changed', handler);
  },

  // --- AI 助手交互接口 (OpenClaw) ---
  askOpenClaw: (data: { prompt: string, context?: any }) => ipcRenderer.invoke('ai:ask', data),

  // --- 焦点修复 (Focus Fix) ---
  // 强制执行 OS 级窗口 blur→focus 循环，修复 Chromium Compositor/IME 焦点丢失
  focusFix: () => ipcRenderer.invoke('app:focus-fix'),

  // --- 原生对话框 (Native Dialogs) ---
  // 替代 window.confirm() 等原生阻塞 API 以避免引发光标消失/输入变黑洞的严重 Bug
  showConfirmDialog: (options: { title?: string, message: string, buttons?: string[] }) => ipcRenderer.invoke('dialog:confirm', options),
});