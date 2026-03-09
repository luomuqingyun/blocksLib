const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function resolveWindowsCmd(cliPath) {
    if (!cliPath.toLowerCase().endsWith('.cmd')) return cliPath;

    try {
        const content = fs.readFileSync(cliPath, 'utf8');
        // Look for the last line which usually executes node
        const lines = content.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            // Matches: "%_prog%"  "%dp0%\node_modules\openclaw\bin\openclaw.js" %*
            // or "%~dp0\node_modules\openclaw\bin\openclaw.js"
            const match = line.match(/"[^"]*?\\node_modules\\[^"]+\.js"/i);
            if (match) {
                let p = match[0].replace(/"/g, '');
                p = p.replace(/%~dp0|%dp0%/gi, path.dirname(cliPath) + path.sep);
                return p;
            }
        }
    } catch (e) {
        console.error(e);
    }
    return cliPath;
}

const npxCmd = execSync('where npx').toString().split('\n')[0].trim();
console.log('npx path:', npxCmd);
console.log('resolved JS target:', resolveWindowsCmd(npxCmd));
