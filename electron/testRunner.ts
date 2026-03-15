import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { glob } from 'glob';
import { pioService } from './services/PioService';
import { projectService } from './services/ProjectService';
import { BlockHarness } from './BlockHarness';

/**
 * ============================================================
 * 积木自动化测试与校验引擎 (Block Automated Testing Engine)
 * ============================================================
 * 
 * 本模块负责执行 EmbedBlocks 的自动化测试任务，包括：
 * 1. 导出全量积木的代码片段快照 (Manifest Dump)
 * 2. 在真实硬件平台上进行积木级的真编译校验 (Compilation Test)
 * 3. 清理测试环境
 * 
 * 技术说明:
 * 由于 Blockly 生成器及其扩展模块可能依赖 DOM 环境，
 * 本模块使用 jsdom 在 Node.js (Electron 主进程) 中模拟必要的浏览器全局对象。
 */

// 1. 初始化 jsdom 模拟环境，使 Blockly 能够在没有窗口的情况下运行
const { JSDOM } = require('jsdom');
const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
const { window } = jsdom;
(global as any).window = window;
(global as any).document = window.document;
(global as any).navigator = window.navigator;

// 2. 动态导入 Blockly 及相关生成器逻辑（必须在 JSDOM 初始化之后）
import * as Blockly from 'blockly';
import { arduinoGenerator } from '../src/generators/arduino-base';
import { initAllModules } from '../src/modules/index';

/**
 * 测试结果数据接口
 */
interface TestResult {
    boardId: string;    // 开发板 ID
    success: boolean;   // 是否成功
    error?: string;     // 错误信息
    time: number;       // 耗时
}

/**
 * [辅助函数] 从命令行参数中提取目标板卡列表
 * 支持格式: --board=uno,esp32dev 或 --board uno esp32dev
 */
function getTargetPatterns(): string[] {
    const targetBoardArgIndex = process.argv.findIndex(arg => arg.startsWith('--board'));
    if (targetBoardArgIndex === -1) return [];

    let patterns: string[] = [];
    const arg = process.argv[targetBoardArgIndex];
    if (arg.includes('=')) {
        const val = arg.split('=')[1].trim();
        if (val) patterns.push(...val.split(',').map(v => v.trim()).filter(v => v.length > 0));
    }

    for (let i = targetBoardArgIndex + 1; i < process.argv.length; i++) {
        const nextArg = process.argv[i];
        if (nextArg.startsWith('--')) break;
        patterns.push(...nextArg.split(',').map(v => v.trim()).filter(v => v.length > 0));
    }

    return patterns.map(p => p.toLowerCase().trim());
}

/**
 * 自动化任务入口函数
 * 根据命令行 Flag 路由到不同的子任务
 */
export async function runTests() {
    console.log('\n======================================================');
    console.log(' EmbedBlocks Studio - Automated Testing Framework       ');
    console.log('======================================================\n');

    try {
        const rootDir = app.getAppPath();
        const testWorkDir = path.join(rootDir, 'eb_compilation_tests');

        // 子任务: 清理测试目录
        if (process.argv.includes('--clean-test-projects')) {
            console.log(`[TestRunner] Cleaning up test directory: ${testWorkDir}`);
            if (fs.existsSync(testWorkDir)) {
                fs.rmSync(testWorkDir, { recursive: true, force: true });
                console.log(`[TestRunner] Clean up finished.\n`);
            }
            return;
        }

        // 子任务: 导出积木库元数据清单 (Manifest)
        if (process.argv.includes('--dump-block-manifest')) {
            await dumpBlockManifest();
            return;
        }

        // 子任务: 执行积木级跨平台真编译校验
        if (process.argv.includes('--verify-block-manifest')) {
            await runBlockCompilationTests();
            return;
        }

        // 处理传统看板级测试 (旧版逻辑)
        const runGenerate = process.argv.includes('--generate-test-projects') || process.argv.includes('--run-board-tests');
        const runCompile = process.argv.includes('--compile-test-projects') || process.argv.includes('--run-board-tests');
        
        if (runGenerate) { /* 原有生成逻辑已省略 */ }
        if (runCompile) { /* 原有编译逻辑已省略 */ }

    } catch (e: any) {
        console.error(`[TestRunner] Critical failure: ${e.message}`);
    }
}

