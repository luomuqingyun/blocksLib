/**
 * ============================================================
 * 积木 Schema 自动提取脚本 (Block Schema Auto-Extractor)
 * ============================================================
 * 
 * 扫描 src/modules/ 下所有 TypeScript 模块文件，提取积木定义的结构化信息：
 * - type: 积木类型名
 * - fields: 下拉菜单字段及其可选值
 * - inputs: 值输入和语句输入
 * - category: 语义分类（从文件路径推断）
 * - description: 中文描述（从注释提取）
 * 
 * 输出 → src/data/ai_block_schema.json
 * 
 * 用法: node scripts/extract_block_schema.js
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '..', 'src', 'modules');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'ai_block_schema.json');

// 分类映射：文件路径前缀 → AI 可读的分类标签
const CATEGORY_MAP = {
    'core/standard': '基础逻辑',
    'core/control': '流程控制',
    'core/variables': '变量',
    'core/time': '时间',
    'core/timer': '定时器',
    'core/data': '数据处理',
    'core/system': '系统',
    'core/logging': '日志',
    'core/signals': '信号',
    'core/crypto': '加密',
    'core/menu': '菜单',
    'core/game': '游戏',
    'core/text': '文本',
    'core/math': '数学',
    'core/logic': '高级逻辑',
    'core/loops': '高级循环',
    'core/lists': '列表',
    'core/dict': '字典',
    'core/rtos': 'RTOS',
    'core/diag': '诊断',
    'hardware/io': '基础IO',
    'hardware/servo': '舵机',
    'hardware/motor': '电机',
    'hardware/sensor': '传感器',
    'hardware/display': '显示屏',
    'hardware/neopixel': 'LED灯带',
    'hardware/esp': 'ESP32专用',
    'hardware/storage': '存储',
    'hardware/preferences': '参数存储',
    'hardware/rtc': '实时时钟',
    'hardware/camera': '摄像头',
    'hardware/audio': '音频',
    'hardware/mp3': 'MP3',
    'hardware/speech': '语音',
    'hardware/rfid': 'RFID',
    'hardware/touch': '触摸',
    'hardware/input': '输入设备',
    'hardware/ota': 'OTA升级',
    'hardware/dac': 'DAC',
    'hardware/shift': '移位寄存器',
    'hardware/barcode': '条码',
    'hardware/chip': '芯片信息',
    'protocols/serial': '串口通信',
    'protocols/i2c': 'I2C',
    'protocols/spi': 'SPI',
    'protocols/mqtt': 'MQTT',
    'protocols/network': 'WiFi网络',
    'protocols/bluetooth': '蓝牙',
    'protocols/ble': 'BLE',
    'protocols/lora': 'LoRa',
    'protocols/radio': '无线电',
    'protocols/ir': '红外',
    'protocols/web': 'Web服务',
    'protocols/http': 'HTTP',
    'protocols/websocket': 'WebSocket',
    'protocols/firebase': 'Firebase',
    'protocols/telegram': 'Telegram',
    'protocols/nrf': 'NRF24',
    'protocols/esp_now': 'ESP-NOW',
    'protocols/usb': 'USB HID',
    'protocols/auto': '自动化',
    'protocols/blynk': 'Blynk',
    'protocols/openai': 'OpenAI',
    'arduino/base': 'Arduino核心',
    'robots/': '机器人',
    'vendor/': '第三方硬件',
    'stm32/': 'STM32专用',
    'examples/': '示例',
};

/**
 * 从文件路径推断积木所属的语义分类
 */
function inferCategory(filePath) {
    const rel = filePath.replace(/\\/g, '/'); // 统一路径分隔符为正斜杠
    // 遍历匹配规则，按路径前缀识别分类
    for (const [prefix, label] of Object.entries(CATEGORY_MAP)) {
        if (rel.includes(prefix)) return label;
    }
    return '其他';
}

/**
 * 从 registerBlock 的 init 函数体中提取 fields 信息
 * 解析 FieldDropdown 和 FieldTextInput 等
 */
