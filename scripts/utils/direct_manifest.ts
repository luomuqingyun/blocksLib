import * as fs from 'fs';
import * as path from 'path';
import * as Blockly from 'blockly';
import { JSDOM } from 'jsdom';

// 1. 设置 DOM 环境
const dom = new JSDOM('<!doctype html><html><body><div id="blocklyDiv"></div></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).navigator = dom.window.navigator;
(global as any).Node = dom.window.Node;

// 2. 导入我们的生成器和模块
import { arduinoGenerator } from '../../src/generators/arduino-base';
import { initAllModules } from '../../src/modules/index';

async function run() {
    const startIdx = parseInt(process.env.START_IDX || '0');
    const endIdx = parseInt(process.env.END_IDX || '10');
    
    console.log(`[Chunk] Processing blocks ${startIdx} to ${endIdx}...`);
    
    try {
        initAllModules();
    } catch (e) {}

    const allBlockTypes = Object.keys(Blockly.Blocks);
    const auditedBlocks = allBlockTypes.filter(type => {
        return !['text', 'math_number', 'logic_boolean'].includes(type) &&
            !type.startsWith('controls_') &&
            !type.startsWith('logic_') &&
            !type.startsWith('math_') &&
            !type.startsWith('text_') &&
            !type.startsWith('lists_') &&
            !type.startsWith('variables_') &&
            !type.startsWith('procedures_');
    }).slice(startIdx, endIdx);

    const manifest: Record<string, any> = {};
    const families = ['arduino', 'esp32', 'esp8266', 'stm32'];
    const workspace = new Blockly.Workspace();

    for (const type of auditedBlocks) {
        try {
            const block = workspace.newBlock(type);
            manifest[type] = {};
            for (const family of families) {
                if (type.startsWith('esp32_') && family !== 'esp32') continue;
                if (type.startsWith('stm32_') && family !== 'stm32') continue;
                if (type.startsWith('esp8266_') && family !== 'esp8266') continue;
                if (type.startsWith('arduino_') && family !== 'arduino') continue;

                arduinoGenerator.init(workspace);
                arduinoGenerator.setFamily(family);
                const rawCode = arduinoGenerator.blockToCode(block);
                const codeSnippet = Array.isArray(rawCode) ? rawCode[0] : rawCode;
                arduinoGenerator.finish(codeSnippet || '');
                manifest[type][family] = {
                    snippet: codeSnippet,
                    ...arduinoGenerator.getSnapshot()
                };
            }
        } catch (e: any) {
            console.error(`Error on block [${type}]:`, e.message);
        }
    }

    const chunkPath = path.join(process.cwd(), `manifest_chunk_${startIdx}.json`);
    fs.writeFileSync(chunkPath, JSON.stringify(manifest, null, 2));
    console.log(`[Chunk] Saved to ${chunkPath}`);
}

run().catch(console.error);
