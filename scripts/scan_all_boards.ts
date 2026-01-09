import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

const execPromise = util.promisify(exec);

// Target Platforms to Scan
const PLATFORMS = {
    'atmelavr': 'Arduino',
    'espressif32': 'ESP32',
    'espressif8266': 'ESP8266',
    'ststm32': 'STM32',
    'microchippic32': 'PIC32'
};

// Output Config
const OUTPUT_STM32 = path.join(__dirname, 'stm32_board_data.json');
const OUTPUT_STANDARD = path.join(__dirname, 'standard_board_data.json');

// Popular Boards Allowlist (Non-STM32)
const ALLOW_LIST = new Set([
    // Arduino
    'uno', 'nanoatmega328', 'megaatmega2560', 'leonardo', 'pro16MHzatmega328',
    // ESP8266
    'nodemcuv2', 'd1_mini',
    // ESP32
    'esp32dev', 'nodemcu-32s', 'wemos_d1_mini32', 'lolin32', 'esp32-s3-devkitc-1', 'esp32-c3-devkitm-1'
]);

async function main() {
    console.log('Starting Unified Platform Scan...');

    const stm32Data: any = {};
    const standardData: any = {};

    for (const [platform, label] of Object.entries(PLATFORMS)) {
        console.log(`Scanning ${label} (${platform})...`);

        try {
            const { stdout } = await execPromise(`pio boards ${platform} --json-output`);
            const boards = JSON.parse(stdout);

            // Post-processing
            for (const board of boards) {
                // Connectivity Injection
                if (!board.connectivity) {
                    if (board.id.includes('esp')) {
                        board.connectivity = ['wifi'];
                        if (board.id.includes('32')) board.connectivity.push('bluetooth');
                    } else {
                        // Basic Arduino assumption, can be refined
                        board.connectivity = [];
                    }
                }

                // Classification
                if (platform === 'ststm32') {
                    // STM32: Keep all, use Hierarchy
                    const mcu = board.mcu || 'UNKNOWN';
                    // Regex to extract Series (STM32F1, STM32F4...)
                    // MCU usually looks like STM32F103C8T6
                    const seriesMatch = mcu.match(/STM32([FGHLW][0-47])\d+/);
                    const series = seriesMatch ? `STM32${seriesMatch[1]}` : 'Other';

                    if (!stm32Data[series]) stm32Data[series] = [];

                    stm32Data[series].push({
                        id: board.id,
                        name: board.name,
                        mcu: board.mcu,
                        specs: `${(board.rom / 1024) || '?'}k Flash / ${(board.ram / 1024) || '?'}k RAM`,
                        capabilities: board.connectivity || []
                    });
                } else {
                    // Standard Boards: Filter by Allowlist
                    if (ALLOW_LIST.has(board.id)) {
                        const groupName = label; // Arduino, ESP32, etc.
                        if (!standardData[groupName]) standardData[groupName] = [];

                        standardData[groupName].push({
                            id: board.id,
                            name: board.name,
                            mcu: board.mcu,
                            specs: `${(board.rom / 1024) || '?'}k Flash / ${(board.ram / 1024) || '?'}k RAM`,
                            capabilities: board.connectivity || []
                        });
                    }
                }
            }

        } catch (e) {
            console.error(`Error scanning ${platform}:`, e);
        }
    }

    // Save outputs
    fs.writeFileSync(OUTPUT_STM32, JSON.stringify({ STM32: stm32Data }, null, 2));
    fs.writeFileSync(OUTPUT_STANDARD, JSON.stringify(standardData, null, 2));

    console.log(`\n====== SCAN COMPLETE ======`);
    console.log(`STM32 Data saved to: ${OUTPUT_STM32}`);
    console.log(`Standard Data saved to: ${OUTPUT_STANDARD}`);
}

main();