/**
 * [核心功能] 导出积木清单 (Manifest Dump)
 * 遍历所有注册的积木，模拟代码生成过程，并将生成的代码片段（包括 Include/Setup 副作用）
 * 导出到 block_compilation_manifest.json 中，作为真编译校验的输入。
 */
async function dumpBlockManifest() {
    console.log(`[Manifest] Starting Full Block Manifest Dump...`);
    
    // 初始化积木库定义
    initAllModules();
    const allBlockTypes = Object.keys(Blockly.Blocks);
    console.log(`[Manifest] Total blocks registered: ${allBlockTypes.length}`);

    const manifest: Record<string, any> = {};
    const families = ['arduino', 'esp32', 'esp8266', 'stm32']; // 测试覆盖的四大芯片家族
    
    const workspace = new Blockly.Workspace();

    // 过滤掉基础积木（如 Math, Logic, Text），专注于我们自定义的硬件相关积木
    const auditedBlocks = allBlockTypes.filter(type => {
        return !['text', 'math_number', 'logic_boolean'].includes(type) &&
            !type.startsWith('controls_') &&
            !type.startsWith('logic_') &&
            !type.startsWith('math_') &&
            !type.startsWith('text_') &&
            !type.startsWith('lists_') &&
            !type.startsWith('variables_') &&
            !type.startsWith('procedures_');
    });

    console.log(`[Manifest] Auditing ${auditedBlocks.length} target blocks...`);

    let count = 0;
    for (const type of auditedBlocks) {
        count++;
        // 进度每完成 10 个打印一次，防止长时间静默
        if (count % 10 === 0) console.log(`[Manifest] Progress: ${count}/${auditedBlocks.length} blocks...`);
        try {
            const block = workspace.newBlock(type);
            manifest[type] = {};

            for (const family of families) {
                // 性能优化: 预判定家族前缀，如果不匹配对应的特定平台前缀则跳过（例如 esp32_ 积木不跑 Uno 测试）
                if (type.startsWith('esp32_') && family !== 'esp32') continue;
                if (type.startsWith('stm32_') && family !== 'stm32') continue;
                if (type.startsWith('esp8266_') && family !== 'esp8266') continue;
                if (type.startsWith('arduino_') && family !== 'arduino') continue;

                // 初始化生成器，设置为目标家族
                arduinoGenerator.init(workspace);
                arduinoGenerator.setFamily(family);

                // 生成积木代码并获取 snapshot (包含 Include, Setup, Macros 等副作用)
                const rawCode = arduinoGenerator.blockToCode(block);
                const codeSnippet = Array.isArray(rawCode) ? rawCode[0] : rawCode;
                arduinoGenerator.finish(codeSnippet || '');

                const snapshot = arduinoGenerator.getSnapshot();
                manifest[type][family] = {
                    snippet: codeSnippet,
                    ...snapshot
                };
            }
        } catch (e: any) {
            console.error(`[Manifest Error] ${type}: ${e.message}`);
        }
    }

    // 将结果写入 JSON 存储
    const manifestPath = path.join(process.cwd(), 'block_compilation_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`[Manifest] Successfully dumped to ${manifestPath}`);
}

/**
 * [核心功能] 执行真编译测试流水线
 * 读取 block_compilation_manifest.json，通过 BlockHarness 为每个积木创建一个模拟项目，
 * 并调用 PlatformIO 执行真实的固件编译任务，确保生成的代码在真实平台上合法。
 */
async function runBlockCompilationTests() {
    const debugLogPath = path.join(process.cwd(), 'block_verify_debug.log');
    
    // 内部日志函数，同时输出到控制台和本地日志文件
    const log = (msg: string) => {
        const time = new Date().toISOString();
        if (!fs.existsSync(debugLogPath)) fs.writeFileSync(debugLogPath, '');
        fs.appendFileSync(debugLogPath, `[${time}] ${msg}\n`);
        console.log(msg);
    };

    try {
        log(`[BlockVerify] Starting Advanced Block Compilation Phase...`);
        
        const manifestPath = path.join(process.cwd(), 'block_compilation_manifest.json');
        const verifyWorkDir = path.join(process.cwd(), 'eb_block_verify_tests');

        if (!fs.existsSync(manifestPath)) {
            log(`[BlockVerify] ERROR: Manifest not found at ${manifestPath}. Run with --dump-block-manifest first.`);
            return;
        }

        // 刷新测试空间
        if (fs.existsSync(verifyWorkDir)) {
            fs.rmSync(verifyWorkDir, { recursive: true, force: true });
        }
        fs.mkdirSync(verifyWorkDir, { recursive: true });

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const blockIds = Object.keys(manifest);
        log(`[BlockVerify] Loaded ${blockIds.length} blocks from manifest.`);
        
        const results: any[] = [];
        // 定义四个家族对应的代表性测试主板型号
        const familyToBoard: Record<string, string> = {
            'arduino': 'uno',
            'esp32': 'esp32dev',
            'esp8266': 'nodemcuv2',
            'stm32': 'generic_stm32f103c8'
        };

        let blockCount = 0;
        for (const blockId of blockIds) {
            blockCount++;
            const platforms = manifest[blockId];
            for (const family of Object.keys(platforms)) {
                // 如果 Manifest 阶段就已经出错，直接记录失败
                if (platforms[family].error) {
                    results.push({ blockId, family, success: false, error: `Generator Error: ${platforms[family].error}` });
                    continue;
                }

                const boardId = familyToBoard[family];
                if (!boardId) continue;

                log(`[BlockVerify] [${blockCount}/${blockIds.length}] Testing [${blockId}] on [${family}] (${boardId})...`);
                
                const projectName = `verify_${blockId}_${family}`.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
                const projectPath = path.join(verifyWorkDir, projectName);

                try {
                    // 1. 构建 PlatformIO 项目配置
                    const platformStr = family === 'arduino' ? 'atmelavr' : (family === 'esp32' ? 'espressif32' : (family === 'esp8266' ? 'espressif8266' : 'ststm32'));
                    const buildConfig: any = { platform: platformStr, board: boardId, framework: 'arduino' };

                    // 2. 调用 ProjectService 创建空项目
                    const res = await projectService.createProject(verifyWorkDir, projectName, boardId, buildConfig);
                    if (!res.success) throw new Error(res.error);

                    // 3. 获取积木代码数据，并使用 BlockHarness 注入到 main.cpp
                    const blockData = platforms[family];
                    const template = BlockHarness.getTemplate(blockId, blockData.snippet);
                    const finalMain = BlockHarness.assembleMain(template, blockData);

                    // 4. 将注入后的代码写入 main.cpp
                    fs.writeFileSync(path.join(projectPath, 'src', 'main.cpp'), finalMain);

                    // 5. 调用 PloService 执行实际编译
                    const buildLogs: string[] = [];
                    const buildRes = await pioService.build('', buildConfig, [], (msg) => {
                         buildLogs.push(msg);
                    }, projectPath);
                    
                    if (buildRes.success) {
                        log(`[BlockVerify] SUCCESS: ${blockId} compiled on ${family}`);
                    } else {
                        log(`[BlockVerify] FAILED: ${blockId} compilation failed on ${family} (Exit Code: ${buildRes.exitCode})`);
                        log(`[BlockVerify] --- Compiler Error Output ---`);
                        // Only log the last 60 lines of output to avoid trace spam, usually enough for the error
                        const contextLogs = buildLogs.slice(-60).join('');
                        log(contextLogs);
                        log(`[BlockVerify] ---------------------------`);
                    }

                    results.push({ blockId, family, success: buildRes.success, exitCode: buildRes.exitCode });

                } catch (e: any) {
                    results.push({ blockId, family, success: false, error: e.message });
                    log(`[BlockVerify] ERROR on [${blockId}]: ${e.message}`);
                }
                
                // 自动清理: 节省磁盘空间，测试完一个删一个
                if (fs.existsSync(projectPath)) {
                    try { fs.rmSync(projectPath, { recursive: true, force: true }); } catch(e){}
                }
            }
        }

        // 最终汇总生成测试报告
        const reportPath = path.join(process.cwd(), 'block_verify_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        log(`\n[BlockVerify] Verification finished. Full results saved to: ${reportPath}`);
    } catch (globalErr: any) {
        log(`[BlockVerify] FATAL CRASH: ${globalErr.message}`);
    }
}
