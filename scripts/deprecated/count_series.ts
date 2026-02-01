
import * as fs from 'fs';
import * as path from 'path';

const dataPath = path.join(__dirname, 'stm32_board_data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8')).STM32;

console.log('--- STM32 Series Stats ---');
const sortedKeys = Object.keys(data).sort();
for (const series of sortedKeys) {
    console.log(`- ${series}: ${data[series].length} boards`);
}
