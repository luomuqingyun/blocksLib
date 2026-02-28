import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';
import { pioService } from './services/PioService';

// 定义测试结果接口
interface TestResult {
    boardId: string;
    success: boolean;
    error?: string;
    time: number;
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

            // 支持指定具体的板卡测试 (e.g. --board=generic_stm32f103ze, 或模糊的 STM32F103)
            let targetId: string | undefined;
            const targetBoardArgIndex = process.argv.findIndex(arg => arg.startsWith('--board'));
            if (targetBoardArgIndex !== -1) {
                const arg = process.argv[targetBoardArgIndex];
                if (arg.includes('=')) {
                    // 处理 --board=xxx 
                    const splitVal = arg.split('=')[1].trim();
                    // 处理 npm 把参数分成 '--board=', 'xxx' 两项被传入的情况
                    targetId = splitVal || process.argv[targetBoardArgIndex + 1];
                } else {
                    // 处理 --board xxx 的情况
                    targetId = process.argv[targetBoardArgIndex + 1];
                }
            }

            if (targetId && typeof targetId === 'string') {
                targetId = targetId.toLowerCase().trim();
                const normalizedTarget = targetId.replace(/[-_]/g, '');
                boardsToTest = boardsToTest.filter(b => b.id.toLowerCase().replace(/[-_]/g, '').includes(normalizedTarget));
                console.log(`[TestRunner] Filter active: Only generating test for board -> ${targetId} (normalized: ${normalizedTarget})`);
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

            const { projectService } = await import('./services/ProjectService');

            let gSuccess = 0, gFail = 0;
            console.log(`\nFound ${boardsToTest.length} boards. Generating full .ebproj directories at: ${testWorkDir}\n`);

            for (let i = 0; i < boardsToTest.length; i++) {
                const board = boardsToTest[i];
                const testProjectName = `test_${board.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const projectPath = path.join(testWorkDir, testProjectName);
                console.log(`\n--- DEBUG BOARD IN LOOP ---`);
                console.log(JSON.stringify(board, null, 2));

                process.stdout.write(`\r[${i + 1}/${boardsToTest.length}] Generating: ${board.id} ...      `);

                try {
                    // 推断 PlatformIO 需要的 platform 标识
                    let platformStr = undefined;
                    if (board.isStm32) {
                        platformStr = 'ststm32';
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

                    const projectPath = path.join(testWorkDir, testProjectName);
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

// Auto-generated by EmbedBlocks Toggle Block Logic
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
                }
            }
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

            // 支持专门编译某个特定测试工程 (模糊匹配)
            let compileTargetId: string | undefined;
            const compileTargetBoardArgIndex = process.argv.findIndex(arg => arg.startsWith('--board'));
            if (compileTargetBoardArgIndex !== -1) {
                const arg = process.argv[compileTargetBoardArgIndex];
                if (arg.includes('=')) {
                    const splitVal = arg.split('=')[1].trim();
                    // 处理 npm 把参数分成 '--board=', 'xxx' 两项被传入的情况
                    compileTargetId = splitVal || process.argv[compileTargetBoardArgIndex + 1];
                } else {
                    compileTargetId = process.argv[compileTargetBoardArgIndex + 1];
                }
            }

            if (compileTargetId && typeof compileTargetId === 'string') {
                compileTargetId = compileTargetId.toLowerCase().trim();
                const normalizedCompileTarget = compileTargetId.replace(/[-_]/g, '');
                projectDirs = projectDirs.filter(d => d.toLowerCase().replace(/[-_]/g, '').includes(normalizedCompileTarget));
                console.log(`[TestRunner] Filter active: Only compiling test for board containing -> ${compileTargetId} (normalized: ${normalizedCompileTarget})`);
            }

            if (projectDirs.length === 0) {
                console.log(`[TestRunner] No projects to compile in test directory.\n`);
                return;
            }

            console.log(`[TestRunner] Discovered ${projectDirs.length} projects to compile. Only failures will be logged.\n`);

            const results: TestResult[] = [];
            let successCount = 0;
            let failCount = 0;
            const failedBoards: string[] = [];

            for (let i = 0; i < projectDirs.length; i++) {
                const projectName = projectDirs[i];
                const projectPath = path.join(testWorkDir, projectName);
                const metaPath = path.join(projectPath, 'test_meta.json');

                let buildConfig: any = {};
                if (fs.existsSync(metaPath)) {
                    buildConfig = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                } else {
                    console.warn(`\n[WARNING] Skipping ${projectName}, missing test_meta.json`);
                    continue;
                }

                process.stdout.write(`\r[${i + 1}/${projectDirs.length}] Compiling project: ${projectName}...      `);
                const startTime = Date.now();

                try {
                    const tempLogFile = path.join(projectPath, 'test_build.log');

                    const buildRes = await pioService.build('', buildConfig, [], (log: string) => {
                        fs.appendFileSync(tempLogFile, log + '\n');
                    }, projectPath);

                    if (!buildRes.success) {
                        throw new Error(`Compilation failed (Exit Code: ${buildRes.exitCode}). See test_build.log for details.`);
                    }

                    const timeTaken = Date.now() - startTime;
                    successCount++;
                    results.push({ boardId: buildConfig.board, success: true, time: timeTaken });

                } catch (err: any) {
                    const timeTaken = Date.now() - startTime;
                    process.stdout.write(`\n❌ [FAILED] Project: ${projectName} (${buildConfig.board})\n`);
                    console.error(`           Reason: ${err.message}\n`);
                    failCount++;
                    failedBoards.push(`${buildConfig.board} (${projectName})`);
                    results.push({ boardId: buildConfig.board, success: false, error: err.message, time: timeTaken });
                }
            }

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
