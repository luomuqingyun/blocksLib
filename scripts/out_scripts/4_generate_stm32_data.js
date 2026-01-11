"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// ----------------------------------------------------------------------------
// 脚本名称: 4_generate_stm32_data.ts
// 用途: STM32 独立离线数据文件生成器
// 描述: 
// 1. 读取基础数据 (`stm32_board_data.json`) 和详细引脚数据 (`detailed_board_data.json`)。
// 2. 将它们进行合并 (Join)，生成最终完整的板卡对象。
// 3. 将数据按系列 (Series, 如 STM32F4, STM32L0) 分拆到独立的子目录中。
// 4. 每个板卡生成一个 `.json` 文件 (如 STM32F103C8T6.json)。
// 5. 自动清理空目录，保持输出目录整洁。
// ----------------------------------------------------------------------------
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
// 输入与输出路径配置
var INPUT_BASIC = path.join(__dirname, 'stm32_board_data.json');
var INPUT_DETAILS = path.join(__dirname, 'detailed_board_data.json');
var OUTPUT_DIR = path.join(__dirname, '../src/data/boards/stm32');
function main() {
    console.log('正在开始生成最终 STM32 独立数据文件...');
    if (!fs.existsSync(INPUT_BASIC) || !fs.existsSync(INPUT_DETAILS)) {
        console.error('错误: 找不到输入数据文件 (stm32_board_data 或 detailed_board_data)');
        return;
    }
    var basicData = JSON.parse(fs.readFileSync(INPUT_BASIC, 'utf8'));
    var detailsData = JSON.parse(fs.readFileSync(INPUT_DETAILS, 'utf8'));
    var stm32Series = basicData['STM32'];
    var totalFiles = 0;
    // 遍历每一个系列 (Series)
    Object.keys(stm32Series).forEach(function (series) {
        var boards = stm32Series[series];
        // 目标子目录: src/data/boards/stm32/STM32F4/
        var seriesDir = path.join(OUTPUT_DIR, series);
        if (!fs.existsSync(seriesDir)) {
            fs.mkdirSync(seriesDir, { recursive: true });
        }
        var seriesCount = 0;
        boards.forEach(function (b) {
            var mcuNameRaw = b.mcu || 'UNKNOWN';
            var mcuName = mcuNameRaw.trim(); // 严格修正尾部空格问题
            // 获取该型号的详细引脚数据
            var details = detailsData[b.id];
            // 构造完整的板卡对象
            var finalBoard = {
                id: b.id,
                name: b.name,
                platform: b.platform || 'ststm32', // 新增
                mcu: mcuName,
                fcpu: b.fcpu ? (b.fcpu / 1000000) : 0, // 新增：转换为 MHz
                specs: b.specs,
                description: "".concat(b.name, " - ").concat(series, " series board"),
                pinout: details || {}, // 如果没有引脚数据，则设为空对象
                pin_options: {
                    digital: [],
                    analog: [],
                    pwm: [],
                    i2c: [],
                    spi: []
                }
            };
            // 如果有引脚数据，则生成 pin_options 供 UI 快速选择
            if (details) {
                // 简单的映射逻辑：提取所有物理引脚号
                var allPins_1 = new Set();
                Object.values(details).forEach(function (inst) {
                    Object.values(inst).forEach(function (pins) {
                        pins.forEach(function (p) { return allPins_1.add(p); });
                    });
                });
                var sortedPins = Array.from(allPins_1).sort();
                finalBoard.pin_options.digital = sortedPins.map(function (p) { return [p, p]; });
                // ADC 映射
                if (details.ADC) {
                    var adcSet_1 = new Set();
                    Object.values(details.ADC).forEach(function (inst) {
                        var _a;
                        (_a = inst.IN) === null || _a === void 0 ? void 0 : _a.forEach(function (p) { return adcSet_1.add(p); });
                    });
                    finalBoard.pin_options.analog = Array.from(adcSet_1).sort().map(function (p) { return [p, p]; });
                }
                // PWM (TIM) 映射
                if (details.TIM) {
                    var pwmSet_1 = new Set();
                    Object.values(details.TIM).forEach(function (inst) {
                        Object.values(inst).forEach(function (pins) {
                            pins.forEach(function (p) { return pwmSet_1.add(p); });
                        });
                    });
                    finalBoard.pin_options.pwm = Array.from(pwmSet_1).sort().map(function (p) { return [p, p]; });
                }
            }
            // 文件命名: 统一使用 MCU 名称作为文件名，去除不安全字符
            var safeName = mcuName.replace(/[^a-zA-Z0-9_-]/g, '_');
            var fileName = "".concat(safeName, ".json");
            var filePath = path.join(seriesDir, fileName);
            fs.writeFileSync(filePath, JSON.stringify(finalBoard, null, 2));
            seriesCount++;
            totalFiles++;
        });
        console.log("[".concat(series, "] \u5DF2\u751F\u6210 ").concat(seriesCount, " \u4E2A\u677F\u5361\u6587\u4EF6\u3002"));
    });
    // 最终清理环节：移除空目录 (如 Other)
    if (fs.existsSync(OUTPUT_DIR)) {
        var remainingDirs = fs.readdirSync(OUTPUT_DIR);
        remainingDirs.forEach(function (d) {
            var full = path.join(OUTPUT_DIR, d);
            if (fs.lstatSync(full).isDirectory()) {
                var files = fs.readdirSync(full);
                if (files.length === 0) {
                    fs.rmdirSync(full);
                    console.log("\u6E05\u7406\u7A7A\u7CFB\u5217\u76EE\u5F55: ".concat(d));
                }
            }
        });
    }
    console.log("\n\u5168\u90E8\u5B8C\u6210\uFF01\u5171\u5728 ".concat(OUTPUT_DIR, " \u4E2D\u751F\u6210\u4E86 ").concat(totalFiles, " \u4E2A\u72EC\u7ACB\u7684 STM32 \u6570\u636E\u6587\u4EF6\u3002"));
}
main();
