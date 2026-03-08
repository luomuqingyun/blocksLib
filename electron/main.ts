/**
 * ============================================================
 * EmbedBlocks Electron 主进程入口 (Main Process Entry Point)
 * ============================================================
 * 
 * 本文件是 Electron 应用的主进程入口，负责:
 * 1. 创建和管理应用窗口 (BrowserWindow)
 * 2. 构建原生应用菜单 (多语言支持)
 * 3. 注册所有 IPC 处理器 (进程间通信)
 * 4. 管理 Web Serial API 权限 (串口设备访问)
 * 5. 处理应用生命周期事件
 * 6. 处理文件关联 (.ebproj 双击打开)
 * 
 * 架构说明:
 * - 主进程 (Main Process): 运行 Node.js，可访问系统 API
 * - 渲染进程 (Renderer Process): 运行 Vite/React 应用
 * - 两者通过 IPC (Inter-Process Communication) 通信
 * - preload.ts 作为桥梁，暴露安全的 API 给渲染进程
 * 
 * @file electron/main.ts
 * @module EmbedBlocks/Electron/Main
 */

import { app, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

app.disableHardwareAcceleration();

// --- 全局错误捕获 (防崩溃与诊断) ---
process.on('uncaughtException', (error) => {
    console.error('[Main] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================================
// 导入 IPC 处理器模块 (Import IPC Handler Modules)
// 每个模块负责一类 IPC 请求的处理
// ============================================================
import { registerProjectHandlers } from './ipc/ProjectHandlers';       // 项目操作: 新建/打开/保存
import { registerSerialHandlers, setupSerialEvents } from './ipc/SerialHandlers';  // 串口通信
import { registerConfigHandlers } from './ipc/ConfigHandlers';         // 配置管理
import { registerExtensionHandlers } from './ipc/ExtensionHandlers';   // 扩展/插件管理
import { registerBuildHandlers } from './ipc/BuildHandlers';           // 编译构建
import { registerMarketplaceHandlers } from './ipc/MarketplaceHandlers'; // 插件市场
import { aiService } from './services/AiService';                        // AI 服务

// ====== 测试与 AI 注入流程注入 ======
import { runTests } from './testRunner';
import { runAiProjectCreation } from './aiRunner';
// ============================================================

// ====== 初始化核心服务 (Initialize Core Services) ======
// 服务作为单例在底层运行保持状态
import { configService } from './services/ConfigService';
import { pioService } from './services/PioService';

/** 主窗口实例引用，用于其他模块访问 */
let mainWindow: BrowserWindow | null = null;

/** 获取主窗口实例的工厂函数，传递给需要访问窗口的 IPC 处理器 */
const getMainWindow = () => mainWindow;

// ============================================================
// 2. 菜单逻辑 (Menu Logic)
// 应用菜单支持中英文切换，根据用户设置或系统语言自动选择
// ============================================================

let locales: Record<string, any> = {};

// 加载菜单的多语言资源
function loadLocales() {
    try {
        locales = {
            en: {
                file: "File", new: "New Project", open: "Open Project", openRecent: "Open Recent", clearRecent: "Clear Recent", closeProject: "Close Project", save: "Save", saveAs: "Save As", exit: "Exit",
                edit: "Edit", undo: "Undo", redo: "Redo", cut: "Cut", copy: "Copy", paste: "Paste", selectAll: "Select All",
                view: "View", reload: "Reload", toggleDevTools: "Toggle Developer Tools", resetZoom: "Reset Zoom", zoomIn: "Zoom In", zoomOut: "Zoom Out", toggleFullscreen: "Toggle Fullscreen",
                window: "Window", minimize: "Minimize", close: "Close",
                help: "Help", about: "About",
                settings: "Preferences...",
                userGuide: "User Guide",
                pluginGuide: "Plugin Development Guide"
            },
            zh: {
                file: "文件", new: "新建项目", open: "打开项目", openRecent: "打开最近", clearRecent: "清除最近记录", closeProject: "关闭项目", save: "保存", saveAs: "另存为", exit: "退出",
                edit: "编辑", undo: "撤销", redo: "重做", cut: "剪切", copy: "复制", paste: "粘贴", selectAll: "全选",
                view: "视图", reload: "重新加载", toggleDevTools: "切换开发者工具", resetZoom: "重置缩放", zoomIn: "放大", zoomOut: "缩小", toggleFullscreen: "切换全屏",
                window: "窗口", minimize: "最小化", close: "关闭",
                help: "帮助", about: "关于",
                settings: "设置...",
                userGuide: "用户手册",
                pluginGuide: "插件开发指南"
            }
        };
    } catch (e) { console.error("Locale load failed", e); }
}
loadLocales();

// 获取本地化文本
function getT(key: string): string {
    let lang = configService.get('general.language');
    // 如果设置为跟随系统，则自动判断
    if (lang === 'system') {
        try {
            lang = app.getLocale().startsWith('zh') ? 'zh' : 'en';
        } catch (e) {
            console.warn('[Main] Failed to get system locale, defaulting to en:', e);
            lang = 'en';
        }
    }
    const dict = locales[lang] || locales['en'];
    return dict[key] || key;
}

// 构建应用菜单
function buildMenu() {
    const isMac = process.platform === 'darwin';
    const template: MenuItemConstructorOptions[] = [
        {
            label: getT('file'),
            submenu: [
                { label: getT('new'), accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-action', 'new') },
                { label: getT('open'), accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu-action', 'open') },
                { label: getT('closeProject'), click: () => mainWindow?.webContents.send('menu-action', 'close-project') },
                {
                    label: getT('openRecent'),
                    submenu: (configService.get('general.recentProjects') || []).map((p: string) => ({
                        label: p,
                        click: () => mainWindow?.webContents.send('menu-action', 'open-recent', p)
                    })).concat([
                        { type: 'separator' },
                        { label: getT('clearRecent'), click: () => { configService.set('general.recentProjects', []); buildMenu(); } }
                    ])
                },
                { type: 'separator' },
                { label: getT('save'), accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu-action', 'save') },
                { label: getT('saveAs'), accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('menu-action', 'save-as') },
                { type: 'separator' },
                { label: getT('settings'), accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('menu-action', 'settings') },
                { type: 'separator' },
                { label: getT('exit'), role: isMac ? 'close' : 'quit' }
            ]
        },
        {
            label: getT('edit'),
            submenu: [
                { label: getT('undo'), role: 'undo' },
                { label: getT('redo'), role: 'redo' },
                { type: 'separator' },
                { label: getT('cut'), role: 'cut' },
                { label: getT('copy'), role: 'copy' },
                { label: getT('paste'), role: 'paste' },
                { label: getT('selectAll'), role: 'selectAll' }
            ]
        },
        {
            label: getT('view'),
            submenu: [
                { label: getT('reload'), role: 'reload' },
                { label: getT('toggleDevTools'), role: 'toggleDevTools', accelerator: 'F12' },
                { type: 'separator' },
                { label: getT('resetZoom'), role: 'resetZoom' },
                { label: getT('zoomIn'), role: 'zoomIn' },
                { label: getT('zoomOut'), role: 'zoomOut' },
                { type: 'separator' },
                { label: getT('toggleFullscreen'), role: 'togglefullscreen' }
            ]
        },
        {
            label: getT('help'),
            submenu: [
                { label: getT('userGuide'), click: () => mainWindow?.webContents.send('menu-action', 'help-user-guide') },
                { label: getT('pluginGuide'), click: () => mainWindow?.webContents.send('menu-action', 'help-plugin-guide') },
                { type: 'separator' },
                { label: getT('about'), click: () => mainWindow?.webContents.send('menu-action', 'help-about') }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// ============================================================
// 3. 窗口管理 (Window Management)
// ============================================================

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "EmbedBlocks",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            // 这是一个安全实践：禁用 Node 集成，使用 Context Bridge
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, '../icon.ico')
    });

    // ============================================================
    // Link Handling: Force external links to open in default browser
    // ============================================================
    mainWindow.webContents.setWindowOpenHandler((details) => {
        const url = details.url;
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
            return { action: 'deny' }; // Prevent internal popup
        }
        return { action: 'allow' };
    });

    // ============================================================
    // Web Serial API 权限处理 (Web Serial Permission Handlers)
    // ============================================================
    // 存储已授权的设备
    const grantedDevices: Set<string> = new Set();

    // 处理设备权限请求
    mainWindow.webContents.session.setDevicePermissionHandler((details) => {
        if (details.deviceType === 'serial') {
            // 检查是否已授权
            const deviceKey = `${details.device.vendorId}-${details.device.productId}`;
            if (grantedDevices.has(deviceKey)) {
                return true;
            }
        }
        return false;
    });

    // 处理串口选择请求 (这是弹出选择对话框的关键!)
    mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
        console.log('[Main] Serial port selection requested');
        portList.forEach((p, i) => {
            console.log(`  [${i}] ${p.displayName} (VID: ${p.vendorId}, PID: ${p.productId}, ID: ${p.portId})`);
        });

        event.preventDefault();

        if (portList.length === 0) {
            console.log('[Main] No ports available in the filtered list');
            callback('');
            return;
        }

        const selected = portList[0];
        console.log(`[Main] Selecting: ${selected.displayName}`);

        const deviceKey = `${selected.vendorId}-${selected.productId}`;
        grantedDevices.add(deviceKey);

        callback(selected.portId);
    });

    mainWindow.webContents.session.on('serial-port-added', (event, port) => {
        console.log('[Main] Serial port added:', port.displayName);
    });

    mainWindow.webContents.session.on('serial-port-removed', (event, port) => {
        console.log('[Main] Serial port removed:', port.displayName);
    });

    // 开发模式加载 Vite Server，生产模式加载文件
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    buildMenu();

    // 自动清理不存在的最近项目
    configService.validateRecentProjects();

    // Hook up Serial Events to UI
    setupSerialEvents(mainWindow);

    // ============================================================
    // Content Security Policy (CSP)
    // ============================================================
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        const csp = process.env.VITE_DEV_SERVER_URL
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* blob: data:; img-src 'self' blob: data: https:; connect-src 'self' http://localhost:* ws://localhost:* https:;"
            : "default-src 'self' 'unsafe-inline' blob: data:; img-src 'self' blob: data: https:; connect-src 'self' https:;";

        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [csp]
            }
        });
    });
}

