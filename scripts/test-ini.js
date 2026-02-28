const fs = require('fs');
const meta = JSON.parse(fs.readFileSync('./eb_compilation_tests/test_generic_stm32wba50kg/test_meta.json', 'utf8'));

// Re-write generateIniConfig locally exactly as it in templates.ts/main.js
const sanitizeEnvName = (name) => {
    if (!name) return 'default';
    let cleanName = name;
    if (cleanName.startsWith('env:')) {
        cleanName = cleanName.substring(4);
    }
    let sanitized = cleanName.replace(/[^a-zA-Z0-9_]/g, '_');
    return sanitized;
};

const generateIniConfig = (template) => {
    let boardId = template.board;
    let useLocalPatch = template.local_patch;

    if (useLocalPatch) {
        boardId = 'eb_custom_board';
    }

    const safeEnvName = sanitizeEnvName(template.envName || template.board);
    let config = `[env:${safeEnvName}]\n`;
    config += `platform = ${template.platform}\n`;
    config += `board = ${boardId}\n`;
    config += `framework = ${template.framework}\n`;

    if (useLocalPatch) {
        config += `board_build.variants_dir = variants\n`;
        config += `board_build.variant = eb_custom_variant\n`;

        const actualBoard = String(template['original_board'] || template.board);
        if (actualBoard.toLowerCase().includes('wba') && !template['extra_scripts']) {
            config += `extra_scripts = post:fix_wba_build.py\n`;
        }
    }

    Object.keys(template).forEach(key => {
        if (key !== 'envName' && key !== 'platform' && key !== 'board' && key !== 'framework' && key !== 'custom_ini_content' && template[key]) {
            config += `${key} = ${template[key]}\n`;
        }
    });

    if (template.custom_ini_content) {
        config += `\n${template.custom_ini_content}\n`;
    }

    return config;
};

console.log('Resulting INI:\n' + generateIniConfig(meta));
