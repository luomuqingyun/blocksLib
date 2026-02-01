
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../src/data/boards/stm32');

function audit() {
    console.log('Starting data audit...');

    // Get all series directories
    if (!fs.existsSync(DATA_DIR)) {
        console.error('Data directory not found!');
        return;
    }

    const seriesDirs = fs.readdirSync(DATA_DIR).filter(d => fs.lstatSync(path.join(DATA_DIR, d)).isDirectory());
    let issues = 0;

    seriesDirs.forEach(series => {
        const seriesPath = path.join(DATA_DIR, series);
        const files = fs.readdirSync(seriesPath).filter(f => f.endsWith('.json'));

        files.forEach(f => {
            const filePath = path.join(seriesPath, f);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const pkg = data.package || '';
            const pinCount = data.pinCount || 0;
            const mcu = data.mcu || '';
            const hasPinMap = data.pinMap && data.pinMap.length > 0;

            let issue = null;

            // 1. Check for Unknown package
            if (pkg === 'Unknown' || pkg.includes('Unknown')) {
                issue = 'Package is Unknown';
            }

            // 2. Check for pin count mismatch in package name
            // e.g., "LQFP64" but pinCount is 100
            const pkgNumMatch = pkg.match(/\d+/);
            if (pkgNumMatch) {
                const pkgNum = parseInt(pkgNumMatch[0]);
                if (pkgNum !== pinCount) {
                    // Some divergence is weird, but verify tolerance
                    if (Math.abs(pkgNum - pinCount) > 0) {
                        issue = `Mismatch: Package says ${pkgNum}, pinCount says ${pinCount}`;
                    }
                }
            }

            // 3. Suspiciously high pin count for non-BGA if heuristic
            if (!hasPinMap && pinCount > 144 && !pkg.includes('BGA')) {
                issue = `High pin count (${pinCount}) without BGA (Heuristic)`;
            }

            // 4. "B" in MCU name causing false positive if no official map
            // Heuristic check: 'B' usually means 208 if part of suffix, or 128KB Flash if part of middle.
            // If regex parsed it as 208 pins but it's likely smaller.
            // Hard to detect automatically without comparing to a reference, 
            // but we can flag high pin counts with generic names.

            if (issue) {
                console.log(`[${series}/${mcu}] Issue: ${issue} | HasMap: ${hasPinMap} | Pkg: ${pkg}`);
                issues++;
            }
        });
    });

    console.log(`Audit complete. Found ${issues} potential issues.`);
}

audit();
