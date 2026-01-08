const fs = require('fs');
const path = require('path');

const toolboxPath = path.join(__dirname, 'src/config/toolbox_categories.ts');
const localesPath = path.join(__dirname, 'src/locales/setupBlocklyLocales.ts');
const registryPath = path.join(__dirname, 'src/registries/BoardRegistry.ts');

const toolboxContent = fs.readFileSync(toolboxPath, 'utf8');
const localesContent = fs.readFileSync(localesPath, 'utf8');
const registryContent = fs.readFileSync(registryPath, 'utf8');

const labelRegex = /%\{BKY_(LABEL_[a-zA-Z0-9_]+)\}/g;
const catRegex = /Blockly\.Msg\.(CAT_[a-zA-Z0-9_]+)/g;

const requiredKeys = new Set();
const labelMatches = toolboxContent.matchAll(labelRegex);
for (const match of labelMatches) requiredKeys.add(match[1]);

const catMatchesToolbox = toolboxContent.matchAll(catRegex);
for (const match of catMatchesToolbox) requiredKeys.add(match[1]);

const catMatchesRegistry = registryContent.matchAll(catRegex);
for (const match of catMatchesRegistry) requiredKeys.add(match[1]);

console.log(`Checking ${requiredKeys.size} required keys...`);

const missing = [];
const single = [];

requiredKeys.forEach(key => {
    // Regex to match "KEY:" or "KEY :"
    // We use a global regex to count occurrences
    const keyPattern = new RegExp(`\\b${key}\\s*:`, 'g');
    const matches = localesContent.match(keyPattern);
    const count = matches ? matches.length : 0;

    if (count === 0) {
        missing.push(key);
    } else if (count === 1) {
        single.push(key);
    }
});

if (missing.length > 0) {
    console.error('CRITICAL: COMPLETELY MISSING KEYS:', missing);
}
if (single.length > 0) {
    console.error('WARNING: KEYS ONLY IN ONE LOCALE (Count=1):', single);
}

if (missing.length === 0 && single.length === 0) {
    console.log('SUCCESS: All keys present in at least 2 locations (likely EN/ZH).');
} else {
    console.log('Verification Failed.');
    process.exit(1);
}
