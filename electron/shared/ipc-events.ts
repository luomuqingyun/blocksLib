/**
 * ============================================================
 * IPC 通道与类型定义 (IPC Events & Types)
 * ============================================================
 * 
 * 本文件定义了主进程与渲染进程之间通信的所有 IPC 通道名称和数据类型。
 * 这是 Electron 应用 IPC 通信的"契约"，确保两端类型安全。
 * 
 * 通道分类:
 * - System: PlatformIO 相关操作
 * - Serial: 串口通信
 * - File: 文件系统操作
 * - Project: 项目 CRUD
 * - Config: 配置读写
 * - Extensions: 插件管理
 * - Menu: 菜单事件
 * 
 * @file electron/shared/ipc-events.ts
 * @module EmbedBlocks/Electron/Shared/IpcEvents
 */

/** 所有可用的 IPC 通道名称联合类型 */
export type IpcChannels =
    // 系统相关 (System)
    | 'pio:check'        // 检查 PlatformIO 环境
    | 'build-project'    // 编译项目
    | 'upload-project'   // 上传固件
    | 'build-log'        // 构建日志推送

    // 串口相关 (Serial)
    | 'serial:list'
    | 'serial:open'
    | 'serial:close'
    | 'serial:send'
    | 'serial:status'
    | 'monitor-data'
    | 'monitor-status'
    | 'monitor-error'

    // File
    | 'open-file-dialog'
    | 'save-project-dialog'
    | 'save-code-dialog'
    | 'save-file-content'
    | 'select-work-dir'
    | 'get-work-dir'

    // Project
    | 'project:create'
    | 'project:save'
    | 'project:open'

    // Config
    | 'config:get'
    | 'config:set'
    | 'config:update-history'
    | 'config:restore-defaults'
    | 'config:open-dir'
    | 'config:open-file'

    // Extensions
    | 'extensions:list'
    | 'extensions:import'
    | 'extensions:check-lib-paths'
    | 'extensions:read-file'

    // Menu
    | 'menu-action';

// Response Types
export interface SerialPortInfo { path: string; manufacturer?: string; friendlyName?: string; }
export interface SerialStatus { connected: boolean; port?: string | null; }
export interface ConfigData { [key: string]: any }
export interface ProjectCreateResult { success: boolean; path?: string; error?: string; }
export interface ProjectOpenResult { cancelled: boolean; error?: string; projectPath?: string; data?: any; }

import { PlatformIOTemplate, ProjectBuildConfig } from './types';

// ... (keep existing types)
export interface IpcRequestMap {
    'build-project': [code: string, buildConfig: PlatformIOTemplate, projectPath?: string];
    'upload-project': [code: string, buildConfig: PlatformIOTemplate, port?: string, projectPath?: string];
    'serial:open': [port: string, baud: number, dataBits?: number, stopBits?: number, parity?: string];
    'serial:send': [data: string | Uint8Array];
    'config:set': [key: string, value: any];
    'config:get': [key?: string];
    'save-file-content': [content: string, path: string];
    'project:create': [parentDir: string, name: string, boardId: string];
    'project:save': [path: string, data: { blocklyState: string, code: string, boardId?: string, buildConfig?: ProjectBuildConfig }];
}

export interface IpcResponseMap {
    'pio:check': { success: boolean; message: string; mode: string };
    'serial:list': SerialPortInfo[];
    'serial:open': { success: boolean, error?: string };
    'serial:status': SerialStatus;
    'config:get': any;
    'extensions:list': any[];
    'project:create': ProjectCreateResult;
    'project:open': ProjectOpenResult;
}
