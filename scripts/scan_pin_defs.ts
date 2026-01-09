import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Config
const PIO_HOME = path.join(os.homedir(), '.platformio');
const STM32_BOARDS_DIR = path.join(PIO_HOME, 'platforms/ststm32/boards');
const STM32_VARIANTS_DIR = path.join(PIO_HOME, 'packages/framework-arduinoststm32/variants');
const INPUT_JSON = path.join(__dirname, 'unified_board_data.json');
const OUTPUT_JSON = path.join(__dirname, 'detailed_board_data.json');

// Interface for Granular Data
interface PeripheralFunction {
    pin: string;
    instance: string;
    function: string; // TX, RX, MOSI, etc.
}

// Regex to extract { PIN, INSTANCE, ... } structure
// Example: {PA_9, USART1, STM_PIN_DATA(...)}
const ENTRY_REGEX = /{\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*,/;

function parseGranularMap(content: string, mapType: string, functionRole: string): PeripheralFunction[] {
    // 1. Find the specific array body: WEAK const PinMap PinMap_UART_TX[] = { ... };
    const arrayRegex = new RegExp(`PinMap_${mapType}\\[\\]\\s*=\\s*\\{([\\s\\S]*?)\\};`, 'm');
    const match = content.match(arrayRegex);
    if (!match) return [];

    const body = match[1];
    const results: PeripheralFunction[] = [];

    // 2. Iterate lines/entries
    const lines = body.split('\n');
    for (const line of lines) {
        const m = line.match(ENTRY_REGEX);
        if (m) {
            let pin = m[1];
            const instance = m[2];

            if (pin !== 'NC' && pin !== 'NP') {
                // Format Pin: PA_9 -> PA9, PA_9_ALT1 -> PA9
                pin = pin.replace(/_ALT\d*/, '').replace('_', '');
                results.push({ pin, instance, function: functionRole });
            }
        }
    }
    return results;
}

// Aggregation Helper
function aggregatePeripherals(list: PeripheralFunction[], type: string, target: any) {
    // Group by Instance (USART1) -> Function (TX) -> [Pins]
    for (const item of list) {
        if (!target[type]) target[type] = {};
        if (!target[type][item.instance]) target[type][item.instance] = {};

        if (!target[type][item.instance][item.function]) {
            target[type][item.instance][item.function] = [];
        }
        // Avoid duplicates
        if (!target[type][item.instance][item.function].includes(item.pin)) {
            target[type][item.instance][item.function].push(item.pin);
        }
    }
}

async function main() {
    console.log('Loading board data...');
    if (!fs.existsSync(INPUT_JSON)) {
        console.error('Missing input JSON');
        return;
    }
    const data = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf8'));
    const stm32Data = data['STM32'];

    const detailedData: Record<string, any> = {};
    let count = 0;

    for (const series of Object.keys(stm32Data)) {
        for (const board of stm32Data[series]) {
            const boardId = board.id;

            // Resolve Paths (Reuse logic)
            const manifestPath = path.join(STM32_BOARDS_DIR, `${boardId}.json`);
            if (!fs.existsSync(manifestPath)) continue;

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const variantName = manifest.build?.variant;
            if (!variantName) continue;

            // Resolve Variant Path
            let variantPath = path.join(STM32_VARIANTS_DIR, variantName);
            if (!fs.existsSync(variantPath)) {
                // Try leaf/recursive
                const leaf = path.basename(variantName);
                const subs = fs.readdirSync(STM32_VARIANTS_DIR).filter(d => fs.statSync(path.join(STM32_VARIANTS_DIR, d)).isDirectory());
                for (const s of subs) {
                    const c = path.join(STM32_VARIANTS_DIR, s, leaf);
                    if (fs.existsSync(c)) { variantPath = c; break; }
                }
            }
            if (!fs.existsSync(variantPath)) continue;

            // Read PeripheralPins.c
            const ppFile = path.join(variantPath, 'PeripheralPins.c');
            if (!fs.existsSync(ppFile)) continue;

            const content = fs.readFileSync(ppFile, 'utf8');

            // Granular Parsing
            const peripherals: any = {};

            // UART
            aggregatePeripherals(parseGranularMap(content, 'UART_TX', 'TX'), 'UART', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'UART_RX', 'RX'), 'UART', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'UART_RTS', 'RTS'), 'UART', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'UART_CTS', 'CTS'), 'UART', peripherals);

            // SPI
            aggregatePeripherals(parseGranularMap(content, 'SPI_MOSI', 'MOSI'), 'SPI', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'SPI_MISO', 'MISO'), 'SPI', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'SPI_SCLK', 'SCLK'), 'SPI', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'SPI_SSEL', 'SSEL'), 'SPI', peripherals);

            // I2C
            aggregatePeripherals(parseGranularMap(content, 'I2C_SDA', 'SDA'), 'I2C', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'I2C_SCL', 'SCL'), 'I2C', peripherals);

            // CAN
            aggregatePeripherals(parseGranularMap(content, 'CAN_RD', 'RD'), 'CAN', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'CAN_TD', 'TD'), 'CAN', peripherals);

            // USB
            aggregatePeripherals(parseGranularMap(content, 'USB', 'DM'), 'USB', peripherals); // Often 1st is DM
            // USB parsing is tricky as regex matches {PA11, USB, ...}
            // Usually maps to same instance 'USB'

            // TIM (PWM)
            // Need custom parsing for TIM to extract CH1, CH2, etc. from comments
            const timBodyRegex = /PinMap_TIM\[\]\s*=\s*\{([\s\S]*?)\};/m;
            const timMatch = content.match(timBodyRegex);
            if (timMatch) {
                const timBody = timMatch[1];
                const timLines = timBody.split('\n');

                if (!peripherals['TIM']) peripherals['TIM'] = {};

                for (const line of timLines) {
                    // Match line:  {PA_0, TIM2, ...}, // TIM2_CH1
                    const entryMatch = line.match(/{\s*([A-Z0-9_]+)\s*,\s*([A-Z0-9_]+)\s*,/);
                    const commentMatch = line.match(/\/\/\s*TIM\d+_CH(\d+)(N?)/); // Capture channel num and optional N

                    if (entryMatch) {
                        let pin = entryMatch[1];
                        const instance = entryMatch[2];

                        if (pin !== 'NC' && pin !== 'NP') {
                            pin = pin.replace(/_ALT\d*/, '').replace('_', '');

                            let func = 'CH'; // Default
                            if (commentMatch) {
                                func = `CH${commentMatch[1]}${commentMatch[2]}`; // e.g. CH1, CH1N
                            }

                            if (!peripherals['TIM'][instance]) peripherals['TIM'][instance] = {};
                            if (!peripherals['TIM'][instance][func]) peripherals['TIM'][instance][func] = [];

                            if (!peripherals['TIM'][instance][func].includes(pin)) {
                                peripherals['TIM'][instance][func].push(pin);
                            }
                        }
                    }
                }
            } else {
                // Fallback if regex fails (shouldn't happen if file structure is standard)
                // aggregatePeripherals(parseGranularMap(content, 'TIM', 'CH'), 'TIM', peripherals);
            }

            // ADC
            aggregatePeripherals(parseGranularMap(content, 'ADC', 'IN'), 'ADC', peripherals);

            // DAC
            aggregatePeripherals(parseGranularMap(content, 'DAC', 'OUT'), 'DAC', peripherals);

            // SD
            aggregatePeripherals(parseGranularMap(content, 'SD_CMD', 'CMD'), 'SD', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'SD_CK', 'CK'), 'SD', peripherals);
            aggregatePeripherals(parseGranularMap(content, 'SD_DATA0', 'D0'), 'SD', peripherals);


            // Check if we got data
            if (Object.keys(peripherals).length > 0) {
                detailedData[boardId] = peripherals;
                count++;
            }
        }
    }

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(detailedData, null, 2));
    console.log(`Generated Detailed Data for ${count} boards.`);
    console.log(`Saved to: ${OUTPUT_JSON}`);
}

main();
