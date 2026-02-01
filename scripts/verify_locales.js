/**
 * ============================================================
 * 国际化翻译完整性验证工具 (Locales Verification Utility)
 * ============================================================
 * 
 * 功能: 检查工具箱和注册表中使用的国际化 Key 是否在中英文语言包中都有定义
 * 
 * 检查范围:
 * - src/config/toolbox_categories.ts 中的 %{BKY_LABEL_*} 占位符
 * - src/registries/BoardRegistry.ts 中的 Blockly.Msg.CAT_* 引用
 * 
 * 运行方式: node verify_locales_v2.js
 * 
 * @file verify_locales_v2.js
 */

const fs = require('fs');
const path = require('path');

// ------------------------------------------------------------------
// 文件路径配置 (从 scripts/ 目录访问项目根目录)
// ------------------------------------------------------------------
const toolboxPath = path.join(__dirname, '../src/config/toolbox_categories.ts');
const localesPath = path.join(__dirname, '../src/locales/setupBlocklyLocales.ts');
const registryPath = path.join(__dirname, '../src/registries/BoardRegistry.ts');

// 读取源文件
const toolboxContent = fs.readFileSync(toolboxPath, 'utf8');
const localesContent = fs.readFileSync(localesPath, 'utf8');
const registryContent = fs.readFileSync(registryPath, 'utf8');

// ------------------------------------------------------------------
// 第一步: 提取需要验证的 Key
// ------------------------------------------------------------------

// 提取 LABEL_* 类型的 Key (工具箱标签)
const expectedLabels = new Set();
let match;
const labelRegex = /%\{BKY_(LABEL_[a-zA-Z0-9_]+)\}/g;
while ((match = labelRegex.exec(toolboxContent)) !== null) {
    expectedLabels.add(match[1]);
}

// 提取 CAT_* 类型的 Key (分类名称)
const catRegex = /Blockly\.Msg\.(CAT_[a-zA-Z0-9_]+)/g;
const expectedCats = new Set();
while ((match = catRegex.exec(registryContent)) !== null) {
    expectedCats.add(match[1]);
}

// ------------------------------------------------------------------
// 第二步: 解析语言包文件，分离中英文 Key
// ------------------------------------------------------------------

// 使用 'zh: {' 作为分隔符分割文件内容
const splitParts = localesContent.split('zh: {');
if (splitParts.length < 2) {
    console.error('错误: 无法通过 "zh: {" 分割文件，文件结构可能已更改');
    process.exit(1);
}

const enContent = splitParts[0]; // 英文部分 (包含 import 语句，但不影响 Key 提取)
const zhContent = splitParts[1]; // 中文部分

/**
 * 从文本中提取所有国际化 Key
 * @param {string} text - 语言包文本内容
 * @returns {Set<string>} - Key 集合
 */
function getKeysFromText(text) {
    const keys = new Set();
    // 匹配格式: KEY_NAME: "value" 或 KEY_NAME: 'value'
    const keyRegex = /^\s*([A-Z0-9_]+)\s*:/gm;
    let m;
    while ((m = keyRegex.exec(text)) !== null) {
        keys.add(m[1]);
    }
    return keys;
}

const enKeys = getKeysFromText(enContent);
const zhKeys = getKeysFromText(zhContent);

// ------------------------------------------------------------------
// 第三步: 验证并输出报告
// ------------------------------------------------------------------

// 找出缺失的 Key
const missingEnLabels = [...expectedLabels].filter(k => !enKeys.has(k));
const missingZhLabels = [...expectedLabels].filter(k => !zhKeys.has(k));
const missingEnCats = [...expectedCats].filter(k => !enKeys.has(k));
const missingZhCats = [...expectedCats].filter(k => !zhKeys.has(k));

console.log('--- 国际化验证报告 (V2) ---');
console.log(`期望的 LABEL Key 数量: ${expectedLabels.size}`);
console.log(`期望的 CAT Key 数量: ${expectedCats.size}`);
console.log(`英文 Key 总数: ${enKeys.size}`);
console.log(`中文 Key 总数: ${zhKeys.size}`);
console.log('');

// 输出缺失的 Key
if (missingEnLabels.length > 0) console.log('❌ 英文缺失 LABEL:', missingEnLabels);
if (missingZhLabels.length > 0) console.log('❌ 中文缺失 LABEL:', missingZhLabels);
if (missingEnCats.length > 0) console.log('❌ 英文缺失 CAT:', missingEnCats);
if (missingZhCats.length > 0) console.log('❌ 中文缺失 CAT:', missingZhCats);

// 最终结果
const totalMissing = missingEnLabels.length + missingZhLabels.length + missingEnCats.length + missingZhCats.length;
if (totalMissing === 0) {
    console.log('✅ 验证通过: 所有 Key 在中英文语言包中均已定义');
} else {
    console.log(`❌ 验证失败: 共发现 ${totalMissing} 个缺失的 Key`);
    process.exit(1);
}
