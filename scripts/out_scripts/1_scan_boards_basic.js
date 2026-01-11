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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
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
var child_process_1 = require("child_process");
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var util = __importStar(require("util"));
var execPromise = util.promisify(child_process_1.exec);
// 需要扫描的目标平台及其显示标签
var PLATFORMS = {
    'atmelavr': 'Arduino',
    'espressif32': 'ESP32',
    'ststm32': 'STM32',
    'microchippic32': 'PIC32'
};
// 输出文件配置
var OUTPUT_STM32 = path.join(__dirname, 'stm32_board_data.json');
var OUTPUT_STANDARD = path.join(__dirname, 'standard_board_data.json');
// 热门板卡白名单 (非 STM32)
// 只有在白名单中的板卡才会进入 standard_board_data.json
var ALLOW_LIST = new Set([
    // Arduino
    'uno', 'nanoatmega328', 'megaatmega2560', 'leonardo', 'pro16MHzatmega328',
    // ESP32
    'esp32dev', 'nodemcu-32s', 'wemos_d1_mini32', 'lolin32', 'esp32-s3-devkitc-1', 'esp32-c3-devkitm-1',
    // ESP32 相机板卡
    'esp32cam', 'seeed_xiao_esp32s3'
]);
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var stm32Data, standardData, _i, _a, _b, platform, label, stdout, boards, _c, boards_1, board, mcu, seriesMatch, series, groupName, e_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('正在开始全平台板卡扫描...');
                    stm32Data = {};
                    standardData = {};
                    _i = 0, _a = Object.entries(PLATFORMS);
                    _d.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    _b = _a[_i], platform = _b[0], label = _b[1];
                    console.log("\u6B63\u5728\u626B\u63CF ".concat(label, " \u5E73\u53F0 (").concat(platform, ")..."));
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, execPromise("pio boards ".concat(platform, " --json-output"))];
                case 3:
                    stdout = (_d.sent()).stdout;
                    boards = JSON.parse(stdout);
                    // 数据后处理
                    for (_c = 0, boards_1 = boards; _c < boards_1.length; _c++) {
                        board = boards_1[_c];
                        // 自动注入连接性信息
                        if (!board.connectivity) {
                            if (board.id.includes('esp')) {
                                board.connectivity = ['wifi'];
                                if (board.id.includes('32'))
                                    board.connectivity.push('bluetooth');
                            }
                            else {
                                // 基础 Arduino 假设，可根据需要进一步细化
                                board.connectivity = [];
                            }
                        }
                        // 根据平台进行分类处理
                        if (platform === 'ststm32') {
                            mcu = board.mcu || 'UNKNOWN';
                            seriesMatch = mcu.match(/STM32([FGHLW][0-47])\d+/);
                            series = seriesMatch ? "STM32".concat(seriesMatch[1]) : 'Other';
                            if (!stm32Data[series])
                                stm32Data[series] = [];
                            stm32Data[series].push({
                                id: board.id,
                                name: board.name,
                                platform: platform, // 新增：记录平台
                                mcu: board.mcu,
                                fcpu: board.fcpu, // 新增：主频
                                specs: "".concat((board.rom / 1024) || '?', "k Flash / ").concat((board.ram / 1024) || '?', "k RAM"),
                                capabilities: board.connectivity || []
                            });
                        }
                        else {
                            // 标准板卡: 根据白名单过滤
                            if (ALLOW_LIST.has(board.id)) {
                                groupName = label;
                                if (!standardData[groupName])
                                    standardData[groupName] = [];
                                standardData[groupName].push({
                                    id: board.id,
                                    name: board.name,
                                    platform: platform, // 新增：记录平台
                                    mcu: board.mcu,
                                    fcpu: board.fcpu, // 新增：主频
                                    specs: "".concat((board.rom / 1024) || '?', "k Flash / ").concat((board.ram / 1024) || '?', "k RAM"),
                                    capabilities: board.connectivity || []
                                });
                            }
                        }
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _d.sent();
                    console.error("\u626B\u63CF ".concat(platform, " \u65F6\u51FA\u9519:"), e_1);
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    // 保存输出文件
                    fs.writeFileSync(OUTPUT_STM32, JSON.stringify({ STM32: stm32Data }, null, 2));
                    fs.writeFileSync(OUTPUT_STANDARD, JSON.stringify(standardData, null, 2));
                    console.log("\n====== \u626B\u63CF\u5B8C\u6210 ======");
                    console.log("STM32 \u6570\u636E\u5DF2\u4FDD\u5B58\u81F3: ".concat(OUTPUT_STM32));
                    console.log("\u6807\u51C6\u677F\u5361\u6570\u636E\u5DF2\u4FDD\u5B58\u81F3: ".concat(OUTPUT_STANDARD));
                    return [2 /*return*/];
            }
        });
    });
}
main();
