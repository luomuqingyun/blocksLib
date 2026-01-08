import { app, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { configService } from './services/ConfigService';

// Import New IPC Handlers
import { registerProjectHandlers } from './ipc/ProjectHandlers';
import { registerSerialHandlers, setupSerialEvents } from './ipc/SerialHandlers';
import { registerConfigHandlers } from './ipc/ConfigHandlers';
import { registerExtensionHandlers } from './ipc/ExtensionHandlers';
import { registerBuildHandlers } from './ipc/BuildHandlers';
import { registerMarketplaceHandlers } from './ipc/MarketplaceHandlers';

// ============================================================
// ============================================================
// 1. 初始化 (Initialization)
// ============================================================

let mainWindow: BrowserWindow | null = null;
const getMainWindow = () => mainWindow;

// ============================================================
// 2. 菜单逻辑 (Menu Logic)
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
                diag: "Keyboard Diagnostics",
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
                diag: "键盘诊断工具",
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
    if (lang === 'system') lang = app.getLocale().startsWith('zh') ? 'zh' : 'en';
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
                { label: getT('toggleDevTools'), role: 'toggleDevTools' },
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
                { label: getT('diag'), accelerator: 'CmdOrCtrl+Alt+Shift+D', click: () => mainWindow?.webContents.send('menu-action', 'toggle-diag') },
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
}

// ============================================================
// 4. IPC 注册 (IPC Registration)
// ============================================================

function registerAllIpcs() {
    registerProjectHandlers(ipcMain, { onMenuUpdate: buildMenu });
    registerSerialHandlers(ipcMain);
    registerConfigHandlers(ipcMain, { onMenuUpdate: buildMenu });
    registerExtensionHandlers(ipcMain);
    registerBuildHandlers(ipcMain, getMainWindow);
    registerMarketplaceHandlers(ipcMain);

    // Help file reader
    ipcMain.handle('help:read-file', async (_event, type: 'user' | 'plugin' | 'about') => {
        let fileName = '用户操作指南.md';
        if (type === 'plugin') fileName = '插件系统开发手册.md';
        else if (type === 'about') fileName = '关于项目.md';
        const possiblePaths = [
            path.join(app.getAppPath(), 'docs', fileName),
            path.join(app.getAppPath(), 'resources', 'docs', fileName),
            path.join(__dirname, '../docs', fileName),
            path.join(__dirname, '../../docs', fileName),
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                return {
                    content: fs.readFileSync(p, 'utf8'),
                    path: p
                };
            }
        }
        return { content: `Error: Could not find help file ${fileName}`, path: '' };
    });

    // Universal shell open
    ipcMain.handle('shell:open', async (_event, filePath: string) => {
        if (!filePath) return false;
        try {
            await shell.openPath(filePath);
            return true;
        } catch (e) {
            console.error('[Main] Failed to open path:', filePath, e);
            return false;
        }
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

    app.whenReady().then(() => {
        registerAllIpcs();
        createWindow();

        const file = process.argv.find(arg => arg.endsWith('.ebproj'));
        if (file) {
            mainWindow?.webContents.once('did-finish-load', () => {
                mainWindow?.webContents.send('menu-action', 'open-recent', file);
            });
        }
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});