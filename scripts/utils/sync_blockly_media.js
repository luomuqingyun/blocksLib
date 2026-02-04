/**
 * ============================================================
 * 脚本名称: sync_blockly_media.js
 * 用途: 自动同步 Blockly 媒体资源
 * 描述: 
 * 1. 自动从 node_modules/blockly/media 提取所有音效和图片资源。
 * 2. 将其同步到 public/media/blockly 目录。
 * 3. 确保开发环境和构建产物始终包含必需的编辑器资源，完全消除对外部 CDN 的依赖。
 * ============================================================
 */
const fs = require('fs');
const path = require('path');

function syncMedia() {
    const sourceDir = path.join(__dirname, '../../node_modules/blockly/media');
    const targetDir = path.join(__dirname, '../../public/media/blockly');

    console.log('🔄 正在同步 Blockly 媒体资源...');

    // 1. 检查源目录是否存在
    if (!fs.existsSync(sourceDir)) {
        console.error('❌ 错误: 找不到 Blockly 媒体源目录。请确保已运行 npm install。');
        process.exit(1);
    }

    // 2. 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(`📁 已创建目标目录: ${targetDir}`);
    }

    // 3. 读取并复制所有文件
    try {
        const files = fs.readdirSync(sourceDir);
        let count = 0;

        files.forEach(file => {
            const srcFile = path.join(sourceDir, file);
            const destFile = path.join(targetDir, file);

            // 如果目标文件不存在，或者源文件更新，则执行复制
            const srcStat = fs.statSync(srcFile);
            if (srcStat.isFile()) {
                if (!fs.existsSync(destFile) || fs.statSync(destFile).mtime < srcStat.mtime) {
                    fs.copyFileSync(srcFile, destFile);
                    count++;
                }
            }
        });

        console.log(`✅ 同步完成！共更新/同步了 ${count} 个媒体文件。`);
    } catch (err) {
        console.error('❌ 同步过程中发生错误:', err);
        process.exit(1);
    }
}

syncMedia();
