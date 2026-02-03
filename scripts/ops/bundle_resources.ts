
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
import { ARDUINO_CORE_STM32_PATH } from './data_sources';

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

    // Clean target
    if (fs.existsSync(TARGET_DIR)) {
        console.log('   Cleaning previous bundle...');
        fs.rmSync(TARGET_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TARGET_DIR, { recursive: true });

    // [核心改进] 采用 "Blacklist" 策略 (除了不想要的，全部复制)
    // 这样能确保 system/variants/libraries 内部的任何隐藏依赖都被包含
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

    console.log('✅ Resource Bundling Complete. (Full Copy Strategy)');
}

async function copyRecursive(src: string, dest: string) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
            // 忽略内部 git 文件
            if (entry === '.git') continue;
            await copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

bundleResources().catch(err => {
    console.error('❌ Bundling failed:', err);
    process.exit(1);
});
