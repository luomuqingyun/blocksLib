import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { EMBASSY_STM32_DATA_PATH } from './data_sources';

/**
 * ============================================================
 * 未支持芯片统计工具 (Unsupported Chips Statistics Tool)
 * ============================================================
 * 
 * 扫描 Embassy-rs 数据源中的所有芯片，并与 `stm32duino_support_registry.json`
 * (已支持列表) 进行比对，输出未支持的芯片清单。
 * 
 * 用途:
 * - 评估对新系列芯片的支持缺口
 * - 规划后续添加支持的 roadmap
 * 
 * @file scripts/list_unsupported.ts
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHIPS_DIR = path.join(EMBASSY_STM32_DATA_PATH, 'data/chips');
const REGISTRY_PATH = path.join(__dirname, 'stm32duino_support_registry.json');

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const supportedMcus = new Set<string>();
// 构建支持的 MCU 集合 (转小写)
Object.values(registry).forEach((entry: any) => {
    if (entry.mcu) supportedMcus.add(entry.mcu.toLowerCase());
});

const chipFiles = fs.readdirSync(CHIPS_DIR).filter(f => f.endsWith('.json'));
const missing: string[] = [];
const totalsBySeries: Record<string, number> = {};

chipFiles.forEach(file => {
    const chipData = JSON.parse(fs.readFileSync(path.join(CHIPS_DIR, file), 'utf8'));
    const name = chipData.name;
    const normalizedName = name.toLowerCase();
    // 检查是否在支持列表中 (前缀匹配)
    const isSupported = Array.from(supportedMcus).some(mcu => mcu.startsWith(normalizedName));

    if (!isSupported) {
        missing.push(name);
        const series = chipData.family || 'Unknown';
        totalsBySeries[series] = (totalsBySeries[series] || 0) + 1;
    }
});

console.log(`Open Data 总芯片数: ${chipFiles.length}`);
console.log(`未支持芯片总数: ${missing.length}`);
console.log(`按系列统计缺失数:`, JSON.stringify(totalsBySeries, null, 2));
console.log(`缺失芯片清单:`, JSON.stringify(missing.sort(), null, 2));
