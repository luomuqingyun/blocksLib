const fs = require('fs');
const path = require('path');
const os = require('os');


const openclawConfigFile = path.join(os.homedir(), '.openclaw', 'openclaw.json');
const studioConfigFile = path.join(os.homedir(), 'AppData', 'Roaming', 'EmbedBlocks', 'config.json');

try {
    if (fs.existsSync(openclawConfigFile)) {
        const config = JSON.parse(fs.readFileSync(openclawConfigFile, 'utf8'));
        if (config.env && config.env.DEEPSEEK_API_KEY) {
            delete config.env.DEEPSEEK_API_KEY;
        }
        if (config.models && config.models.providers && config.models.providers.deepseek) {
            delete config.models.providers.deepseek.apiKey;
        }
        fs.writeFileSync(openclawConfigFile, JSON.stringify(config, null, 2));
        console.log('Fixed ', openclawConfigFile);
    }

    if (fs.existsSync(studioConfigFile)) {
        const config = JSON.parse(fs.readFileSync(studioConfigFile, 'utf8'));
        if (config.ai && config.ai.apiKey) {
            delete config.ai.apiKey;
        }
        fs.writeFileSync(studioConfigFile, JSON.stringify(config, null, 2));
        console.log('Fixed ', studioConfigFile);
    }
} catch (e) {
    console.error(e);
}
