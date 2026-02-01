import * as fs from 'fs';
import * as path from 'path';

// exact file path
const FILE_PATH = `C:/Users/wofy/.platformio/packages/framework-arduinoststm32/variants/STM32F4xx/F407Z(E-G)T_F417Z(E-G)T/PeripheralPins.c`;

const ENTRY_REGEX = /{\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*,/;

function parseGranularMap(content: string, mapType: string, functionRole: string) {
    console.log(`Scanning for ${mapType}...`);
    const arrayRegex = new RegExp(`PinMap_${mapType}\\[\\]\\s*=\\s*\\{([\\s\\S]*?)\\};`, 'm');
    const match = content.match(arrayRegex);
    if (!match) {
        console.log(`  -> Regex failed to match PinMap_${mapType}`);
        return [];
    }

    const body = match[1];
    console.log(`  -> Match found! Body length: ${body.length}`);

    // Check first few lines of body
    console.log(`  -> Body snippet: ${body.substring(0, 100)}...`);

    const results = [];
    const lines = body.split('\n');
    for (const line of lines) {
        const m = line.match(ENTRY_REGEX);
        if (m) {
            let pin = m[1];
            const instance = m[2];
            console.log(`    -> Parsed: Pin=${pin}, Instance=${instance}`);
            if (results.length > 3) break; // just show first few
            results.push({ pin, instance, function: functionRole });
        }
    }
    return results;
}

const content = fs.readFileSync(FILE_PATH, 'utf8');
parseGranularMap(content, 'Ethernet', 'ETH');
parseGranularMap(content, 'USB_OTG_FS', 'OTG_FS');
