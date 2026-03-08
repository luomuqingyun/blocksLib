import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { glob } from 'glob';
import { pioService } from './services/PioService';
import { projectService } from './services/ProjectService';

// 定义测试结果接口
interface TestResult {
    boardId: string;
    success: boolean;
    error?: string;
    time: number;
}

/** [Helper] Extract multiple board patterns from arguments (comma or space separated) */
function getTargetPatterns(): string[] {
    const targetBoardArgIndex = process.argv.findIndex(arg => arg.startsWith('--board'));
    if (targetBoardArgIndex === -1) return [];

    let patterns: string[] = [];
    const arg = process.argv[targetBoardArgIndex];
    if (arg.includes('=')) {
        const val = arg.split('=')[1].trim();
        if (val) patterns.push(...val.split(',').map(v => v.trim()).filter(v => v.length > 0));
    }

    // Collect subsequent arguments that don't start with '--'
    for (let i = targetBoardArgIndex + 1; i < process.argv.length; i++) {
        const nextArg = process.argv[i];
        if (nextArg.startsWith('--')) break;
        patterns.push(...nextArg.split(',').map(v => v.trim()).filter(v => v.length > 0));
    }

    return patterns.map(p => p.toLowerCase().trim());
}

export async function runTests() {
    console.log('\n======================================================');
    console.log(' EmbedBlocks Studio - Automated Testing Framework       ');
    console.log('======================================================\n');

    try {
        const rootDir = app.getAppPath();
        const testWorkDir = path.join(rootDir, 'eb_compilation_tests');

        if (process.argv.includes('--clean-test-projects')) {
            console.log(`[TestRunner] Cleaning up test directory: ${testWorkDir}`);
            if (fs.existsSync(testWorkDir)) {
                fs.rmSync(testWorkDir, { recursive: true, force: true });
                console.log(`[TestRunner] Clean up finished.\n`);
            } else {
                console.log(`[TestRunner] Nothing to clean.\n`);
            }
            return;
        }

        const runGenerate = process.argv.includes('--generate-test-projects') || process.argv.includes('--run-board-tests');
        const runCompile = process.argv.includes('--compile-test-projects') || process.argv.includes('--run-board-tests');

        if (runGenerate) {
            console.log(`[TestRunner] Starting Project GENERATION phase...\n`);

            // [注意] 我们稍后会根据 targetId 决定是否要执行全局清空
            const testWorkDirExists = fs.existsSync(testWorkDir);
            let boardsToTest: { id: string, name: string, framework?: string, mcu?: string, package?: string, isStm32: boolean }[] = [];

            // 加载标准板卡 (Arduino, ESP32 等)
            const standardGlobPath = path.join(rootDir, 'src', 'data', 'boards', 'standard', '**', '*.json').replace(/\\/g, '/');
            const standardFiles = glob.sync(standardGlobPath);
            for (const file of standardFiles) {
                try {
                    const b = JSON.parse(fs.readFileSync(file, 'utf-8'));
                    if (b.id) boardsToTest.push({
                        id: b.id,
                        name: b.name || b.id,
                        framework: b.framework || 'arduino',
                        mcu: b.mcu,
                        package: b.package, // 提取开发包分类，比如 BOARD_MEGA 对应 atmelavr，BOARD_ESP32 对应 espressif32
                        isStm32: false
                    });
                } catch (e) { }
            }

            // 加载 STM32 板卡
            const stm32GlobPath = path.join(rootDir, 'src', 'data', 'boards', 'stm32', '**', '*.json').replace(/\\/g, '/');
            const stm32Files = glob.sync(stm32GlobPath);
            for (const file of stm32Files) {
                try {
                    const b = JSON.parse(fs.readFileSync(file, 'utf-8'));
                    if (b.id) boardsToTest.push({ id: b.id, name: b.name || b.id, isStm32: true });
                } catch (e) { }
            }

            // [Multi-Board Support] Extract all target board patterns
            const targetPatterns = getTargetPatterns();

            if (targetPatterns.length > 0) {
                const normalizedTargets = targetPatterns.map(p => p.replace(/[-_]/g, ''));
                boardsToTest = boardsToTest.filter(b => {
                    const boardIdNorm = b.id.toLowerCase().replace(/[-_]/g, '');
                    return normalizedTargets.some(target => boardIdNorm.includes(target));
                });
                console.log(`[TestRunner] Filter active: Generating tests for boards matching -> [${targetPatterns.join(', ')}]`);
            } else {
                const limitStr = process.env.TEST_LIMIT;
                if (limitStr) {
                    const limit = parseInt(limitStr);
                    console.log(`[TestRunner] Limiting to ${limit} boards due to TEST_LIMIT env var.`);
                    boardsToTest = boardsToTest.slice(0, limit);
                }

                // 全量测试时，清空整个目录
                if (testWorkDirExists) {
                    console.log(`[TestRunner] Bulk mode detected: Cleaning up previous test directory: ${testWorkDir}`);
                    fs.rmSync(testWorkDir, { recursive: true, force: true });
                }
            }

            // 确保测试父目录存在
            fs.mkdirSync(testWorkDir, { recursive: true });

            // --- 并行生成逻辑 ---
            let concurrency = Math.max(1, Math.floor(os.cpus().length / 2));
            const jobsArgIndex = process.argv.findIndex(arg => arg.startsWith('-j') || arg.startsWith('--jobs'));
            if (jobsArgIndex !== -1) {
                const arg = process.argv[jobsArgIndex];
                if (arg.includes('=')) {
                    concurrency = parseInt(arg.split('=')[1]);
                } else {
                    const nextArg = process.argv[jobsArgIndex + 1];
                    if (nextArg && !isNaN(parseInt(nextArg))) {
                        concurrency = parseInt(nextArg);
                    }
                }
            }

            let gFinished = 0, gSuccess = 0, gFail = 0;
            console.log(`\nFound ${boardsToTest.length} boards. Generating full .ebproj directories at: ${testWorkDir} (Parallelism: ${concurrency} jobs)\n`);

            const genQueue = [...boardsToTest];
            const genWorkers: Promise<void>[] = [];

            const processGeneration = async (board: any) => {
                // [Sync] Use board.name for folder naming to keep it consistent with UI
                const sanitizedName = board.name.replace(/[^a-zA-Z0-9]/g, '_');
                const testProjectName = `test_${sanitizedName}`;
                const projectPath = path.join(testWorkDir, testProjectName);

                try {
                    // 推断 PlatformIO 需要的 platform 标识
                    let platformStr = undefined;
                    if (board.isStm32) {
                        platformStr = 'ststm32';
                    } else if (board.mcu && board.mcu.toUpperCase().includes('ESP32')) {
                        platformStr = 'espressif32';
                    } else if (board.mcu && board.mcu.toUpperCase().includes('ATMEGA')) {
                        platformStr = 'atmelavr';
                    } else if (board.package) {
                        if (board.package.includes('BOARD_UNO') || board.package.includes('BOARD_MEGA') || board.package.includes('BOARD_NANO') || board.package.includes('BOARD_LEONARDO')) {
                            platformStr = 'atmelavr';
                        } else if (board.package.includes('BOARD_ESP32')) {
                            platformStr = 'espressif32';
                        }
                    }

                    const buildConfig: any = {
                        board: board.id,
                        framework: board.framework || 'arduino',
                        platform: platformStr
                    };

                    if (fs.existsSync(projectPath)) {
                        await fs.promises.rm(projectPath, { recursive: true, force: true });
                    }

                    const createRes = await projectService.createProject(testWorkDir, testProjectName, board.id, buildConfig);
                    if (!createRes.success) throw new Error(createRes.error);

                    // B. 注入合法的 Blockly JSON 到 .ebproj
                    const ebprojPath = path.join(projectPath, `${testProjectName}.ebproj`);
                    if (fs.existsSync(ebprojPath)) {
                        const projData = JSON.parse(fs.readFileSync(ebprojPath, 'utf8'));
                        projData.blocks = {
                            languageVersion: 0,
                            blocks: [
                                {
                                    type: "arduino_entry_root",
                                    id: "default_entry_root",
                                    x: 50,
                                    y: 50,
                                    inputs: {
                                        LOOP_STACK: {
                                            block: {
                                                type: "arduino_digital_toggle",
                                                id: "toggle_block",
                                                fields: { PIN: "LED_BUILTIN" },
                                                next: {
                                                    block: {
                                                        type: "arduino_delay_ms",
                                                        id: "delay_block",
                                                        inputs: {
                                                            DELAY: {
                                                                shadow: {
                                                                    type: "math_number",
                                                                    id: "delay_val",
                                                                    fields: { NUM: 1000 }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            ]
                        };
                        fs.writeFileSync(ebprojPath, JSON.stringify(projData, null, 2));
                    }

                    // C. 注入对应的等效测试 C++ 代码
                    const mainCpp = `
#include <Arduino.h>
#ifndef LED_BUILTIN
  #define LED_BUILTIN 2
#endif

// 由 EmbedBlocks 逻辑生成
bool toggleState_LED_BUILTIN = false;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  toggleState_LED_BUILTIN = !toggleState_LED_BUILTIN;
  digitalWrite(LED_BUILTIN, toggleState_LED_BUILTIN ? HIGH : LOW);
  delay(1000);
}
`;
                    fs.writeFileSync(path.join(projectPath, 'src', 'main.cpp'), mainCpp.trim());
                    // 在项目根目录留个标记文件，记录这是基于什么芯片生成的，方便编译阶段读取
                    // 从刚创建完的 ebproj 里读取最终确定的 buildConfig，因为 ProjectService 可能会回退填充 default 属性
                    let finalBuildConfig = buildConfig;
                    if (fs.existsSync(ebprojPath)) {
                        try {
                            const savedData = JSON.parse(fs.readFileSync(ebprojPath, 'utf8'));
                            if (savedData.metadata && savedData.metadata.buildConfig) {
                                finalBuildConfig = savedData.metadata.buildConfig;
                            }
                        } catch (e) { }
                    }
                    fs.writeFileSync(path.join(projectPath, 'test_meta.json'), JSON.stringify(finalBuildConfig));

                    gSuccess++;
                } catch (err: any) {
                    process.stdout.write(`\n❌ [FAILED] Generation Failed for: ${board.id} | Reason: ${err.message}\n`);
                    gFail++;
                } finally {
                    gFinished++;
                    process.stdout.write(`\r[TestRunner] Generation Progress: ${gFinished}/${boardsToTest.length} | Success: ${gSuccess} | Fail: ${gFail}      `);
                }
            };

            for (let i = 0; i < concurrency; i++) {
                genWorkers.push((async () => {
                    while (genQueue.length > 0) {
                        const board = genQueue.shift();
                        if (board) await processGeneration(board);
                    }
                })());
            }

            await Promise.all(genWorkers);

            console.log(`\n\n[TestRunner] Generation Phase Complete. Success: ${gSuccess}, Failed: ${gFail}`);
            console.log(`[TestRunner] Test projects are located at: ${testWorkDir}\n`);
            if (!runCompile) return;
        }

        if (runCompile) {
            console.log(`[TestRunner] Starting Project COMPILATION phase...\n`);

            if (!fs.existsSync(testWorkDir)) {
                console.error(`[TestRunner] Test directory not found! Please run generation step first.\n`);
                return;
            }

            let projectDirs = fs.readdirSync(testWorkDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            // [Multi-Board Support] Extract all target board patterns
            const compileTargetPatterns = getTargetPatterns();

            if (compileTargetPatterns.length > 0) {
                const normalizedCompileTargets = compileTargetPatterns.map(p => p.replace(/[-_]/g, ''));
                projectDirs = projectDirs.filter(d => {
                    const dirNameNorm = d.toLowerCase().replace(/[-_]/g, '');
                    return normalizedCompileTargets.some(target => dirNameNorm.includes(target));
                });
                console.log(`[TestRunner] Filter active: Only compiling tests matching -> [${compileTargetPatterns.join(', ')}]`);
            }

            if (projectDirs.length === 0) {
                console.log(`[TestRunner] No projects to compile in test directory.\n`);
                return;
            }

            // --- 多线程并行核心配置 ---
            let concurrency = Math.max(1, Math.floor(os.cpus().length / 2));
            const jobsArgIndex = process.argv.findIndex(arg => arg.startsWith('-j') || arg.startsWith('--jobs'));
            if (jobsArgIndex !== -1) {
                const arg = process.argv[jobsArgIndex];
                if (arg.includes('=')) {
                    concurrency = parseInt(arg.split('=')[1]);
                } else {
                    const nextArg = process.argv[jobsArgIndex + 1];
                    if (nextArg && !isNaN(parseInt(nextArg))) {
                        concurrency = parseInt(nextArg);
                    }
                }
            }
            console.log(`[TestRunner] Discovered ${projectDirs.length} projects to compile. Parallelism: ${concurrency} jobs.\n`);

            const results: TestResult[] = [];
            let finishedCount = 0;
            let successCount = 0;
            let failCount = 0;
            const failedBoards: string[] = [];

            // 并行执行队列
            const queue = [...projectDirs];
            const workers: Promise<void>[] = [];

            const processProject = async (projectName: string) => {
                const projectPath = path.join(testWorkDir, projectName);
                const metaPath = path.join(projectPath, 'test_meta.json');

                let buildConfig: any = {};
                if (fs.existsSync(metaPath)) {
                    buildConfig = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                } else {
                    console.warn(`[WARNING] Skipping ${projectName}, missing test_meta.json`);
                    return;
                }

                const startTime = Date.now();
                try {
                    const tempLogFile = path.join(projectPath, 'test_build.log');
                    const buildRes = await pioService.build('', buildConfig, [], (log: string) => {
                        fs.appendFileSync(tempLogFile, log + '\n');
                    }, projectPath);

                    const timeTaken = Date.now() - startTime;
                    finishedCount++;

                    if (buildRes.success) {
                        successCount++;
                        // 编译成功后，为节约磁盘空间，自动删除沉重的底层编译产物
                        const pioBuildDir = path.join(projectPath, '.pio', 'build');
                        if (fs.existsSync(pioBuildDir)) {
                            fs.rmSync(pioBuildDir, { recursive: true, force: true });
                        }
                        results.push({ boardId: buildConfig.board, success: true, time: timeTaken });
                    } else {
                        throw new Error(`Compilation failed (Exit Code: ${buildRes.exitCode}). See test_build.log for details.`);
                    }
                } catch (err: any) {
                    const timeTaken = Date.now() - startTime;
                    finishedCount++;
                    failCount++;
                    console.error(`❌ [FAILED] Project: ${projectName} (${buildConfig.board}) | Reason: ${err.message}`);
                    failedBoards.push(`${buildConfig.board} (${projectName})`);
                    results.push({ boardId: buildConfig.board, success: false, error: err.message, time: timeTaken });
                }

                // 更新整体进度
                process.stdout.write(`\r[TestRunner] Compilation Progress: ${finishedCount}/${projectDirs.length} | Success: ${successCount} | Fail: ${failCount}      `);
            };

            for (let i = 0; i < concurrency; i++) {
                workers.push((async () => {
                    while (queue.length > 0) {
                        const project = queue.shift();
                        if (project) await processProject(project);
                    }
                })());
            }

            await Promise.all(workers);

            process.stdout.write(`\n`);
            console.log('======================================================');
            console.log(' Compilation Summary');
            console.log('======================================================');
            console.log(`Total Compiled : ${projectDirs.length}`);
            console.log(`Success        : ${successCount}`);
            console.log(`Failed         : ${failCount}`);

            if (failedBoards.length > 0) {
                console.log(`\nFailed Boards ([!] PLEASE FIX THESE):\n  - ${failedBoards.join('\n  - ')}`);
            }

            const reportPath = path.join(testWorkDir, 'compilation_report.json');
            fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
            console.log(`\nDetailed report saved to: ${reportPath}`);
            console.log('======================================================\n');
            return;
        }

    } catch (err) {
        console.error('[TestRunner] Fatal error during test execution:', err);
    } finally {
        // 自动退出应用
        app.quit();
    }
}
