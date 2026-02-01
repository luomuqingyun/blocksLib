/**
 * ============================================================
 * Vite 环境类型定义 (Vite Environment Type Definitions)
 * ============================================================
 * 
 * 为 TypeScript 提供类型声明，主要包含:
 * 
 * 1. ElectronAPI 接口:
 *    - 系统检查 (checkSystem)
 *    - 构建和上传 (buildProject/uploadProject)
 *    - 串口通信 (listPorts/openSerial/sendSerial 等)
 *    - 文件操作 (openFileDialog/saveProject 等)
 *    - 项目管理 (createProject/openProjectFolder 等)
 *    - 设置配置 (getConfig/setConfig 等)
 *    - 扩展插件 (extensionsList/importExtension 等)
 *    - 应用菜单交互 (onMenuAction)
 * 
 * 2. Web Serial API 类型:
 *    - WebSerialPort 接口
 *    - 串口选项和信号类型
 *    - Navigator.serial 扩展
 * 
 * @file src/vite-env.d.ts
 * @module EmbedBlocks/Types/Environment
 */

/// <reference types="vite/client" />

import { BoardBuildConfig, ProjectBuildConfig } from './types/board';

interface ElectronAPI {
  // --- System ---
  checkSystem: () => Promise<{ success: boolean; message: string; mode: string }>;

  // --- Build & Upload ---
  buildProject: (code: string, buildConfig: BoardBuildConfig, projectPath?: string) => Promise<{ success: boolean; exitCode?: number }>;
  uploadProject: (code: string, buildConfig: BoardBuildConfig, port?: string, projectPath?: string) => Promise<{ success: boolean; exitCode?: number }>;

  // --- Logs ---
  onLog: (callback: (msg: string) => void) => () => void;

  // --- Serial ---
  listPorts: () => Promise<SerialPort[]>;
  openSerial: (port: string, baud: number, dataBits?: number, stopBits?: number, parity?: string) => Promise<{ success: boolean; error?: string }>;
  closeSerial: () => Promise<{ success: boolean; error?: string }>;
  sendSerial: (data: string | Uint8Array, options?: { encoding?: string }) => Promise<{ success: boolean; error?: string }>;
  setSerialSignals: (dtr: boolean, rts: boolean) => Promise<{ success: boolean; error?: string }>;
  getSerialStatus: () => Promise<{ connected: boolean; port?: string }>;

  onMonitorData: (callback: (data: string) => void) => () => void;
  onMonitorStatus: (callback: (status: { connected: boolean; port?: string }) => void) => () => void;
  onMonitorError: (callback: (error: string) => void) => () => void;

  // --- File Operations ---
  openFileDialog: (options?: any) => Promise<{ path: string; content: string } | null>;
  saveProjectDialog: () => Promise<{ path: string } | null>;
  saveCodeDialog: () => Promise<string | null>;
  saveFileContent: (content: string, path: string) => Promise<{ success: boolean; error?: string }>;

  // --- Project Operations ---
  createProject: (parentDir: string, name: string, boardId: string, buildConfig?: BoardBuildConfig) => Promise<{ success: boolean; path?: string; error?: string }>;
  copyProject: (srcPath: string, parentDir: string, newName: string) => Promise<{ success: boolean; newPath?: string; error?: string }>;
  saveProjectFolder: (path: string, data: { blocklyState: string, code: string, boardId?: string, buildConfig?: ProjectBuildConfig }) => Promise<{ success: boolean; error?: string }>;
  openProjectFolder: () => Promise<{ cancelled: boolean; error?: string; projectPath?: string; data?: any }>;
  openProjectByPath: (path: string) => Promise<{ cancelled: boolean; error?: string; projectPath?: string; data?: any }>;

  // --- Backup ---
  backupProject: (path: string, data: any) => Promise<{ success: boolean; error?: string }>;
  checkBackup: (path: string) => Promise<{ hasBackup: boolean; timestamp?: number }>;
  restoreBackup: (path: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  discardBackup: (path: string) => Promise<void>;

  // --- Settings ---
  selectWorkDir: () => Promise<string | null>;
  getWorkDir: () => Promise<string>;

  // --- Legacy Support ---
  saveProject: (content: string, filename: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;

  // --- Config ---
  getConfig: (key?: string) => Promise<any>;
  setConfig: (key: string, value: any) => Promise<boolean>;
  updateHistory: (history: string[]) => Promise<string[]>;
  removeRecentProject: (path: string) => Promise<{ success: boolean }>; // New
  restoreDefaults: (section?: string, clearHistory?: boolean) => Promise<any>;
  openConfigDir: () => Promise<void>;
  openConfigFile: () => Promise<void>;
  openWorkDir: () => Promise<void>;

  // --- Extensions ---
  extensionsList: () => Promise<any[]>;
  extensionReadFile: (extId: string, path: string, encoding?: string) => Promise<string | null>;
  importExtension: (options?: { force?: boolean, sourcePath?: string }) => Promise<{ success: boolean; message: string; extensionId?: string; status?: 'ok' | 'downgrade' | 'error'; currentVersion?: string; newVersion?: string; actualSourcePath?: string }>;
  uninstallExtension: (extId: string) => Promise<{ success: boolean; message: string; extensionId?: string }>;
  readHelpFile: (type: 'user' | 'plugin' | 'about' | 'marketplace') => Promise<{ content: string; path: string }>;
  openHelpGuide: (type: 'user' | 'plugin' | 'marketplace') => Promise<{ success: boolean; message?: string }>;
  openExternal: (path: string) => Promise<boolean>;

  // --- Marketplace ---
  marketplaceListUrls: () => Promise<string[]>;
  marketplaceAddUrl: (url: string) => Promise<boolean>;
  marketplaceRemoveUrl: (url: string) => Promise<boolean>;
  marketplaceFetchRemote: (url: string) => Promise<any[]>;
  marketplaceInstall: (ext: any, force?: boolean) => Promise<{ success: boolean; message: string; status?: string; currentVersion?: string; newVersion?: string }>;
  marketplaceGetCachedIcon: (url: string) => Promise<string | null>;

  // --- Menu ---
  onMenuAction: (callback: (action: string, arg?: any) => void) => () => void;
}
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}


declare global {
  // Web Serial API Definitions
  // We namespace them to avoid conflict if necessary, but standard is global `SerialPort`
  interface WebSerialPort {
    onconnect: ((this: WebSerialPort, ev: Event) => any) | null;
    ondisconnect: ((this: WebSerialPort, ev: Event) => any) | null;
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable: WritableStream<Uint8Array> | null;
    open(options: WebSerialOptions): Promise<void>;
    close(): Promise<void>;
    getInfo(): WebSerialPortInfo;
    setSignals(signals: SerialOutputSignals): Promise<void>;
    getSignals(): Promise<SerialInputSignals>;
    forget(): Promise<void>;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  }

  interface SerialOutputSignals {
    dataTerminalReady?: boolean;
    requestToSend?: boolean;
    break?: boolean;
  }

  interface SerialInputSignals {
    dataClassLoaderReady: boolean;
    clearToSend: boolean;
    ringIndicator: boolean;
  }

  interface WebSerialOptions {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
    bufferSize?: number;
    flowControl?: 'none' | 'hardware';
  }

  interface WebSerialPortInfo {
    usbVendorId?: number;
    usbProductId?: number;
  }

  interface Navigator {
    serial: {
      requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<WebSerialPort>;
      getPorts(): Promise<WebSerialPort[]>;
      addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
      removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    };
  }
}
