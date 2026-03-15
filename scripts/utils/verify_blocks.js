const fs = require('fs');
const path = require('path');

// 指向 AI 助手使用的积木 Schema 文件路径
const schemaPath = path.join(__dirname, '../../src/data/ai_block_schema.json');

if (!fs.existsSync(schemaPath)) {
    console.error(`❌ 未找到 Schema 文件: ${schemaPath}`);
    process.exit(1);
}

// 读取并解析 Schema JSON
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const logs = [];

/**
 * 打印审计日志并记录到数组中
 * @param {'error' | 'warning' | 'info'} type 日志类型
 * @param {string} msg 消息内容
 * @param {string} block 对应的积木 ID
 */
function log(type, msg, block = '') {
    const entry = { type, msg, block };
    logs.push(entry);
    const symbol = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    console.log(`${symbol} ${block ? `[${block}] ` : ''}${msg}`);
}

console.log(`\n🔍 开始积木健康度审计，共检测 ${schema.blocks ? schema.blocks.length : 0} 个积木...\n`);

if (!schema.blocks || !Array.isArray(schema.blocks)) {
    console.error('❌ 错误: schema.blocks 缺失或格式不正确');
    process.exit(1);
}

let errorCount = 0;
let warningCount = 0;

// 遍历所有从源码提取的积木定义
schema.blocks.forEach((block, index) => {
    if (!block) {
        log('warning', `索引 ${index} 处的积木为空，跳过`);
        return;
    }
    
    try {
        const { type, description, params = {}, category = '' } = block;
        if (!type) {
             log('error', `索引 ${index} 处的积木缺失 "type" 属性`, 'MISSING_TYPE');
             errorCount++;
             return;
        }

        // --- 1. 描述完整性检查 ---
        // 积木必须有 description，否则 AI 助手无法根据语义生成代码
        if (!description || description.trim().length === 0) {
            log('error', '缺少积木功能描述 (AI 代码生成的核心依赖)', type);
            errorCount++;
        } else if (description.length < 10) {
            // 描述过短（如仅为“读取”）会导致 AI 理解偏差
            log('warning', '积木描述可能过短，不利于 AI 精准匹配上下文', type);
            warningCount++;
        }

        // --- 2. 参数(Params)说明检查 ---
        // 检查通过 JSDoc @param 提取的参数是否有对应的语义化说明
        if (params && Object.keys(params).length > 0) {
            for (const [pName, pDesc] of Object.entries(params)) {
                // 如果参数说明为空，或者说明就是参数名本身（无增量信息）
                if (!pDesc || pDesc.trim().length === 0 || pDesc === pName) {
                    log('warning', `参数 [${pName}] 缺少语义化的详细说明`, type);
                    warningCount++;
                }
            }
        }

        // --- 3. 跨平台兼容性/硬编码侦测 (静态嗅探) ---
        // 识别那些表面上是通用积木，但描述或代码中含有特定平台假设的内容
        const riskyWords = ['Serial2', 'Serial1', 'HardwareSerial', '16', '17', 'esp32_cam', 'GPIO'];
        for (const word of riskyWords) {
            if (description && description.includes(word)) {
                // 如果该积木不属于 ESP32 或特定硬件分类，却提到了 ESP32 的引脚或串口
                if (!category.includes('ESP32') && !category.includes('专用')) {
                     log('warning', `通用积木中包含潜在的特定硬件引用 [${word}]，请检查通用性`, type);
                     warningCount++;
                }
            }
        }
    } catch (e) {
        log('error', `审计过程异常 (索引 ${index}): ${e.message}`, 'CRITICAL');
        errorCount++;
    }
});

console.log('\n======================================================');
console.log(`审计结果报告:`);
console.log(`- 已检测积木总数: ${schema.blocks.length}`);
console.log(`- 致命错误 (Errors): ${errorCount}`);
console.log(`- 优化建议 (Warnings): ${warningCount}`);
console.log('======================================================\n');

if (errorCount > 0) {
    console.log('💡 提示：Errors 会导致 AI 助手无法正确识别及合成该积木。');
    console.log('   请检查对应 TS 源码文件中的 JSDoc 注释。');
} else {
    console.log('✨ 积木 Schema 完整性良好，已准备好用于 AI 助手！');
}
