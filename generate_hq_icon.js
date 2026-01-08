
const { Jimp } = require('jimp');
const pngToIco = require('png-to-ico');
const fs = require('fs');

async function generateIcon() {
    console.log('Reading source image...');
    try {
        const image = await Jimp.read('public/EmbedBlocks.png');

        const sizes = [256, 48, 32, 16];
        const buffers = [];

        console.log('Resizing images...');
        for (const size of sizes) {
            const resized = image.clone().resize({ w: size, h: size });
            // Jimp v1 might use different buffer retrieval API or options
            const buffer = await resized.getBuffer("image/png");
            buffers.push(buffer);
            console.log(`Generated ${size}x${size} layer`);
        }

        console.log('Generating ICO...');
        const icoBuffer = await pngToIco(buffers);
        fs.writeFileSync('icon.ico', icoBuffer);
        console.log('Successfully created multi-layer icon.ico');
    } catch (error) {
        console.error('Error creating ICO:', error);
        console.error(error.stack);
    }
}

generateIcon();
