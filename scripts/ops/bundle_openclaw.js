const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * OpenClaw 资源打包预处理脚本
 * 
 * 作用:
 * 1. 创建 bundled_openclaw 目录
 * 2. (此处应有下载逻辑) 为演示目的，创建一个基础的代理脚本
 * 3. 确保目录结构符合构建要求
 */

const projectRoot = path.join(__dirname, '../..');
const targetDir = path.join(projectRoot, 'bundled_openclaw');
const binDir = path.join(targetDir, 'bin');

async function bundle() {
    console.log('--- OpenClaw Bundling Process Start ---');

    // 1. 创建目录
    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
        console.log(`Created: ${binDir}`);
    }

    // 2. 尝试从系统中找到真正的 openclaw
    try {
        const cmd = process.platform === 'win32' ? 'where openclaw' : 'which openclaw';
        const openClawPath = execSync(cmd).toString().split('\n')[0].trim();
        console.log(`Detected system openclaw at: ${openClawPath}`);

        // 注意：由于 npm 全局包通常是复杂的脚本，直接复制 .cmd 可能无法运行
        // 在正式构建时，建议将 openclaw 编译为独立 binary 或使用 pkg 打包。
        // 这里我们先创建一个“桥接脚本”指向它，模拟内置化效果。

        const mockExePath = path.join(binDir, process.platform === 'win32' ? 'openclaw.bat' : 'openclaw');
        let bridgeContent = '';

        if (process.platform === 'win32') {
            bridgeContent = `@echo off\n"${openClawPath}" %*\n`;
        } else {
            bridgeContent = `#!/bin/bash\n"${openClawPath}" "$@"\n`;
        }

        fs.writeFileSync(mockExePath, bridgeContent);
        if (process.platform !== 'win32') fs.chmodSync(mockExePath, '755');

        console.log(`Created internal bridge to system OpenClaw at: ${mockExePath}`);

    } catch (err) {
        console.warn('Could not find global openclaw. Creating a mock file instead.');
        // (保持原有的 Mock 逻辑作为兜底)
        const mockExePath = path.join(binDir, process.platform === 'win32' ? 'openclaw.bat' : 'openclaw');
        const mockContent = process.platform === 'win32' ? '@echo off\necho Mock OpenClaw\n' : '#!/bin/bash\necho "Mock OpenClaw"\n';
        fs.writeFileSync(mockExePath, mockContent);
    }

    console.log('--- OpenClaw Bundling Process Complete ---');
}

bundle().catch(err => {
    console.error('Bundling failed:', err);
    process.exit(1);
});
