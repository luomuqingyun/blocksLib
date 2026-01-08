const { execSync } = require('child_process');
const os = require('os');

/**
 * Cleanup script to kill lingering Electron processes
 * Usage: node scripts/cleanup.js
 */

function cleanup() {
    console.log('🔍 Checking for lingering Electron processes...');

    const isWin = os.platform() === 'win32';
    const findCmd = isWin
        ? 'tasklist /FI "IMAGENAME eq electron.exe" /NH'
        : 'ps aux | grep electron | grep -v grep';

    try {
        const output = execSync(findCmd).toString();
        const hasProcesses = isWin
            ? output.includes('electron.exe')
            : output.trim().length > 0;

        if (hasProcesses) {
            console.log('⚠️  Found lingering Electron processes. Terminating...');
            const killCmd = isWin
                ? 'taskkill /F /IM electron.exe /T'
                : 'pkill -9 electron';

            try {
                execSync(killCmd);
                console.log('✅ All Electron processes terminated.');
            } catch (killErr) {
                // taskkill returns error if process not found, which is fine
                console.log('ℹ️  Cleanup finished (some processes may have already exited).');
            }
        } else {
            console.log('✅ No lingering Electron processes found.');
        }
    } catch (err) {
        console.log('✅ No lingering Electron processes found.');
    }
}

cleanup();
