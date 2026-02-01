// ----------------------------------------------------------------------------
// 脚本名称: 3_enrich_standard_boards.ts
// 用途: 标准板卡信息补全与精细化
// 描述: 
// 1. 读取基础扫描生成的 `standard_board_data.json`。
// 2. 为热门板卡 (如 Uno, ESP32) 手工补全精确的硬件规格 (频率、Flash、RAM)。
// 3. 注入标准化的引脚定义 (D0, D1, A0, A1 等)，确保在 UI 中显示友好。
// 4. 将补全后的数据写回 JSON，为最终生成板卡文件做准备。
// ----------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'standard_board_data.json');

// 硬件规格补全查找表
const HARDWARE_SPECS: Record<string, any> = {
    // Arduino AVR 系列
    'uno': { freq: '16MHz', flash: '32k', ram: '2k', fqbn: 'arduino:avr:uno', url: 'https://docs.arduino.cc/hardware/uno-rev3' },
    'nanoatmega328': { freq: '16MHz', flash: '32k', ram: '2k', fqbn: 'arduino:avr:nano', url: 'https://docs.arduino.cc/hardware/nano' },
    'megaatmega2560': { freq: '16MHz', flash: '256k', ram: '8k', fqbn: 'arduino:avr:mega', url: 'https://docs.arduino.cc/hardware/mega-2560' },
    'leonardo': { freq: '16MHz', flash: '32k', ram: '2.5k', fqbn: 'arduino:avr:leonardo', url: 'https://docs.arduino.cc/hardware/leonardo' },

    // ESP32 系列
    'esp32dev': { freq: '240MHz', flash: '4MB', ram: '520k', fqbn: 'esp32:esp32:esp32', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32/hw-reference/esp32/get-started-devkitc.html' },
    'esp32cam': { freq: '160MHz', flash: '4MB', ram: '520k', fqbn: 'esp32:esp32:esp32cam', url: 'https://randomnerdtutorials.com/esp32-cam-video-streaming-face-recognition-arduino-ide/' },
    'seeed_xiao_esp32s3': { freq: '240MHz', flash: '8MB', ram: '8MB', fqbn: 'esp32:esp32:xiao_esp32s3', url: 'https://wiki.seeedstudio.com/xiao_esp32s3/' },
    'esp32-s3-devkitc-1': { freq: '240MHz', flash: '8MB', ram: '512k', fqbn: 'esp32:esp32:esp32s3', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/hw-reference/esp32s3/user-guide-devkitc-1.html' }
};

// 引脚映射补全 (用于 UI 显示)
const PIN_DEFINITIONS: Record<string, any> = {
    'uno': {
        digital: Array.from({ length: 14 }, (_, i) => ({ label: `D${i}`, value: `${i}` })),
        analog: Array.from({ length: 6 }, (_, i) => ({ label: `A${i}`, value: `A${i}` })),
        pwm: [3, 5, 6, 9, 10, 11].map(i => ({ label: `D${i} (PWM)`, value: `${i}` }))
    },
    'esp32dev': {
        digital: [
            { label: 'GPIO1', value: '1' }, { label: 'GPIO3', value: '3' },
            { label: 'GPIO21 (SDA)', value: '21' }, { label: 'GPIO22 (SCL)', value: '22' }
        ],
        analog: [{ label: 'ADC1_0', value: '36' }, { label: 'ADC1_3', value: '39' }]
    }
};

/**
 * 补全逻辑
 */
function enrich() {
    console.log('正在开始标准板卡数据补全...');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error('错误: 找不到输入 JSON 文件');
        return;
    }

    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

    for (const group of Object.keys(data)) {
        console.log(`正在处理 ${group} 分组...`);

        data[group] = data[group].map((board: any) => {
            // 1. 补全硬件规格 (Specs)
            const spec = HARDWARE_SPECS[board.id];
            if (spec) {
                board.freq = spec.freq;
                board.flash = spec.flash;
                board.ram = spec.ram;
                board.fqbn = spec.fqbn;
                if (spec.url) board.page_url = spec.url;
            } else {
                // 如果没有预设规格，则尝试从已有的 specs 字符串微调 (可选)
                board.freq = '16MHz'; // 默认
                board.fqbn = '';
            }

            // 2. 补全引脚定义 (Pins)
            const pins = PIN_DEFINITIONS[board.id];
            if (pins) {
                board.pins = pins;
            } else {
                // 生成通用的占位引脚
                board.pins = { digital: [], analog: [], pwm: [], i2c: [], spi: [] };
            }

            return board;
        });
    }

    // 写回文件
    fs.writeFileSync(INPUT_FILE, JSON.stringify(data, null, 2));
    console.log('数据补全完成！');
}

enrich();
