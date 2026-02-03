import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * ============================================================
 * 芯片生成差异对比工具 (Chip Generation Diff Tool)
 * ============================================================
 * 
 * 对比 `stm32_board_data.json` (数据源) 与 `src/data/boards/stm32` (已生成文件)
 * 找出尚未生成的芯片型号。
 * 
 * 用途:
 * - 验证数据生成脚本的覆盖率
 * - 找出漏生成的芯片
 * 
 * @file scripts/diff_chips.ts
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

const basicDataPath = path.join(__dirname, 'stm32_board_data.json');
const outputDir = path.join(PROJECT_ROOT, 'src/data/boards/stm32');

const basicData = JSON.parse(fs.readFileSync(basicDataPath, 'utf8'));
const stm32Series = basicData['STM32'];

const allSourceChips: string[] = [];
// 遍历所有系列的芯片列表
Object.keys(stm32Series).forEach(series => {
    stm32Series[series].forEach((chip: any) => {
        if (chip.mcu) {
            allSourceChips.push(chip.mcu);
        }
    });
});

const generatedChips: string[] = [];
// 扫描输出目录下的所有 JSON 文件
if (fs.existsSync(outputDir)) {
    const seriesDirs = fs.readdirSync(outputDir);
    seriesDirs.forEach(dir => {
        const fullDir = path.join(outputDir, dir);
        if (fs.existsSync(fullDir) && fs.statSync(fullDir).isDirectory()) {
            const files = fs.readdirSync(fullDir);
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    // 方式 1: 从文件名推断
                    generatedChips.push(file.replace('.json', '').replace(/_/g, ' '));

                    // 方式 2: 读取文件内容确认 MCU 字段 (更准确)
                    try {
                        const content = JSON.parse(fs.readFileSync(path.join(fullDir, file), 'utf-8'));
                        if (content.mcu) {
                            generatedChips.push(content.mcu.toUpperCase());
                        }
                    } catch (e) {
                        // 忽略读取错误
                    }
                }
            });
        }
    });
}

const generatedSet = new Set(generatedChips.map(c => c.toUpperCase()));
const missing = allSourceChips.filter(c => !generatedSet.has(c.toUpperCase()));

console.log(`Total Source Chips: ${allSourceChips.length}`);
console.log(`Total Generated Chips (Unique): ${generatedSet.size}`);
console.log(`Missing Chips (${missing.length}):`);
console.log(JSON.stringify(missing, null, 2));