// ============================================================
// 4. IPC 注册 (IPC Registration)
// ============================================================

function registerAllIpcs() {
    registerProjectHandlers(ipcMain, {
        onMenuUpdate: buildMenu,
        onConfigChange: (key, value) => {
            mainWindow?.webContents.send('config-changed', { key, value });
        }
    });
    registerSerialHandlers(ipcMain);
    registerConfigHandlers(ipcMain, {
        onMenuUpdate: buildMenu,
        onConfigChange: (key, value) => {
            mainWindow?.webContents.send('config-changed', { key, value });
        }
    });
    registerExtensionHandlers(ipcMain);
    registerBuildHandlers(ipcMain, getMainWindow);
    registerMarketplaceHandlers(ipcMain);

    // Helper to find help files
    const findDocPath = (fileName: string): string | null => {
        const possiblePaths = [
            path.join(app.getAppPath(), 'docs', fileName),
            path.join(app.getAppPath(), 'resources', 'docs', fileName),
            path.join(__dirname, '../docs', fileName),
            path.join(__dirname, '../../docs', fileName),
        ];
        return possiblePaths.find(p => fs.existsSync(p)) || null;
    };

    // Help file reader
    ipcMain.handle('help:read-file', async (_event, type: 'user' | 'plugin' | 'about' | 'marketplace') => {
        let fileName = '用户操作指南.md';
        if (type === 'plugin') fileName = '普通用户插件系统开发手册.md';
        else if (type === 'marketplace') fileName = '插件市场发布指南.md';
        else if (type === 'about') fileName = '关于项目.md';

        const validPath = findDocPath(fileName);
        if (validPath) {
            return {
                content: fs.readFileSync(validPath, 'utf8'),
                path: validPath
            };
        }
        return { content: `Error: Could not find help file ${fileName}`, path: '' };
    });

    // Helper to open guide externally
    ipcMain.handle('help:open-guide', async (_event, type: 'user' | 'plugin' | 'marketplace') => {
        let fileName = '用户操作指南.md';
        if (type === 'plugin') fileName = '普通用户插件系统开发手册.md';
        else if (type === 'marketplace') fileName = '插件市场发布指南.md';
        else if (type === 'user') fileName = '用户操作指南.md';

        const validPath = findDocPath(fileName);
        if (validPath) {
            await shell.openPath(validPath);
            return { success: true };
        }
        return { success: false, message: 'File not found' };
    });

    // 移除这里重复的 shell:open，它已经在 ProjectHandlers.ts 中被注册了
    // --- AI 助手交互接口 (OpenClaw) ---
    /**
     * 处理来自渲染进程的 AI 咨询请求。
     * 该处理器将提示词透传给 AiService，并返回 AI 生成的文本或积木数据。
     */
    ipcMain.handle('ai:ask', async (_event, data: { prompt: string, context?: any }) => {
        return await aiService.ask(data.prompt, data.context);
    });
}

