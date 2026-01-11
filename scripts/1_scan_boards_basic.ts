// ----------------------------------------------------------------------------
// 脚本名称: 1_scan_boards_basic.ts
// 用途: 板卡基础信息扫描器
// 描述: 
// 1. 使用 `pio boards` 命令扫描 PlatformIO 目录下的所有板卡定义。
// 2. 将数据分为两类:
//    - stm32_board_data.json: 包含所有 STM32 系列及其层级结构。
//    - standard_board_data.json: 包含 Arduino、ESP32 等热门精选板卡。
// 3. 这是数据生成流程的第一步，为后续的引脚扫描和数据补全提供基础。
// ----------------------------------------------------------------------------
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

const execPromise = util.promisify(exec);

// 需要扫描的目标平台及其显示标签
const PLATFORMS = {
    'atmelavr': 'Arduino',
    'espressif32': 'ESP32',
    'ststm32': 'STM32',
    'microchippic32': 'PIC32'
};

// 输出文件配置
const OUTPUT_STM32 = path.join(__dirname, 'stm32_board_data.json');
const OUTPUT_STANDARD = path.join(__dirname, 'standard_board_data.json');

// 热门板卡白名单 (非 STM32)
// 只有在白名单中的板卡才会进入 standard_board_data.json
const ALLOW_LIST = new Set([
    // Arduino
    'uno', 'nanoatmega328', 'megaatmega2560', 'leonardo', 'pro16MHzatmega328',

    // ESP32
    'esp32dev', 'nodemcu-32s', 'wemos_d1_mini32', 'lolin32', 'esp32-s3-devkitc-1', 'esp32-c3-devkitm-1',
    // ESP32 相机板卡
    'esp32cam', 'seeed_xiao_esp32s3'
]);

/**
 * 从 STM32 型号名中解析引脚数和封装
 * 规律: STM32[Family][PinCode][FlashCode][PackageCode]
 * 例如: STM32F103C8T6 -> C=48引脚, T=LQFP
 */
function parseStm32Metadata(mcu: string, series: string = '') {
    const norm = mcu.toUpperCase();

    // 针对不同系列的特殊处理逻辑
    let overridePinCount = 0;
    let overridePackage = '';

    // STM32WL 特殊规则
    if (series.startsWith('STM32WL')) {
        if (norm.includes('WL55J') || norm.includes('WL54J')) { overridePinCount = 73; overridePackage = 'UFBGA'; }
        if (norm.includes('WL55U') || norm.includes('WL54U')) { overridePinCount = 48; overridePackage = 'QFPN'; }
        if (norm.includes('WL55Y') || norm.includes('WL54Y')) { overridePinCount = 59; overridePackage = 'WLCSP'; }
    }

    // STM32G0/L0 特殊规则 (J = 8-pin SO8)
    // G031J6 -> 8 pins, SOIC8
    if ((series.startsWith('STM32G0') || series.startsWith('STM32L0')) && norm.includes('J')) {
        overridePinCount = 8;
        overridePackage = 'SOIC';
    }

    // 匹配典型的 STM32 命名位点 (使用后缀匹配策略)
    // 重要修正: 强制要求 MCU 型号中包含数字，且引脚代码位于数字之后，避免将 'WB' 的 'B' 误判为 208引脚
    // Regex: STM32 + ... + Digits(1-4) + PinCode + FlashCode + PackageCode? + Suffix
    const match = norm.match(/STM32.*?[0-9]{1,4}([FGKTCRMVQZAIBNJUD])([0-9A-Z])([HUTYPMACIQ])?(.*)$/);

    const pinCounts: Record<string, number> = {
        'J': 8, 'D': 14, 'F': 20, 'E': 25, 'G': 28, 'K': 32, 'T': 36, 'S': 44, 'C': 48,
        'R': 64, 'M': 80, 'O': 90, 'V': 100, 'Q': 132, 'Z': 144, 'A': 169, 'I': 176, 'B': 208, 'N': 216
    };

    const packages: Record<string, string> = {
        'T': 'LQFP', 'H': 'BGA', 'U': 'QFPN', 'Y': 'WLCSP', 'P': 'TSSOP', 'M': 'SOIC',
        'A': 'UFBGA', 'C': 'WLCSP', 'J': 'UFBGA', 'K': 'UFBGA', 'I': 'UFBGA', 'Q': 'BGA'
    };

    let pinCode = '';
    let packageCode = '';

    if (match) {
        pinCode = match[1];
        packageCode = match[3] || '';
    }

    // 智能补全: 如果缺失封装代码，根据引脚数与系列特性进行推断
    if (!packageCode && pinCode && !overridePackage) {
        const tempPinCount = pinCounts[pinCode] || 0;

        // WB 系列偏好 QFN (U)
        if (series.startsWith('STM32WB') && tempPinCount === 48) {
            packageCode = 'U'; // QFPN
        }
        else if (tempPinCount > 0) {
            if (tempPinCount < 32) {
                packageCode = 'P'; // TSSOP
            } else {
                packageCode = 'T'; // LQFP (Default)
            }
        }
    }

    let finalPinCount = overridePinCount || pinCounts[pinCode] || 0;
    let finalPackage = overridePackage || packages[packageCode] || 'Unknown';

    // Fallback logic for Unknown package with high pin count -> BGA
    if (finalPackage === 'Unknown' && finalPinCount > 100) {
        finalPackage = 'BGA';
    }

    return {
        pinCount: finalPinCount,
        package: finalPackage
    };
}

