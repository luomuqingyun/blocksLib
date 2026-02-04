
/**
 * ============================================================
 * 资源打包工具 (Resource Bundler)
 * ============================================================
 * 
 * 在构建 Electron 应用前，将必要的 Arduino Core STM32 资源打包到
 * 输出目录，供离线环境使用。
 * 
 * 机制:
 * - 排除 .git 等非必要文件
 * - 完整复制所有 variants, cores, libraries
 * 
 * @file scripts/bundle_resources.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { ARDUINO_CORE_STM32_PATH } from '../utils/data_sources';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(PROJECT_ROOT, 'bundled_arduino_core');

// [安全策略] 检查是否有 submodule，如果有则优先使用 submodule
const SUBMODULE_PATH = path.join(PROJECT_ROOT, 'third_party', 'Arduino_Core_STM32');

async function bundleResources() {
    let sourcePath = ARDUINO_CORE_STM32_PATH;

    if (fs.existsSync(SUBMODULE_PATH) && fs.readdirSync(SUBMODULE_PATH).length > 0) {
        console.log('📦 Found Git Submodule, using it as source of truth.');
        sourcePath = SUBMODULE_PATH;
    }

    console.log('📦 开始打包资源 (Full Safety Mode)...');
    console.log(`   Source: ${sourcePath}`);
    console.log(`   Target: ${TARGET_DIR}`);

    if (!fs.existsSync(sourcePath)) {
        console.error(`❌ Source directory not found: ${sourcePath}`);
        process.exit(1);
    }

    // [核心改进] 
    // 在 EmbedBlocks Studio v1.2+ 中，我们决定不再将几百MB的 Arduino Core 打包进安装程序
    // 而是依赖用户本地安装的 PlatformIO 环境 (或 Portable 模式的 PIO)
    // 这样可以显著减小安装包体积，且保证编译环境与数据源的一致性。

    console.log('⚡ [Optimization] Skipping resource bundling.');
    console.log('   EmbedBlocks now relies on the system PlatformIO packages.');
    console.log('   This significantly reduces the installer size.');
    console.log('   Please ensure PlatformIO is installed and frameworks are updated.');

    // 以前的逻辑已注释，保留以备查阅
    /*
    // Clean target
    if (fs.existsSync(TARGET_DIR)) {
        console.log('   Cleaning previous bundle...');
        fs.rmSync(TARGET_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TARGET_DIR, { recursive: true });

    const BLACKLIST = ['.git', '.github', '.gitignore', 'CI', 'tests', 'examples', '.travis.yml'];

    const entries = fs.readdirSync(sourcePath);
    for (const entry of entries) {
        if (BLACKLIST.includes(entry)) {
            console.log(`   Skipping ignored: ${entry}`);
            continue;
        }

        const srcPath = path.join(sourcePath, entry);
        const destPath = path.join(TARGET_DIR, entry);

        // 递归复制
        console.log(`   Copying ${entry}...`);
        await copyRecursive(srcPath, destPath);
    }
    */

    console.log('✅ Bundle Optimization Complete.');
}

async function copyRecursive(src: string, dest: string) {
    // ... (保留 helper 函数但不调用)
}

bundleResources().catch(err => {
    console.error('❌ Bundling failed:', err);
    process.exit(1);
});