// ============================================================
// 5. App Lifecycle & File Associations
// ============================================================

// Handle double-click open on macOS
app.on('open-file', (event, path) => {
    event.preventDefault();
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('menu-action', 'open-recent', path);
    }
});

// ========== 自动化测试 & AI 注入拦截器 (Automated Test & AI Interceptor) ==========
const TEST_FLAGS = ['run-board-tests', 'generate-test-projects', 'compile-test-projects', 'clean-test-projects', 'ai-create-project'];

app.whenReady().then(() => {
    const isTestMode = TEST_FLAGS.some(flag => app.commandLine.hasSwitch(flag) || process.argv.some(arg => typeof arg === 'string' && arg.includes(flag)));

    if (isTestMode) {
        console.log('[Main] Running in Automated Mode (Test/AI)...');
        if (app.commandLine.hasSwitch('ai-create-project')) {
            runAiProjectCreation().then(() => {
                app.quit();
            }).catch((err: any) => {
                console.error('[Main] AI Runner Error:', err);
                app.quit();
            });
        } else {
            runTests().then(() => {
                app.quit();
            }).catch((err: any) => {
                console.error('[Main] Test Runner Error:', err);
                app.quit();
            });
        }
    } else {
        const gotTheLock = app.requestSingleInstanceLock();
        if (!gotTheLock) {
            app.quit();
        } else {
            app.on('second-instance', (event, commandLine, workingDirectory) => {
                if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();

                    const file = commandLine.find(arg => arg.endsWith('.ebproj'));
                    if (file) {
                        mainWindow.webContents.send('menu-action', 'open-recent', file);
                    }
                }
            });

            console.time('[Main] Startup');
            registerAllIpcs();

            // --- 延迟解密敏感配置 (必须在 app ready 之后) ---
            try {
                configService.decryptSensitiveData();
            } catch (e) {
                console.error('[Main] Failed to decrypt sensitive data:', e);
            }

            createWindow();
            console.timeEnd('[Main] Startup');

            const file = process.argv.find(arg => typeof arg === 'string' && arg.endsWith('.ebproj'));
            if (file) {
                mainWindow?.webContents.once('did-finish-load', () => {
                    mainWindow?.webContents.send('menu-action', 'open-recent', file);
                });
            }
        }
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});