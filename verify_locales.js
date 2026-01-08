const fs = require('fs');
const path = require('path');

const toolboxPath = path.join(__dirname, 'src/config/toolbox_categories.ts');
const localesPath = path.join(__dirname, 'src/locales/setupBlocklyLocales.ts');
const registryPath = path.join(__dirname, 'src/registries/BoardRegistry.ts');

const toolboxContent = fs.readFileSync(toolboxPath, 'utf8');
const localesContent = fs.readFileSync(localesPath, 'utf8');
const registryContent = fs.readFileSync(registryPath, 'utf8');

// Extract BKY_LABEL_... usage
const labelRegex = /%\{BKY_(LABEL_[a-zA-Z0-9_]+)\}/g;
const usedLabels = new Set();
let match;
while ((match = labelRegex.exec(toolboxContent)) !== null) {
    usedLabels.add(match[1]);
}

// Extract CAT_... usage from BoardRegistry.ts
// Looking for Blockly.Msg.CAT_...
const catRegex = /Blockly\.Msg\.(CAT_[a-zA-Z0-9_]+)/g;
const usedCats = new Set();
while ((match = catRegex.exec(registryContent)) !== null) {
    usedCats.add(match[1]);
}

// Manually add known CAT keys that might be constructed dynamically or used elsewhere if any
// (None apparent, but good to keep in mind)

// Parse locales file (rough parsing)
// We extract the 'en: {' and 'zh: {' blocks.
// This is a bit hacky but should work for this specific file structure.

function extractKeys(content, localeName) {
    const keys = new Set();
    const startMarker = `${localeName}: {`;
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return keys;

    let braceCount = 1;
    let i = startIndex + startMarker.length;
    let blockContent = '';

    while (i < content.length && braceCount > 0) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') braceCount--;
        blockContent += content[i];
        i++;
    }

    // Now extract keys from lines like: KEY_NAME: "Value",
    const keyRegex = /^\s*([A-Z0-9_]+):/gm;
    while ((match = keyRegex.exec(blockContent)) !== null) {
        keys.add(match[1]);
    }
    return keys;
}

const enKeys = extractKeys(localesContent, 'en');
const zhKeys = extractKeys(localesContent, 'zh');

console.log('--- Verification Report ---');
console.log(`Found ${usedLabels.size} unique LABEL keys in toolbox.`);
console.log(`Found ${usedCats.size} unique CAT keys in registry.`);

const missingEnLabels = [...usedLabels].filter(l => !enKeys.has(l));
const missingZhLabels = [...usedLabels].filter(l => !zhKeys.has(l));
const missingEnCats = [...usedCats].filter(c => !enKeys.has(c));
const missingZhCats = [...usedCats].filter(c => !zhKeys.has(c));

if (missingEnLabels.length > 0) console.log('MISSING EN LABELS:', missingEnLabels);
if (missingZhLabels.length > 0) console.log('MISSING ZH LABELS:', missingZhLabels);
if (missingEnCats.length > 0) console.log('MISSING EN CATS:', missingEnCats);
if (missingZhCats.length > 0) console.log('MISSING ZH CATS:', missingZhCats);

if (missingEnLabels.length === 0 && missingZhLabels.length === 0 && missingEnCats.length === 0 && missingZhCats.length === 0) {
    console.log('SUCCESS: All keys are present in both locales.');
} else {
    console.log('FAILURE: Missing keys detected.');
    process.exit(1);
}
