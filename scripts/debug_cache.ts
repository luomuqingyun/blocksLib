import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(__dirname, 'out_scripts', 'stm32_layouts_cache.json');

if (fs.existsSync(CACHE_FILE)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    const keys = Object.keys(cache);
    console.log(`Total keys: ${keys.length}`);
    console.log('First 20 keys:', keys.slice(0, 20));
    console.log('Keys containing F103:', keys.filter(k => k.includes('F103')).slice(0, 20));
} else {
    console.log('Cache file not found.');
}
