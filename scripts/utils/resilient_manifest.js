const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 微批次积木验证器 - 极高兼容模式
 */

const schemaPath = path.join(__dirname, '../../src/data/ai_block_schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const allBlocks = schema.blocks.map(b => b.type);

console.log(`Auditing ${allBlocks.length} blocks using micro-batches (5 blocks each)...`);

const BATCH_SIZE = 5;
const rootDir = path.join(__dirname, '../../');
const finalManifestPath = path.join(rootDir, 'block_compilation_manifest.json');
let fullManifest = {};

// 尝试加载已有的结果（支持断点续传）
if (fs.existsSync(finalManifestPath)) {
    try {
        fullManifest = JSON.parse(fs.readFileSync(finalManifestPath, 'utf8'));
        console.log(`Loaded existing manifest with ${Object.keys(fullManifest).length} blocks.`);
    } catch(e) {}
}

const families = ['arduino', 'esp32', 'esp8266', 'stm32'];

for (let i = 0; i < allBlocks.length; i += BATCH_SIZE) {
    const batch = allBlocks.slice(i, i + BATCH_SIZE);
    
    // 如果这些积木已经在 manifest 中了，跳过
    if (batch.every(b => fullManifest[b])) continue;

    console.log(`\n[${i}/${allBlocks.length}] Processing: ${batch.join(', ')}`);
    
    const tempTestFile = path.join(rootDir, `src/generators/micro_batch.test.ts`);
    const testContent = `
import { describe, it, beforeAll } from 'vitest';
import * as Blockly from 'blockly';
import { arduinoGenerator } from './arduino-base';
import { initAllModules } from '../modules/index';
import * as fs from 'fs';
import * as path from 'path';

describe('Micro Batch', () => {
    beforeAll(() => { initAllModules(); });
    it('run', () => {
        const manifest = {};
        const workspace = new Blockly.Workspace();
        ${JSON.stringify(batch)}.forEach(type => {
            try {
                const block = workspace.newBlock(type);
                manifest[type] = {};
                ${JSON.stringify(families)}.forEach(family => {
                    if (type.startsWith('esp32_') && family !== 'esp32') return;
                    if (type.startsWith('stm32_') && family !== 'stm32') return;
                    if (type.startsWith('esp8266_') && family !== 'esp8266') return;
                    if (type.startsWith('arduino_') && family !== 'arduino') return;

                    arduinoGenerator.init(workspace);
                    arduinoGenerator.setFamily(family);
                    const rawCode = arduinoGenerator.blockToCode(block);
                    const snippet = Array.isArray(rawCode) ? rawCode[0] : rawCode;
                    arduinoGenerator.finish(snippet || '');
                    manifest[type][family] = { snippet, ...arduinoGenerator.getSnapshot() };
                });
            } catch (e) {
                console.error(type + ': ' + e.message);
            }
        });
        fs.writeFileSync(path.join(process.cwd(), 'micro_result.json'), JSON.stringify(manifest, null, 2));
    });
});
`;

    fs.writeFileSync(tempTestFile, testContent);
    
    try {
        // 单个测试运行，超时缩短
        execSync(`npx vitest run src/generators/micro_batch.test.ts --no-threads`, {
            stdio: 'inherit',
            cwd: rootDir,
            env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=2048' }
        });

        const resultPath = path.join(rootDir, 'micro_result.json');
        if (fs.existsSync(resultPath)) {
            const data = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
            Object.assign(fullManifest, data);
            // 实时写回
            fs.writeFileSync(finalManifestPath, JSON.stringify(fullManifest, null, 2));
            fs.unlinkSync(resultPath);
        }
    } catch (e) {
        console.error(`Batch at ${i} failed critical.`);
    } finally {
        if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile);
    }
}

console.log(`\nFinished. Final manifest has ${Object.keys(fullManifest).length} blocks.`);
