const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Orchestrator for chunked manifest generation
 */

// 1. 获取积木总数（通过 schema 判断）
const schemaPath = path.join(__dirname, '../../src/data/ai_block_schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const totalBlocks = schema.blocks.length;

console.log(`Total blocks in schema: ${totalBlocks}`);

const CHUNK_SIZE = 50;
const rootDir = path.join(__dirname, '../../');
const scriptPath = 'scripts/utils/direct_manifest.ts';
const finalManifestPath = path.join(rootDir, 'block_compilation_manifest.json');
const fullManifest = {};

// 清理旧 Chunk
const files = fs.readdirSync(rootDir);
files.forEach(f => {
    if (f.startsWith('manifest_chunk_') && f.endsWith('.json')) {
        fs.unlinkSync(path.join(rootDir, f));
    }
});

for (let i = 0; i < totalBlocks; i += CHUNK_SIZE) {
    const start = i;
    const end = Math.min(i + CHUNK_SIZE, totalBlocks);
    
    console.log(`\n[Orchestrator] Launching chunk ${start} to ${end}...`);
    
    try {
        execSync(`npx vite-node ${scriptPath}`, {
            stdio: 'inherit',
            cwd: rootDir,
            env: { 
                ...process.env, 
                START_IDX: start.toString(), 
                END_IDX: end.toString() 
            }
        });
        
        const chunkFile = path.join(rootDir, `manifest_chunk_${start}.json`);
        if (fs.existsSync(chunkFile)) {
            const chunkData = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
            Object.assign(fullManifest, chunkData);
            console.log(`[Orchestrator] Merged chunk ${start}. Current total blocks: ${Object.keys(fullManifest).length}`);
            fs.unlinkSync(chunkFile);
        }
    } catch (e) {
        console.error(`[Orchestrator] Chunk starting at ${start} failed.`);
    }
}

fs.writeFileSync(finalManifestPath, JSON.stringify(fullManifest, null, 2));
console.log(`\n[Success] Final manifest saved with ${Object.keys(fullManifest).length} blocks.`);
