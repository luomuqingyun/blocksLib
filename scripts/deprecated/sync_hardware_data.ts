/**
 * ============================================================
 * 硬件数据同步脚本 (Hardware Data Sync Script)
 * ============================================================
 * 
 * 从 PlatformIO CLI 获取最新的 STM32 板卡列表，并重新生成兼容性映射。
 * 
 * 工作流程 (2 步):
 * 1. [Fetch] 从 PlatformIO 获取最新的 STM32 板卡数据:
 *    - 执行 `pio boards ststm32 --json-output`
 *    - 保存到 scripts/pio_stm32_full.json
 * 
 * 2. [Generate] 重新生成兼容性映射:
 *    - 执行 6_generate_compatibility_map.ts 脚本
 *    - 更新 stm32_compatibility.json
 * 
 * 前置条件:
 * - 需要安装 PlatformIO CLI 并添加到系统 PATH
 * 
 * 使用方法: npx tsx scripts/sync_hardware_data.ts
 * 
 * @file scripts/sync_hardware_data.ts
 * @module EmbedBlocks/Scripts/SyncHardwareData
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PIO_JSON_PATH = path.join(__dirname, 'pio_stm32_full.json');
const MAP_GEN_SCRIPT = path.join(__dirname, '6_generate_compatibility_map.ts');

async function sync() {
    console.log('>>> [1/2] Fetching latest STM32 boards from PlatformIO...');
    try {
        // Run pio boards command and capture JSON output
        const output = execSync('pio boards ststm32 --json-output', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        fs.writeFileSync(PIO_JSON_PATH, output);
        console.log(`Successfully updated ${PIO_JSON_PATH}`);
    } catch (e) {
        console.error('Failed to fetch PIO boards. Please ensure PlatformIO CLI is installed.', e);
        return;
    }

    console.log('\n>>> [2/2] Regenerating compatibility map with strict rules...');
    try {
        // Run the mapping script using tsx
        execSync(`npx tsx "${MAP_GEN_SCRIPT}"`, { stdio: 'inherit' });
        console.log('\n✅ Sync Complete! stm32_compatibility.json is now up-to-date.');
    } catch (e) {
        console.error('Failed to regenerate compatibility map.', e);
    }
}

sync().catch(console.error);
