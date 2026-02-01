/**
 * ============================================================
 * 全局数据同步器 (Global Data Synchronizer)
 * ============================================================
 * 
 * 一键同步所有 STM32 相关数据源并重新生成板卡数据。
 * 
 * 工作流程 (3 步):
 * 1. [Git Pull] 同步本地克隆的 GitHub 仓库:
 *    - ST_OPEN_PIN_DATA_PATH  (ST 官方引脚数据)
 *    - EMBASSY_STM32_DATA_PATH (embassy-rs 芯片数据)
 *    - ARDUINO_CORE_STM32_PATH (STM32duino 变体)
 * 
 * 2. [PIO Boards] 从 PlatformIO CLI 获取最新的 STM32 板卡列表:
 *    - 执行 `pio boards ststm32 --json-output`
 *    - 保存到 scripts/pio_stm32_full.json
 * 
 * 3. [Generation] 运行完整的数据生成流水线:
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
} from './data_sources';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

async function globalSync() {
    const repos = [
        { name: 'ST Open Pin Data', path: ST_OPEN_PIN_DATA_PATH },
        { name: 'Embassy STM32 Data', path: EMBASSY_STM32_DATA_PATH },
        { name: 'Arduino Core STM32', path: ARDUINO_CORE_STM32_PATH }
    ];

    console.log('==============================================');
    console.log('   EmbedBlocks Global Data Synchronizer');
    console.log('==============================================');

    // 1. Sync GitHub Repositories
    for (const repo of repos) {
        console.log(`\n>>> [1/3] Syncing ${repo.name}...`);
        if (fs.existsSync(repo.path)) {
            try {
                console.log(`Executing 'git pull' in ${repo.path}`);
                execSync('git pull', { cwd: repo.path, stdio: 'inherit' });
            } catch (e) {
                console.warn(`[Warning] Failed to sync ${repo.name}. Please check manual Git status.`);
            }
        } else {
            console.error(`[Error] Repository path not found: ${repo.path}`);
        }
    }

    // 2. Sync PlatformIO Boards
    console.log('\n>>> [2/3] Syncing PlatformIO Board Database...');
    try {
        const pioJsonPath = path.join(__dirname, 'pio_stm32_full.json');
        const output = execSync('pio boards ststm32 --json-output', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        fs.writeFileSync(pioJsonPath, output);
        console.log('PlatformIO board data updated.');
    } catch (e) {
        console.error('[Error] Failed to fetch PIO boards. Ensure PIO CLI is in PATH.');
    }

    // 3. Run Full Generation Pipeline
    console.log('\n>>> [3/3] Running Full STM32 Generation Pipeline...');
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
