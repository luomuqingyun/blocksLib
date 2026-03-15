const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../src/data/ai_block_schema.json');
const outputPath = path.join(__dirname, '../chip_specific_blocks.md');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Categories that are explicitly for specific chips or advanced hardware not available on basic Arduino Unos
const chipSpecificCategories = [
    'ESP32专用',
    'STM32专用',
    'WiFi网络',
    'BLE',
    '蓝牙',
    'ESP-NOW',
    'Firebase',
    'Blynk',
    'OTA升级',
    'DAC',
    '触摸',
    'RTOS',
    '芯片信息',
    '加密',
    'Web服务',
    'HTTP',
    'WebSocket',
    'Telegram',
    'OpenAI'
];

let md = '# 特定芯片/高级功能积木分析报告 (Chip Specific Blocks Analysis)\n\n';
md += '本文档分析了 Blockly 工具箱中，那些**由于硬件特性限制，并非所有芯片（如基础的 Arduino Uno/Nano）都能通用支持**的积木模块。\n\n';
md += '这些积木目前在切换开发板时可能没有被完美过滤，按需自动加载机制也不完善，在此列出供后续优化参考。\n\n';

let totalSpecific = 0;

for (const category of chipSpecificCategories) {
    const blocksInCategory = schema.blocks.filter(b => b.category === category);
    
    if (blocksInCategory.length > 0) {
        md += `## 分类: ${category} (${blocksInCategory.length} 个积木)\n\n`;
        md += `| 积木 Type | 描述 | 预期适用芯片 |\n`;
        md += `| --- | --- | --- |\n`;
        
        for (const block of blocksInCategory) {
            let expectedChip = 'ESP32 / ESP8266 / STM32 (部分网络扩展)';
            if (category === 'ESP32专用') expectedChip = 'ESP32系列';
            if (category === 'STM32专用') expectedChip = 'STM32系列';
            if (category === 'RTOS') expectedChip = 'ESP32 (自带FreeRTOS) / STM32 (配置后)';
            if (category === 'DAC' || category === '触摸') expectedChip = 'ESP32 / 特定STM32';
            if (category === '芯片信息') expectedChip = 'ESP32 / STM32';
            
            md += `| \`${block.type}\` | ${block.description ? block.description.split('\\n')[0].replace(/\\/g, '') : '无描述'} | ${expectedChip} |\n`;
            totalSpecific++;
        }
        md += '\n';
    }
}

md += `\n**总计识别出的特定硬件相关积木数量: ${totalSpecific}**\n\n`;

md += `## 结论与建议
1. **网络类积木 (WiFi, BLE, MQTT, HTTP等)**: 基础款微控制器（如 Arduino Uno）不具备这些功能，除非外挂模块。
2. **高级硬件接口 (DAC, Touch, CAN)**: 只有特定的 MCU 型号原生支持。
3. **性能向功能 (Crypto 加密, RTOS, 本地文件系统)**: 在 RAM 和 Flash 较小的 8 位单片机上无法运行。

**建议**:
* 在 \`ModuleRegistry\` 中引入 \`supportedChips: string[]\` 字段或 \`requiredFeatures: string[]\`。
* 在板卡定义 (board.json) 中添加该板卡支持的功能标签 (如 \`["wifi", "ble", "dac"]\`)。
* 动态工具箱加载时，根据当前选择的 board 的特性集合，隐藏不支持的分类。
`;

fs.writeFileSync(outputPath, md, 'utf8');
console.log(`Report generated at ${outputPath} with ${totalSpecific} blocks.`);
