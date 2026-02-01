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
import { exec, spawn } from 'child_process';
import * as dns from 'dns';
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
     * 检查环境，确定使用系统 PIO 还是便携版 PIO
     * @returns 环境检查结果
     */
    public async checkEnvironment(): Promise<{ success: boolean; message: string; mode: string }> {
        this.isOnline = await this.checkInternet();

        return new Promise(async (resolve) => {
            // 1. 优先尝试系统安装的 PIO
            exec('pio --version', async (error, stdout) => {
                if (!error) {
                    this.mode = 'SYSTEM';
                    this.pioExe = 'pio';
                    resolve({
                        success: true,
                        message: `System PIO (${stdout.trim()}) - ${this.isOnline ? 'Online' : 'Offline'}`,
                        mode: 'System'
                    });
                } else {
                    // 2. 失败则回退到便携版 PIO
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
                }
            });
        });
    }

    /**
     * 获取环境变量
     * 如果是便携模式，会设置 PLATFORMIO_CORE_DIR 等变量
     */
    public getEnv(): NodeJS.ProcessEnv {
        const env = { ...process.env };
        if (this.mode === 'PORTABLE') {
            env['PLATFORMIO_CORE_DIR'] = this.coreDir;
            env['PLATFORMIO_GLOBALLIB_DIR'] = path.join(this.coreDir, 'lib');
            // 离线模式下，禁用自动更新和网络访问
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

    private async runCommand(code: string, buildConfig: PlatformIOTemplate, operation: 'build' | 'upload', port: string | undefined, extensionLibPaths: string[], logCallback: (msg: string) => void, projectPath?: string): Promise<{ success: boolean; exitCode?: number }> {
        const tempDir = path.join(app.getPath('temp'), 'embedblocks_build', 'active_project');
        const workDir = projectPath || tempDir;

        try {
            // 设置目录 (临时模式 vs 项目模式)
            if (!projectPath) {
                // 临时模式: 清理重建
                if (fs.existsSync(tempDir)) {
                    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) { }
                }
                fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
                fs.writeFileSync(path.join(tempDir, 'src', 'main.cpp'), code);

                // 生成 PIO 配置
                const envConfig = generateIniConfig(buildConfig);
                fs.writeFileSync(path.join(tempDir, 'platformio.ini'), envConfig);
            } else {
                // 项目模式: 验证
                const srcPath = path.join(workDir, 'src', 'main.cpp');
                if (code) {
                    if (!fs.existsSync(path.dirname(srcPath))) fs.mkdirSync(path.dirname(srcPath), { recursive: true });
                    fs.writeFileSync(srcPath, code);
                }

                // 检查 platformio.ini，如果缺失则生成
                // 检查 platformio.ini
                const pioPath = path.join(workDir, 'platformio.ini');
                // Always overwrite to ensure settings are applied
                const envConfig = generateIniConfig(buildConfig);
                fs.writeFileSync(pioPath, envConfig);
                // console.log('[PioService] Regenerated platformio.ini based on build config');
            }

            const args = ['run'];
            if (operation === 'upload') {
                args.push('-t', 'upload');
                // 智能端口处理
                let useExplicitPort = true;
                try {
                    const pioContent = fs.readFileSync(path.join(workDir, 'platformio.ini'), 'utf-8');
                    // 如果使用 stlink 等调试器，不需要指定端口
                    if (pioContent.includes('upload_protocol = stlink')) useExplicitPort = false;
                } catch (e) { }

                if (port && useExplicitPort) {
                    args.push('--upload-port', port);
                }
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

}

export const pioService = new PioService();