function extractFields(initBody) {
    const fields = {};

    // 匹配 FieldDropdown 模式: new Blockly.FieldDropdown([...]), "FIELD_NAME"
    // 或 new Blockly.FieldDropdown(functionRef), "FIELD_NAME"
    const ddRegex = /FieldDropdown\s*\(\s*(\[[\s\S]*?\]|\w+)\s*\)\s*,\s*["'](\w+)["']/g;
    let match;
    while ((match = ddRegex.exec(initBody)) !== null) {
        const fieldName = match[2];
        const optionsStr = match[1];

        if (optionsStr.startsWith('[')) {
            // 静态选项：提取所有 ["label", "value"] 对中的 value
            const valueRegex = /\[\s*["'][^"']*["']\s*,\s*["']([^"']+)["']\s*\]/g;
            const values = [];
            let vm;
            while ((vm = valueRegex.exec(optionsStr)) !== null) {
                values.push(vm[1]);
            }
            if (values.length > 0) {
                fields[fieldName] = values.length <= 8 ? values : values.slice(0, 6).concat(['...']);
            } else {
                fields[fieldName] = '(动态选项)';
            }
        } else {
            // 动态选项（函数引用，如 generateDigitalOptions）
            if (optionsStr.includes('Digital') || optionsStr.includes('digital')) {
                fields[fieldName] = '(数字引脚)';
            } else if (optionsStr.includes('PWM') || optionsStr.includes('pwm')) {
                fields[fieldName] = '(PWM引脚)';
            } else if (optionsStr.includes('Analog') || optionsStr.includes('analog')) {
                fields[fieldName] = '(模拟引脚)';
            } else {
                fields[fieldName] = '(动态选项)';
            }
        }
    }

    // 匹配 FieldNumber: new Blockly.FieldNumber(default), "FIELD_NAME"
    const fnRegex = /FieldNumber\s*\([^)]*\)\s*,\s*["'](\w+)["']/g;
    while ((match = fnRegex.exec(initBody)) !== null) {
        fields[match[1]] = '(数值)';
    }

    // 匹配 FieldTextInput: new Blockly.FieldTextInput(...), "FIELD_NAME"
    const ftRegex = /FieldTextInput\s*\([^)]*\)\s*,\s*["'](\w+)["']/g;
    while ((match = ftRegex.exec(initBody)) !== null) {
        fields[match[1]] = '(文本)';
    }

    return Object.keys(fields).length > 0 ? fields : undefined;
}

/**
 * 从 init 函数体中提取 inputs 信息
 */
function extractInputs(initBody) {
    const inputs = {};

    // ValueInput: this.appendValueInput("NAME").setCheck("Type")
    const viRegex = /appendValueInput\s*\(\s*["'](\w+)["']\s*\)(?:\s*\.setCheck\s*\(\s*["'](\w+)["']\s*\))?/g;
    let match;
    while ((match = viRegex.exec(initBody)) !== null) {
        inputs[match[1]] = match[2] ? `value(${match[2]})` : 'value';
    }

    // StatementInput: this.appendStatementInput("NAME")
    const siRegex = /appendStatementInput\s*\(\s*["'](\w+)["']\s*\)/g;
    while ((match = siRegex.exec(initBody)) !== null) {
        inputs[match[1]] = 'statement';
    }

    return Object.keys(inputs).length > 0 ? inputs : undefined;
}

/**
 * 判断积木的连接类型
 */
function extractConnectionType(initBody) {
    const hasOutput = /setOutput\s*\(\s*true/.test(initBody);
    const hasPrev = /setPreviousStatement\s*\(\s*true/.test(initBody);
    const hasNext = /setNextStatement\s*\(\s*true/.test(initBody);

    if (hasOutput) return 'output'; // 值积木（有返回值）
    if (hasPrev && hasNext) return 'statement'; // 语句积木（可上下连接）
    if (hasPrev) return 'terminal'; // 终止语句（只能向上连接）
    return 'standalone'; // 独立积木
}

/**
 * 提取积木注释/描述及参数元数据
 * 能够解析多行 JSDoc 样式的注释，并将 @param 说明作为属性附加。
 */
function extractDescription(beforeBlock) {
    // 查找紧挨着 registerBlock 前的最后一个注释 (Find the last comment immediately before registerBlock)
    const allComments = Array.from(beforeBlock.matchAll(/\/\*\*?([\s\S]*?)\*\//g));
    if (allComments.length > 0) {
        const lastComment = allComments[allComments.length - 1];
        const lines = lastComment[1].split('\n')
            .map(l => l.replace(/^\s*\*\s?/, '').trim())
            .filter(l => l.length > 0);
            
        let description = [];
        let params = {};
        
        for (const line of lines) {
            if (line.startsWith('@param')) {
                // 解析参数 @param {Type} NAME description
                const paramMatch = line.match(/@param\s*(?:\{[^}]+\})?\s*([A-Za-z0-9_]+)\s*(.*)/);
                if (paramMatch) {
                    params[paramMatch[1]] = paramMatch[2].trim();
                }
            } else if (!line.startsWith('@')) {
                // 如果不是以 @ 开头的特殊标签（如 @category），则视为正文描述
                if (!line.match(/^[=\-]+$/)) { // 过滤掉全是等号或减号的分割线
                    description.push(line);
                }
            }
        }
        
        return {
            text: description.join(' ') || undefined,
            params: Object.keys(params).length > 0 ? params : undefined
        };
    }
    
    // 退化到行注释
    const lineComment = beforeBlock.match(/\/\/\s*(.+)\s*$/);
    if (lineComment) {
        return { text: lineComment[1].trim(), params: undefined };
    }
    
    return { text: undefined, params: undefined };
}

/**
 * 主提取逻辑：解析单个 TS 文件中的所有 registerBlock 调用
 */
function extractFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const blocks = [];

    // 模式 1: registerBlock('type', { init ... }, generator)
    // 全局正则匹配 registerBlock('ID', { init: ... }, (block) => { code: ... })
    // 注意：我们将 init 函数体和生成器代码体分别捕获
    const rbRegex = /registerBlock\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{([\s\S]*?)^\s*\}\s*,/gm;
    let match;
    while ((match = rbRegex.exec(content)) !== null) {
        const type = match[1];
        const initBody = match[2];
        const beforeBlock = content.substring(Math.max(0, match.index - 800), match.index);
        
        const descData = extractDescription(beforeBlock);

        blocks.push({
            type,
            category: inferCategory(filePath),
            connection: extractConnectionType(initBody),
            fields: extractFields(initBody),
            inputs: extractInputs(initBody),
            description: descData.text,
            params: descData.params,
        });
    }

    // 模式 2: registerGeneratorOnly('type', generator) — Blockly 内置积木
    const rgoRegex = /registerGeneratorOnly\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = rgoRegex.exec(content)) !== null) {
        const type = match[1];
        const beforeBlock = content.substring(Math.max(0, match.index - 200), match.index);

        // 对 registerGeneratorOnly，从代码生成器的 block.getFieldValue / valueToCode 中推断
        const genBodyEnd = content.indexOf('});', match.index);
        const genBody = genBodyEnd > match.index ? content.substring(match.index, genBodyEnd) : '';

        const fields = {};
        const fieldRegex = /getFieldValue\s*\(\s*['"](\w+)['"]\s*\)/g;
        let fm;
        while ((fm = fieldRegex.exec(genBody)) !== null) {
            fields[fm[1]] = '(值)';
        }

        const inputs = {};
        const inputRegex = /(?:valueToCode|statementToCode)\s*\(\s*\w+\s*,\s*['"](\w+)['"]/g;
        while ((fm = inputRegex.exec(genBody)) !== null) {
            inputs[fm[1]] = inputRegex.source.includes('statement') ? 'statement' : 'value';
        }

        blocks.push({
            type,
            category: inferCategory(filePath),
            connection: genBody.includes('return [') || genBody.includes('return [`') ? 'output' : 'statement',
            fields: Object.keys(fields).length > 0 ? fields : undefined,
            inputs: Object.keys(inputs).length > 0 ? inputs : undefined,
            description: extractDescription(beforeBlock).text,
        });
    }

    return blocks;
}

/**
 * 递归扫描目录
 */
function scanDir(dir) {
    let allBlocks = [];
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) {
            allBlocks = allBlocks.concat(scanDir(full));
        } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
            const blocks = extractFromFile(full);
            if (blocks.length > 0) allBlocks = allBlocks.concat(blocks);
        }
    }
    return allBlocks;
}

// ===== 执行提取 =====
console.log('[extract_block_schema] 扫描模块目录:', MODULES_DIR);
const allBlocks = scanDir(MODULES_DIR);

// 按分类统计
const byCategory = {};
allBlocks.forEach(b => {
    byCategory[b.category] = (byCategory[b.category] || 0) + 1;
});

// 确保输出目录
const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 输出 JSON
const schema = {
    _meta: {
        generated: new Date().toISOString(),
        total: allBlocks.length,
        byCategory,
    },
    blocks: allBlocks,
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(schema, null, 2), 'utf8');
console.log(`[extract_block_schema] ✅ 提取完成: ${allBlocks.length} 个积木 → ${OUTPUT_FILE}`);
console.log('[extract_block_schema] 分类统计:', JSON.stringify(byCategory, null, 2));
