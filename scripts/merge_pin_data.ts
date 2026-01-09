import * as fs from 'fs';
import * as path from 'path';

const UNIFIED_JSON = path.join(__dirname, 'stm32_board_data.json');
const PIN_DEFS_JSON = path.join(__dirname, 'detailed_board_data.json');

function main() {
    if (!fs.existsSync(UNIFIED_JSON) || !fs.existsSync(PIN_DEFS_JSON)) {
        console.error('Missing input files.');
        return;
    }

    const unifiedData = JSON.parse(fs.readFileSync(UNIFIED_JSON, 'utf8'));
    const pinData = JSON.parse(fs.readFileSync(PIN_DEFS_JSON, 'utf8'));

    let updateCount = 0;

    // Iterate STM32 boards and inject pinout
    const stm32 = unifiedData['STM32'];
    if (stm32 && typeof stm32 === 'object') {
        for (const seriesKey of Object.keys(stm32)) {
            const boards = stm32[seriesKey];
            for (const board of boards) {
                if (pinData[board.id]) {
                    board.pinout = pinData[board.id];
                    updateCount++;
                }
            }
        }
    }

    // Save back
    fs.writeFileSync(UNIFIED_JSON, JSON.stringify(unifiedData, null, 2));
    console.log(`Merged pin definitions into ${updateCount} boards.`);
}

main();
