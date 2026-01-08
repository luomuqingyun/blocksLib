
const Jimp = require('jimp');
console.log('Jimp export type:', typeof Jimp);
console.log('Jimp keys:', Object.keys(Jimp));
try {
    if (typeof Jimp.read === 'function') console.log('Jimp.read is a function');
} catch (e) { }
