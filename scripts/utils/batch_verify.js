const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../../src/data/ai_block_schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const allBlocks = schema.blocks.map(b => b.type);

console.log(`Total blocks to verify: ${allBlocks.length}`);

const BATCH_SIZE = 45;
const rootDir = path.join(__dirname, '../../');
const finalManifestPath = path.join(rootDir, 'block_compilation_manifest.json');
const fullManifest = {};

// 清理旧的批次文件
const files = fs.readdirSync(rootDir);
files.forEach(f => {
    if (f.startsWith('block_manifest_batch_') && f.endsWith('.json')) {
        fs.unlinkSync(path.join(rootDir, f));
    }
});

for (let i = 0; i < allBlocks.length; i += BATCH_SIZE) {
    const batch = allBlocks.slice(i, i + BATCH_SIZE);
    const filter = `^(${batch.join('|')})$`;
    const suffix = `batch_${Math.floor(i / BATCH_SIZE)}`;
    
    console.log(`\n[Batch] Processing blocks ${i + 1} to ${Math.min(i + BATCH_SIZE, allBlocks.length)} (ID: ${suffix})...`);
    
    try {
        // 运行 Vitest
        execSync(`npx vitest run src/generators/blocks_functional.test.ts --no-threads`, {
            stdio: 'inherit',
            cwd: rootDir,
            env: { 
                ...process.env, 
                BLOCK_FILTER: filter, 
                DUMP_MANIFEST: '1',
                MANIFEST_SUFFIX: suffix
            }
        });
        
        // 合并文件
        const batchPath = path.join(rootDir, `block_manifest_${suffix}.json`);
        if (fs.existsSync(batchPath)) {
            const data = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
            Object.assign(fullManifest, data);
            console.log(`[Batch] Merged ${Object.keys(data).length} blocks.`);
        }
    } catch (e) {
        console.error(`[Batch Error] Failed at index ${i}. Continuing to next batch.`);
    }
}

fs.writeFileSync(finalManifestPath, JSON.stringify(fullManifest, null, 2));
console.log(`\n[Success] Integrated manifest saved to ${finalManifestPath}`);
console.log(`[Success] Total verified blocks in manifest: ${Object.keys(fullManifest).length}`);
