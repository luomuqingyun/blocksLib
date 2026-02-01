/**
 * ============================================================
 * 高清图标生成工具 (High-Quality ICO Generator)
 * ============================================================
 * 
 * 功能: 从 PNG 源图生成多分辨率 ICO 图标文件
 * 
 * 输入: public/EmbedBlocks.png (源图片，建议 512x512 或更高)
 * 输出: icon.ico (包含 256/48/32/16 四个尺寸)
 * 
 * 依赖: jimp (图像处理), png-to-ico (ICO 打包)
 * 运行方式: node generate_hq_icon.js
 * 
 * @file generate_hq_icon.js
 */

const { Jimp } = require('jimp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

/**
 * 生成多层 ICO 图标
 * 
 * ICO 文件包含多个分辨率层，Windows 会根据使用场景自动选择：
 * - 256x256: 文件夹大图标预览
 * - 48x48: 任务栏图标
 * - 32x32: 窗口标题栏
 * - 16x16: 小图标视图
 */
async function generateIcon() {
    console.log('📖 读取源图片...');

    try {
        // 读取 PNG 源文件 (从 scripts/ 目录访问 public/)
        const image = await Jimp.read(path.join(__dirname, '../public/EmbedBlocks.png'));

        // 定义需要生成的尺寸 (从大到小)
        const sizes = [256, 48, 32, 16];
        const buffers = [];

        console.log('🔄 生成多尺寸图层...');

        for (const size of sizes) {
            // 克隆原图并缩放
            const resized = image.clone().resize({ w: size, h: size });
            // 获取 PNG 格式的 Buffer
            const buffer = await resized.getBuffer("image/png");
            buffers.push(buffer);
            console.log(`   ✓ ${size}x${size} 已生成`);
        }

        console.log('📦 打包为 ICO 格式...');

        // 合并所有尺寸为单个 ICO 文件，输出到项目根目录
        const icoBuffer = await pngToIco(buffers);
        fs.writeFileSync(path.join(__dirname, '../icon.ico'), icoBuffer);

        console.log('✅ 成功生成 icon.ico (多层高清图标)');

    } catch (error) {
        console.error('❌ 生成失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// 执行主函数
generateIcon();
