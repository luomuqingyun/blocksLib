import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Interface matching the PIO JSON output
interface PioBoard {
    id: string;
    name: string;
    mcu: string;
    fcpu: number;
    ram: number;
    rom: number;
    frameworks: string[];
    url?: string;
    vendor?: string;
}

const CMD = 'pio boards stm32 --json-output';

console.log(`Executing: ${CMD}...`);

// Increasing maxBuffer to 10MB to handle large JSON output
exec(CMD, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error executing PIO: ${error.message}`);
        return;
    }

    try {
        const boards: PioBoard[] = JSON.parse(stdout);
        console.log(`\nRaw board count: ${boards.length}`);

        // Grouping Strategy
        const variants: Record<string, any[]> = {};

        // Regex to capture "STM32F103" from "genericSTM32F103C8" or "STM32F103..."
        const seriesRegex = /(STM32[FGHLMUW][0-9]{2,3})/;

        let validCount = 0;

        boards.forEach(b => {
            // CRITICAL FILTER: Must support Arduino framework
            if (!b.frameworks || !b.frameworks.includes('arduino')) {
                return;
            }

            let series = "Other";

            // 1. Try to extract series from ID (preferred for Generics)
            const idUpper = b.id.toUpperCase();
            const match = idUpper.match(seriesRegex);

            if (match) {
                series = match[1];
            } else {
                // 2. Fallback to MCU name
                const mcuMatch = b.mcu.toUpperCase().match(seriesRegex);
                if (mcuMatch) series = mcuMatch[1];
            }

            if (!variants[series]) variants[series] = [];

            variants[series].push({
                id: b.id,
                mcu: b.mcu, // Explicitly showing the specific chip model
                specs: `${(b.rom / 1024).toFixed(0)}k Flash / ${(b.ram / 1024).toFixed(0)}k RAM`,
                frameworks: b.frameworks.join(', ')
            });

            validCount++;
        });

        // Generate Console Report
        console.log('\n====== STM32 Arduino-Compatible Boards Summary ======');
        const sortedSeries = Object.keys(variants).sort();

        sortedSeries.forEach(series => {
            if (series === 'Other') return;
            const count = variants[series].length;
            const genericInSeries = variants[series].filter(v => v.id.toLowerCase().includes('generic')).length;

            console.log(`[${series}] Total: ${count.toString().padEnd(3)} | Generic Variants: ${genericInSeries}`);
        });

        console.log('\n====== Key Insight ======');
        console.log(`Total Arduino-Ready Variants: ${validCount} (Filtered from ${boards.length})`);

        // Save Analysis Result for User Inspection
        const outputPath = path.join(__dirname, 'stm32_analysis_report.json');
        fs.writeFileSync(outputPath, JSON.stringify(variants, null, 2));
        console.log(`\nDetailed filtered analysis saved to: ${outputPath}`);

    } catch (e) {
        console.error("Failed to parse data:", e);
    }
});
