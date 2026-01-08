const fs = require('fs');
const path = require('path');

const toolboxPath = path.join(__dirname, 'src/config/toolbox_categories.ts');
const localesPath = path.join(__dirname, 'src/locales/setupBlocklyLocales.ts');
const registryPath = path.join(__dirname, 'src/registries/BoardRegistry.ts');

const toolboxContent = fs.readFileSync(toolboxPath, 'utf8');
const localesContent = fs.readFileSync(localesPath, 'utf8');
const registryContent = fs.readFileSync(registryPath, 'utf8');

// 1. Extract Expected Keys
const expectedLabels = new Set();
let match;
const labelRegex = /%\{BKY_(LABEL_[a-zA-Z0-9_]+)\}/g;
while ((match = labelRegex.exec(toolboxContent)) !== null) {
    expectedLabels.add(match[1]);
}
// Add manually known labels if any (e.g. from BoardRegistry string literals if I missed any)
// Extract CAT_... usage from BoardRegistry.ts (Blockly.Msg.CAT_...)
const catRegex = /Blockly\.Msg\.(CAT_[a-zA-Z0-9_]+)/g;
const expectedCats = new Set();
while ((match = catRegex.exec(registryContent)) !== null) {
    expectedCats.add(match[1]);
}

// 2. Parse Locales File via simple splitting
// We assume 'zh: {' is the separating marker.
const splitParts = localesContent.split('zh: {');
if (splitParts.length < 2) {
    console.error('CRITICAL: Could not split file by "zh: {". File structure unexpected.');
    process.exit(1);
}

const enContent = splitParts[0]; // Includes imports but effectively the EN part
const zhContent = splitParts[1]; // The ZH part

function getKeysFromText(text) {
    const keys = new Set();
    // Regex for "KEY: value,"
    const keyRegex = /^\s*([A-Z0-9_]+)\s*:/gm;
    let m;
    while ((m = keyRegex.exec(text)) !== null) {
        keys.add(m[1]);
    }
    return keys;
}

const enKeys = getKeysFromText(enContent);
const zhKeys = getKeysFromText(zhContent);

// 3. Verify
const missingEnLabels = [...expectedLabels].filter(k => !enKeys.has(k));
const missingZhLabels = [...expectedLabels].filter(k => !zhKeys.has(k));
const missingEnCats = [...expectedCats].filter(k => !enKeys.has(k));
const missingZhCats = [...expectedCats].filter(k => !zhKeys.has(k));

console.log('--- Verification V2 Report ---');
console.log(`Expected Labels: ${expectedLabels.size}`);
console.log(`Expected Cats: ${expectedCats.size}`);
console.log(`Found EN Keys: ${enKeys.size}`);
console.log(`Found ZH Keys: ${zhKeys.size}`);

if (missingEnLabels.length > 0) console.log('MISSING EN LABELS:', missingEnLabels);
if (missingZhLabels.length > 0) console.log('MISSING ZH LABELS:', missingZhLabels);
if (missingEnCats.length > 0) console.log('MISSING EN CATS:', missingEnCats);
if (missingZhCats.length > 0) console.log('MISSING ZH CATS:', missingZhCats);

if (missingEnLabels.length + missingZhLabels.length + missingEnCats.length + missingZhCats.length === 0) {
    console.log('SUCCESS: All keys present.');
} else {
    console.log('FAILURE: Missing keys finding.');
    process.exit(1);
}
