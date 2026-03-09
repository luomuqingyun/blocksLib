const fs = require('fs');
const path = require('path');
const os = require('os');
const configFile = path.join(os.homedir(), '.openclaw', 'openclaw.json');

const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
if (config.models && config.models.providers && config.models.providers.deepseek) {
    config.models.providers.deepseek.baseUrl = 'http://127.0.0.1:9999/v1';
}
fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
console.log('Updated config baseUrl to point to proxy');
