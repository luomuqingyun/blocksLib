import { generateIniConfig } from './electron/config/templates';
import * as fs from 'fs';

const meta = JSON.parse(fs.readFileSync('./eb_compilation_tests/test_generic_stm32wba50kg/test_meta.json', 'utf8'));
console.log('Metaloaded:', meta);
const ini = generateIniConfig(meta);
console.log('Resulting INI:\n' + ini);