async function main() {
    console.log('正在开始全平台板卡扫描...');

    const stm32Data: any = {};
    const standardData: any = {};

    for (const [platform, label] of Object.entries(PLATFORMS)) {
        console.log(`正在扫描 ${label} 平台 (${platform})...`);

        try {
            // 执行 pio 命令并输出 JSON
            const { stdout } = await execPromise(`pio boards ${platform} --json-output`);
            const boards = JSON.parse(stdout);

            // 数据后处理
            for (const board of boards) {
                // 自动注入连接性信息
                if (!board.connectivity) {
                    if (board.id.includes('esp')) {
                        board.connectivity = ['wifi'];
                        if (board.id.includes('32')) board.connectivity.push('bluetooth');
                    } else {
                        // 基础 Arduino 假设，可根据需要进一步细化
                        board.connectivity = [];
                    }
                }

                // 根据平台进行分类处理
                if (platform === 'ststm32') {
                    // STM32: 保留所有板卡，并按系列 (Series) 进行层级划分
                    const mcu = (board.mcu || 'UNKNOWN').toUpperCase();
                    // 使用正则表达式提取系列号 (如 STM32F1, STM32G0, STM32WB...)
                    // MCU 通常格式为 STM32F103C8T6 或 STM32G0B1RET6
                    const seriesMatch = mcu.match(/STM32([A-Z][0-9A-Z])/i);
                    const series = seriesMatch ? `STM32${seriesMatch[1].toUpperCase()}` : 'Other';

                    if (!stm32Data[series]) stm32Data[series] = [];

                    const meta = parseStm32Metadata(mcu, series);

                    // 高级视图通过 MCU 型号进行标准化命名，这样列表最整洁 (如 STM32F103C8T6)
                    // 仅在没有 MCU 信息时回退到原始名称
                    const displayName = (board.mcu || board.name).trim();

                    stm32Data[series].push({
                        id: board.id,
                        name: displayName,
                        platform: platform,
                        mcu: board.mcu,
                        fcpu: board.fcpu,
                        pinCount: meta.pinCount,
                        package: meta.package,
                        specs: `${(board.rom / 1024) || '?'}k Flash / ${(board.ram / 1024) || '?'}k RAM`,
                        capabilities: board.connectivity || []
                    });
                } else {
                    // 标准板卡: 根据白名单过滤
                    if (ALLOW_LIST.has(board.id)) {
                        const groupName = label; // Arduino, ESP32 等
                        if (!standardData[groupName]) standardData[groupName] = [];

                        standardData[groupName].push({
                            id: board.id,
                            name: board.name,
                            platform: platform, // 新增：记录平台
                            mcu: board.mcu,
                            fcpu: board.fcpu, // 新增：主频
                            specs: `${(board.rom / 1024) || '?'}k Flash / ${(board.ram / 1024) || '?'}k RAM`,
                            capabilities: board.connectivity || []
                        });
                    }
                }
            }

        } catch (e) {
            console.error(`扫描 ${platform} 时出错:`, e);
        }
    }

    // 保存输出文件
    fs.writeFileSync(OUTPUT_STM32, JSON.stringify({ STM32: stm32Data }, null, 2));
    fs.writeFileSync(OUTPUT_STANDARD, JSON.stringify(standardData, null, 2));

    console.log(`\n====== 扫描完成 ======`);
    console.log(`STM32 数据已保存至: ${OUTPUT_STM32}`);
    console.log(`标准板卡数据已保存至: ${OUTPUT_STANDARD}`);
}

main();
