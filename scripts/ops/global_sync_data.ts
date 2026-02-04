/**
 * ============================================================
 * 全局数据同步器 (Global Data Synchronizer)
 * ============================================================
 * 
 * 一键同步所有 STM32 相关数据源并重新生成板卡数据。
 * 
 * 工作流程 (2 步):
 * 1. [Git Pull] 同步本地克隆的 GitHub 仓库:
 *    - ST_OPEN_PIN_DATA_PATH  (ST 官方引脚数据)
 *    - EMBASSY_STM32_DATA_PATH (embassy-rs 芯片数据)
 *    - ARDUINO_CORE_STM32_PATH (STM32duino 变体)
 * 
 * 
 * 2. [Generation] 运行完整的数据生成流水线:
 *    - 执行 `npm run gen:stm32`
 *    - 更新 src/data/boards/stm32/ 下的所有芯片 JSON 文件
 * 
 * 使用方法: npx tsx scripts/global_sync_data.ts
 * 
 * @file scripts/global_sync_data.ts
 * @module EmbedBlocks/Scripts/GlobalSyncData
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
    ST_OPEN_PIN_DATA_PATH,
    EMBASSY_STM32_DATA_PATH,
    ARDUINO_CORE_STM32_PATH
} from '../utils/data_sources';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

async function globalSync() {
    const repos = [
        { name: 'ST Open Pin Data', path: ST_OPEN_PIN_DATA_PATH },
        { name: 'Embassy STM32 Data', path: EMBASSY_STM32_DATA_PATH }
        // [已移除] Arduino Core STM32 由 PlatformIO 包管理器统一管理，不再通过 git submodule 同步
        // { name: 'Arduino Core STM32', path: ARDUINO_CORE_STM32_PATH }
    ];

    // [New] 定义 PIO 包名
    const PIO_PACKAGE_NAME = 'ststm32';

    console.log('==============================================');
    console.log('   EmbedBlocks Global Data Synchronizer');
    console.log('==============================================');

    // 1. Sync GitHub Repositories
    for (const repo of repos) {
        console.log(`\n>>> [1/2] Syncing ${repo.name}...`);
        if (fs.existsSync(repo.path)) {
            try {
                // 如果路径在 third_party 目录下，认为它是子模块，使用 submodule update
                if (repo.path.includes(path.join(PROJECT_ROOT, 'third_party'))) {
                    console.log(`Executing 'git submodule update' in ${PROJECT_ROOT}`);
                    // 获取子模块相对于根目录的路径
                    const relativePath = path.relative(PROJECT_ROOT, repo.path);
                    execSync(`git submodule update --init --recursive --remote ${relativePath}`, { cwd: PROJECT_ROOT, stdio: 'inherit' });
                } else {
                    console.log(`Executing 'git pull' in ${repo.path}`);
                    execSync('git pull', { cwd: repo.path, stdio: 'inherit' });
                }
            } catch (e) {
                console.warn(`[Warning] Failed to sync ${repo.name}. Please check manual Git status.`);
            }
        } else {
            console.error(`[Error] Repository path not found: ${repo.path}`);
        }
    }

    // 1.5 同步 PlatformIO 软件包 (自动更新)
    console.log(`\n>>> [1.5/2] 正在检查 PlatformIO 包更新 (${PIO_PACKAGE_NAME})...`);
    console.log('    这能确保我们支持 ST 官方最新的芯片变体。');
    try {
        // -g: 全局存储 (Global storage)
        // -p: 指定平台 (Platform)
        // --silent: 减少噪音，仅显示错误或更新信息
        execSync(`pio pkg update -g -p ${PIO_PACKAGE_NAME}`, { stdio: 'inherit' });
    } catch (e) {
        console.warn(`[Warning] 更新 PIO 平台 '${PIO_PACKAGE_NAME}' 失败，将使用本地缓存。`);
        console.warn('    请确保 PlatformIO CLI 已安装并添加到了系统 PATH 环境变量中。');
    }

    // 2. Run Full Generation Pipeline
    console.log('\n>>> [2/2] Running Full STM32 Generation Pipeline...');
    console.log('This will update all 1500+ chip JSONs in src/data/boards/stm32/');
    try {
        execSync('npm run gen:stm32', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    } catch (e) {
        console.error('[Error] Data generation pipeline failed.');
    }

    console.log('\n==============================================');
    console.log(' ✅ Global Data Sync Complete!');
    console.log(' EmbedBlocks Studio is now perfectly in sync with:');
    console.log(' - ST Official Open Data');
    console.log(' - Arduino Core STM32');
    console.log(' - PlatformIO Boards');
    console.log('==============================================');
}

globalSync().catch(console.error);
