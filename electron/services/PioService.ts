/**
 * ============================================================
 * PlatformIO 编译服务 (PIO Service)
 * ============================================================
 * 
 * 负责调用 PlatformIO CLI 执行编译和上传操作。
 * 支持两种运行模式:
 * - SYSTEM: 使用系统安装的 PIO (命令行 'pio')
 * - PORTABLE: 使用内嵌的便携版 PIO (bundled_pio)
 * 
 * 主要功能:
 * - checkEnvironment: 检测 PIO 环境并确定运行模式
 * - checkInternet: 检测网络连接状态
 * - build: 编译项目 (pio run)
 * - upload: 上传固件 (pio run -t upload)
 * - runCommand: 核心编译命令执行
 * 
 * 工作流程:
 * 1. 检测系统 PIO，有则使用
 * 2. 否则检测便携版 PIO
 * 3. 生成/更新 platformio.ini
 * 4. 执行 pio run 并实时输出日志
 * 
 * @file electron/services/PioService.ts
 * @module EmbedBlocks/Electron/Services/PioService
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn, execSync } from 'child_process';
import { promisify } from 'util';
import * as dns from 'dns';

const execAsync = promisify(exec);
// 引入板级配置模板和 INI 生成工具
import { generateIniConfig } from '../config/templates';
import { PlatformIOTemplate } from '../shared/types';

export class PioService {
    private coreDir: string;
    private pioExe: string = 'pio'; // 默认使用系统 PIO
    private mode: 'SYSTEM' | 'PORTABLE' = 'SYSTEM'; // 运行模式：系统/便携
    private isOnline: boolean = false; // 在线状态
    private portableExePath: string | null = null; // 便携版可执行文件路径

    constructor() {
        const isProd = app.isPackaged;
        const basePath = isProd ? process.resourcesPath : app.getAppPath();

        // 设置便携版 PIO 路径 (bundled_pio)
        this.coreDir = path.join(basePath, 'bundled_pio', 'core');
        const penvDir = path.join(basePath, 'bundled_pio', 'penv');

        let portableExe = '';
        // Windows 和其他平台的路径差异处理
        if (process.platform === 'win32') {
            portableExe = path.join(penvDir, 'Scripts', 'pio.exe');
            if (!fs.existsSync(portableExe)) {
                portableExe = path.join(penvDir, 'bin', 'pio.exe');
            }
        } else {
            portableExe = path.join(penvDir, 'bin', 'pio');
        }

        // 如果存在便携版，则记录路径
        if (fs.existsSync(this.coreDir) && fs.existsSync(portableExe)) {
            this.portableExePath = portableExe;
        }
    }

    // 检查网络连接 (通过查询 PlatformIO 注册表)
    private async checkInternet(): Promise<boolean> {
        return new Promise((resolve) => {
            dns.lookup('registry.platformio.org', (err) => {
                resolve(!err);
            });
        });
    }

    /**
     * 获取系统 PIO 的潜在安装路径
     */
    /**
     * 获取系统常见的 PlatformIO 安装路径 (智能发现)
     */
    private getPotentialSystemPioPaths(): string[] {
        const userHome = process.env.USERPROFILE || process.env.HOME || '';
        const paths: string[] = [];

        if (process.platform === 'win32') {
            // Windows 默认 Python 环境路径
            paths.push(path.join(userHome, '.platformio', 'penv', 'Scripts', 'pio.exe'));
        } else {
            // Unix 类系统路径
            paths.push(path.join(userHome, '.platformio', 'penv', 'bin', 'pio'));
            paths.push('/usr/local/bin/pio');
            paths.push('/usr/bin/pio');
        }

        return paths.filter(p => fs.existsSync(p));
    }

    /**
     * 检查环境，确定使用系统 PIO 还是便携版 PIO
     * @returns 环境检查结果
     */
    public async checkEnvironment(): Promise<{ success: boolean; message: string; mode: string }> {
        this.isOnline = await this.checkInternet();

        return new Promise(async (resolve) => {
            // 1. 首先尝试环境变量中的 pio
            exec('pio --version', async (error, stdout) => {
                if (!error) {
                    this.mode = 'SYSTEM';
                    this.pioExe = 'pio';
                    return resolve({
                        success: true,
                        message: `System PIO (${stdout.trim()}) - ${this.isOnline ? 'Online' : 'Offline'}`,
                        mode: 'System'
                    });
                }

                // 2. 如果环境变量没有，尝试扫描常见安装路径 (智能发现)
                const potentialPaths = this.getPotentialSystemPioPaths();
                for (const p of potentialPaths) {
                    try {
                        const version = await new Promise<string>((res, rej) => {
                            exec(`"${p}" --version`, (err, out) => err ? rej(err) : res(out.trim()));
                        });
                        this.mode = 'SYSTEM';
                        this.pioExe = p;
                        return resolve({
                            success: true,
                            message: `Smart Detected PIO (${version}) - ${this.isOnline ? 'Online' : 'Offline'}`,
                            mode: 'System'
                        });
                    } catch (e) {
                        // 某个路径无效，继续尝试下一个
                    }
                }

                // 3. 最后回退到便携版 PIO
                if (this.portableExePath) {
                    this.mode = 'PORTABLE';
                    this.pioExe = this.portableExePath;

                    exec(`"${this.pioExe}" --version`, { env: this.getEnv() }, (err, out) => {
                        if (!err) {
                            resolve({
                                success: true,
                                message: `Portable PIO (${out.trim()}) - ${this.isOnline ? 'Online' : 'Offline'}`,
                                mode: 'Portable'
                            });
                        } else {
                            resolve({
                                success: false,
                                message: 'Portable Environment Corrupted',
                                mode: 'None'
                            });
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'PIO Not Found',
                        mode: 'None'
                    });
                }
            });
        });
    }

    /**
     * 构建子进程的环境变量
     * 确保 pio 及其配套工具能够被正确发现
     */
    public getEnv(): NodeJS.ProcessEnv {
        const env = { ...process.env };
        const sep = process.platform === 'win32' ? ';' : ':';

        // 1. 如果 pioExe 是绝对路径（便携版或智能发现），确保其目录在 PATH 中
        if (path.isAbsolute(this.pioExe)) {
            const pioBinDir = path.dirname(this.pioExe);
            const currentPath = env[process.platform === 'win32' ? 'Path' : 'PATH'] || '';

            // 将 PIO 目录置于 PATH 最前面，确保子进程能找到配套工具（如 python, click 等）
            if (!currentPath.includes(pioBinDir)) {
                const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
                env[pathKey] = `${pioBinDir}${sep}${currentPath}`;
            }

            // 如果是系统安装但不在 PATH（智能发现），显式设置 Core 目录
            if (this.mode === 'SYSTEM') {
                const userHome = process.env.USERPROFILE || process.env.HOME || '';
                env['PLATFORMIO_CORE_DIR'] = path.join(userHome, '.platformio');
            }
        }

        // 2. 处理便携模式的特定变量
        if (this.mode === 'PORTABLE') {
            env['PLATFORMIO_CORE_DIR'] = this.coreDir;
            env['PLATFORMIO_GLOBALLIB_DIR'] = path.join(this.coreDir, 'lib');

            // 离线模式限制
            if (!this.isOnline) {
                env['PLATFORMIO_SETTING_CHECK_PLATFORMIO_INTERVAL'] = '999999';
                env['PLATFORMIO_SETTING_CHECK_PLATFORMS_INTERVAL'] = '999999';
                env['PLATFORMIO_SETTING_CHECK_LIBRARIES_INTERVAL'] = '999999';
                env['PLATFORMIO_NO_SESSION_ACCESS'] = '1';
                env['PLATFORMIO_OFFLINE'] = '1';
            }
        }

        return env;
    }

    public getPioExecutable() { return this.pioExe; }
    public isPortableMode() { return this.mode === 'PORTABLE'; }
    public isOnlineMode() { return this.isOnline; }

    public async build(code: string, buildConfig: PlatformIOTemplate, extensionLibPaths: string[], logCallback: (msg: string) => void, projectPath?: string): Promise<{ success: boolean; exitCode?: number }> {
        return this.runCommand(code, buildConfig, 'build', undefined, extensionLibPaths, logCallback, projectPath);
    }

    public async upload(code: string, buildConfig: PlatformIOTemplate, port: string, extensionLibPaths: string[], logCallback: (msg: string) => void, projectPath?: string): Promise<{ success: boolean; exitCode?: number }> {
        return this.runCommand(code, buildConfig, 'upload', port, extensionLibPaths, logCallback, projectPath);
    }

    public async clean(buildConfig: PlatformIOTemplate, logCallback: (msg: string) => void, projectPath?: string): Promise<{ success: boolean; exitCode?: number }> {
        return this.runCommand('', buildConfig, 'clean', undefined, [], logCallback, projectPath);
    }

    private async runCommand(code: string, buildConfig: PlatformIOTemplate, operation: 'build' | 'upload' | 'clean', port: string | undefined, extensionLibPaths: string[], logCallback: (msg: string) => void, projectPath?: string): Promise<{ success: boolean; exitCode?: number }> {
        const tempDir = path.join(app.getPath('temp'), 'embedblocks_build', 'active_project');
        const workDir = projectPath || tempDir;

        try {
            // 设置目录 (临时模式 vs 项目模式)
            if (!projectPath) {
                // 临时模式: 清理重建
                if (fs.existsSync(tempDir)) {
                    try { await fs.promises.rm(tempDir, { recursive: true, force: true }); } catch (e) { }
                }
                await fs.promises.mkdir(path.join(tempDir, 'src'), { recursive: true });
                await fs.promises.writeFile(path.join(tempDir, 'src', 'main.cpp'), code);

                // 生成 PIO 配置
                const envConfig = generateIniConfig(buildConfig);
                await fs.promises.writeFile(path.join(tempDir, 'platformio.ini'), envConfig);
            } else {
                // 项目模式: 验证
                const srcPath = path.join(workDir, 'src', 'main.cpp');
                if (code) {
                    if (!fs.existsSync(path.dirname(srcPath))) await fs.promises.mkdir(path.dirname(srcPath), { recursive: true });
                    await fs.promises.writeFile(srcPath, code);
                }

                // 检查 platformio.ini，如果缺失则生成
                const pioPath = path.join(workDir, 'platformio.ini');
                // Always overwrite to ensure settings are applied
                const envConfig = generateIniConfig(buildConfig);
                await fs.promises.writeFile(pioPath, envConfig);
            }

            const args = ['run'];
            if (operation === 'upload') {
                args.push('-t', 'upload');
                // 智能端口处理
                let useExplicitPort = true;
                try {
                    const pioContent = await fs.promises.readFile(path.join(workDir, 'platformio.ini'), 'utf-8');
                    // 如果使用 stlink 等调试器，不需要指定端口
                    if (pioContent.includes('upload_protocol = stlink')) useExplicitPort = false;
                } catch (e) { }

                if (port && useExplicitPort) {
                    args.push('--upload-port', port);
                }
            } else if (operation === 'clean') {
                args.push('-t', 'clean');
            }

            // 注入扩展库路径
            const env = this.getEnv();
            if (extensionLibPaths.length > 0) {
                const existing = env['PLATFORMIO_LIB_EXTRA_DIRS'] || '';
                const sep = process.platform === 'win32' ? ';' : ':';
                env['PLATFORMIO_LIB_EXTRA_DIRS'] = existing ? `${existing}${sep}${extensionLibPaths.join(sep)}` : extensionLibPaths.join(sep);
                logCallback(`Included Extension Libraries: ${extensionLibPaths.length} paths`);
            }

            await this.checkEnvironment();
            logCallback(`Action: ${operation.toUpperCase()} | Board: ${buildConfig.board}`);
            if (port) logCallback(`Target Port: ${port}`);
            logCallback(`Working Directory: ${workDir}`);

            // 执行命令
            return new Promise((resolve) => {
                const buildProcess = spawn(this.pioExe, args, {
                    cwd: workDir,
                    env: env,
                    shell: false // Security Hardening: Disable shell execution
                });

                // 实时输出日志
                buildProcess.stdout.on('data', (data) => logCallback(data.toString()));
                buildProcess.stderr.on('data', (data) => logCallback(data.toString()));

                buildProcess.on('error', (err) => {
                    logCallback(`SPAWN ERROR: ${err.message}`);
                    resolve({ success: false, exitCode: -1 });
                });

                buildProcess.on('close', (code) => {
                    if (code === 0) {
                        logCallback(`${operation.toUpperCase()} SUCCESS`);
                        resolve({ success: true, exitCode: 0 });
                    } else {
                        logCallback(`${operation.toUpperCase()} FAILED (Exit Code: ${code})`);
                        resolve({ success: false, exitCode: code || -1 });
                    }
                });
            });

        } catch (e: any) {
            logCallback(`ERROR: ${e.message}`);
            return { success: false };
        }
    }


    /**
     * 获取系统支持的官方 STM32 变体列表
     * 扫描 ~/.platformio/packages/framework-arduinoststm32/variants 目录
     */
    public async getSystemSupportedVariants(): Promise<string[]> {
        let variantsPath = '';

        // 1. 优先检查便携版环境
        if (this.mode === 'PORTABLE' && this.portableExePath) {
            const pkgDir = path.join(this.coreDir, 'packages', 'framework-arduinoststm32', 'variants');
            if (fs.existsSync(pkgDir)) variantsPath = pkgDir;
        }

        // 2. 检查系统环境 (Windows User Home)
        if (!variantsPath) {
            const userHome = process.env.USERPROFILE || process.env.HOME || '';
            const systemPkgDir = path.join(userHome, '.platformio', 'packages', 'framework-arduinoststm32', 'variants');
            if (fs.existsSync(systemPkgDir)) variantsPath = systemPkgDir;
        }

        // 3. 检查 bundled resources
        if (!variantsPath && app.isPackaged) {
            const bundledPkgDir = path.join(process.resourcesPath, 'framework-arduinoststm32', 'variants');
            if (fs.existsSync(bundledPkgDir)) variantsPath = bundledPkgDir;
        }

        if (!variantsPath) {
            console.warn('[PioService] Could not locate framework-arduinoststm32 variants directory');
            return [];
        }

        try {
            const items = await fs.promises.readdir(variantsPath, { withFileTypes: true });
            // 递归查找所有变体？通常 STM32duino 结构是 flattened (例如 STM32F1xx/F103C8) 或者直接在 variants 根下
            // 这里为了简单，我们收集所有定义的变体文件夹名称
            const variants: string[] = [];

            // FIXME: STM32duino 的变体目录结构可能是 variants/STM32F1xx/STM32F103C8... 这里的逻辑需要更健壮
            // 目前用户需求是匹配 variants 文件夹下的内容
            // 简单的策略：收集 variants 实际上是 folders with variant_generic.h or something?
            // "Unofficial" logic usually expects the variant name to match the folder name relative to variants/

            // 简单的扁平化扫描
            for (const item of items) {
                if (item.isDirectory()) {
                    variants.push(item.name);
                    // 检查是否是系列文件夹 (e.g., STM32F1xx)
                    if (item.name.startsWith('STM32') && item.name.endsWith('xx')) {
                        const subPath = path.join(variantsPath, item.name);
                        const subItems = await fs.promises.readdir(subPath, { withFileTypes: true });
                        for (const subItem of subItems) {
                            if (subItem.isDirectory()) {
                                variants.push(subItem.name); // Add short name (e.g. F103C8)
                                variants.push(path.join(item.name, subItem.name).replace(/\\/g, '/')); // Add full relative path
                            }
                        }
                    }
                }
            }
            // console.log('[PioService] Found supported variants:', variants.length);
            return variants;
        } catch (e) {
            console.error('[PioService] Failed to scan variants', e);
            return [];
        }
    }

    /**
     * 为项目生成终端辅助脚本
     * 允许用户在没有全局环境变量的情况下，直接使用终端操作 pio 命令
     */
    public async generateTerminalHelper(projectPath: string): Promise<void> {
        try {
            await this.checkEnvironment();
            const env = this.getEnv();
            const pioBinDir = path.isAbsolute(this.pioExe) ? path.dirname(this.pioExe) : '';
            const coreDir = env['PLATFORMIO_CORE_DIR'] || '';

            // [NEW] 检测系统中是否存在 pwsh (PowerShell 7)
            let powershellExe = 'powershell.exe';
            try {
                // 1. 优先尝试通过 where 命令在 PATH 中查找 (最通用)
                const { stdout } = await execAsync('where.exe pwsh');
                if (stdout) {
                    const foundPath = stdout.split('\r\n')[0].trim() || stdout.split('\n')[0].trim();
                    if (foundPath && fs.existsSync(foundPath)) {
                        powershellExe = `"${foundPath}"`;
                    }
                }
            } catch (e) {
                // 2. 失败后回退到硬编码路径探测 (针对未加入 PATH 的情况)
                const commonPaths = [
                    'D:\\Program Files\\PowerShell\\7\\pwsh.exe',
                    'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
                    'D:\\Program Files\\PowerShell\\7-preview\\pwsh.exe',
                    'C:\\Program Files\\PowerShell\\7-preview\\pwsh.exe',
                ];
                for (const p of commonPaths) {
                    if (fs.existsSync(p)) {
                        powershellExe = `"${p}"`;
                        break;
                    }
                }
            }

            // 1. 生成 PowerShell 脚本 (Windows)
            const ps1Path = path.join(projectPath, 'eb_terminal.ps1');
            let ps1Content = `# EmbedBlocks Terminal Helper\n`;
            // [ENCODING] 强制 UTF-8 编码环境，防止乱码
            ps1Content += `$OutputEncoding = [Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding\n`;
            ps1Content += `$Host.UI.RawUI.WindowTitle = "EmbedBlocks CLI - ${path.basename(projectPath)}"\n\n`;
            ps1Content += `# 自动跳转到项目目录\n`;
            ps1Content += `Set-Location -Path $PSScriptRoot\n\n`;
            ps1Content += `# 设置环境变量\n`;
            if (pioBinDir) {
                ps1Content += `$env:Path = "${pioBinDir};" + $env:Path\n`;
            }
            if (coreDir) {
                ps1Content += `$env:PLATFORMIO_CORE_DIR = "${coreDir}"\n`;
            }
            ps1Content += `\n# 欢迎信息 (Bilingual)\n`;
            ps1Content += `Write-Host "--------------------------------------------------" -ForegroundColor Cyan\n`;
            ps1Content += `Write-Host "   EmbedBlocks CLI Terminal Ready" -ForegroundColor Cyan\n`;
            ps1Content += `Write-Host "   PIO: ${this.pioExe}" -ForegroundColor Gray\n`;
            ps1Content += `Write-Host "--------------------------------------------------" -ForegroundColor Cyan\n`;
            ps1Content += `Write-Host " [CN] 你现在可以运行 'pio run', 'pio run -t upload' 等命令"\n`;
            ps1Content += `Write-Host " [EN] You can now run 'pio run', 'pio run -t upload', etc."\n\n`;
            ps1Content += `Write-Host "--------------------------------------------------" -ForegroundColor Cyan\n`;
            ps1Content += `Write-Host " TIPS: 如果此窗口点击即消失，请改用双击 'eb_terminal.bat' 运行。" -ForegroundColor Yellow\n`;
            ps1Content += `Write-Host " TIPS: If this window closes immediately, please double-click 'eb_terminal.bat'." -ForegroundColor Yellow\n`;

            // [ENCODING] 关键：写入带 UTF-8 BOM 的文件 (\ufeff)，确保 PowerShell 5.1 正确识别中文
            const ps1Buffer = Buffer.concat([Buffer.from('\ufeff', 'utf-8'), Buffer.from(ps1Content, 'utf-8')]);
            await fs.promises.writeFile(ps1Path, ps1Buffer);

            // 同时生成一个简单的 .bat 引导文件，方便 Windows 用户直接双击
            const batPath = path.join(projectPath, 'eb_terminal.bat');
            const batContent = `@echo off\ntitle EmbedBlocks CLI - ${path.basename(projectPath)}\n` +
                `cd /d "%~dp0"\n` +
                `echo [EmbedBlocks] Starting development environment...\n` +
                `${powershellExe} -NoExit -ExecutionPolicy Bypass -File "%~dp0eb_terminal.ps1"\n`;
            await fs.promises.writeFile(batPath, batContent);

            // 2. 生成 Shell 脚本 (macOS/Linux)
            const shPath = path.join(projectPath, 'eb_terminal.sh');
            const unixBinDir = pioBinDir.replace(/\\/g, '/');
            const unixCoreDir = coreDir.replace(/\\/g, '/');

            let shContent = `#!/bin/bash\n`;
            shContent += `cd "$(dirname "$0")"\n`; // 自动跳转到脚本所在目录
            shContent += `export PATH="${unixBinDir}:$PATH"\n`;
            if (coreDir) shContent += `export PLATFORMIO_CORE_DIR="${unixCoreDir}"\n`;
            shContent += `echo "--------------------------------------------------"\n`;
            shContent += `echo "   EmbedBlocks CLI Terminal Ready"\n`;
            shContent += `echo "   PIO Path: ${this.pioExe}"\n`;
            shContent += `echo "--------------------------------------------------"\n`;
            shContent += `echo " [CN] 你现在可以在此终端运行 pio 命令"\n`;
            shContent += `echo " [EN] You can now run pio commands in this terminal"\n`;
            shContent += `echo "--------------------------------------------------"\n`;
            shContent += `exec $SHELL\n`;

            await fs.promises.writeFile(shPath, shContent);
            try { await fs.promises.chmod(shPath, 0o755); } catch (e) { } // 赋予可执行权限

            console.log(`[PioService] Generated terminal helpers in: ${projectPath} (Using: ${powershellExe})`);
        } catch (e) {
            console.error('[PioService] Failed to generate terminal helper', e);
        }
    }
}


export const pioService = new PioService();
