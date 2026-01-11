// ----------------------------------------------------------------------------
// 脚本名称: cleanup.js
// 用途: 自动清理残留进程
// 描述: 
// 1. 在启动开发环境 (npm run dev) 之前由 predev 钩子自动调用。
// 2. 检测系统中是否仍有尚未关闭的 Electron 进程 (electron.exe)。
// 3. 如果发现残留，则强制终结 (Kill)，以防止端口占用、文件锁定或多开导致的冲突。
// ----------------------------------------------------------------------------
const { execSync } = require('child_process');
const os = require('os');

/**
 * 清理函数：查找并结束所有残留的 Electron 进程
 * 用法: node scripts/cleanup.js (通常由 package.json 中的 predev 脚本调用)
 */

function cleanup() {
    console.log('🔍 正在检查是否有残留的 Electron 进程...');

    const isWin = os.platform() === 'win32';
    // 根据系统选择查找命令
    const findCmd = isWin
        ? 'tasklist /FI "IMAGENAME eq electron.exe" /NH'
        : 'ps aux | grep electron | grep -v grep';

    try {
        const output = execSync(findCmd).toString();
        const hasProcesses = isWin
            ? output.includes('electron.exe')
            : output.trim().length > 0;

        if (hasProcesses) {
            console.log('⚠️  发现残留的 Electron 进程。正在尝试强制结束...');
            // 根据系统选择强制结束命令
            const killCmd = isWin
                ? 'taskkill /F /IM electron.exe /T'
                : 'pkill -9 electron';

            try {
                execSync(killCmd);
                console.log('✅ 所有残留的 Electron 进程已成功清理。');
            } catch (killErr) {
                // taskkill 在进程不存在时会抛错，通常忽略即可
                console.log('ℹ️  清理完毕（部分进程可能已由系统关闭）。');
            }
        } else {
            console.log('✅ 未发现残留的 Electron 进程。');
        }
    } catch (err) {
        // 命令执行失败（如 tasklist 未搜到结果）通常意味着没有进程
        console.log('✅ 未发现残留的 Electron 进程。');
    }
}

// 执行清理
cleanup();
