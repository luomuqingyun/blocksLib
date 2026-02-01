/**
 * 5_fetch_official_layouts.ts
 * 
 * 功能: 从 embassy-rs/stm32-data-generated 仓库抓取官方 STM32 引脚布局数据。
 * 作用: 获取精确的物理引脚位置映射 (如 "PA1" -> "34")，用于前端 ChipRenderer 生成 100% 准确的芯片图。
 * 流程:
 *   1. 从 stm32_board_data.json 识别所有唯一 MCU。
 *   2. 检查本地缓存 stm32_layouts_cache.json。
 *   3. 对缺失的 MCU，通过 GitHub API 尝试多种可能的路径抓取 JSON。
 *   4. 解析并保存引脚映射数据到本地缓存。
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { EMBASSY_STM32_DATA_PATH } from './data_sources';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, 'out_scripts');
const CACHE_FILE = path.join(CACHE_DIR, 'stm32_layouts_cache.json');
const BOARD_DATA_FILE = path.join(__dirname, 'stm32_board_data.json');

interface PinMapping {
    name: string;
    position: string;
}

interface LayoutData {
    mcu: string;
    package: string;
    pins: PinMapping[];
}

/**
 * 通用的 JSON 抓取函数
 * @param url 目标 URL
 * @returns 解析后的 JSON 对象
 */
async function fetchJson(url: string, retries = 3): Promise<any> {
    for (let i = 0; i <= retries; i++) {
        try {
            return await new Promise((resolve, reject) => {
                https.get(url, {
                    timeout: 10000, // 10秒超时
                    headers: { 'User-Agent': 'EmbedBlocks-Studio-Fetcher' }
                }, (res) => {
                    if (res.statusCode !== 200) {
                        if (res.statusCode === 404) {
                            reject(new Error(`404`));
                        } else {
                            reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
                        }
                        return;
                    }
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error('Invalid JSON'));
                        }
                    });
                }).on('error', reject);
            });
        } catch (err: any) {
            if (err.message === '404') throw err; // 404 不重试
            if (i === retries) throw err;
            console.log(`  正在重试 ${url} (${i + 1}/${retries})...`);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

/**
 * 生成可能的 MCU 基础名称
 * STM32 数据仓库中的文件名通常不包含最终的封装/速度等级后缀
 * 例如: STM32F401RCT6 可能对应 STM32F401RC.json
 * @param mcu 原始 MCU 型号
 */
function getPotentialBaseNames(mcu: string): string[] {
    const base = mcu.toUpperCase();
    const names = [base];

    // 启发式尝试: 针对 STM32 的命名规则逐渐去掉后缀 (如 T6, RGT, RGT6)
    // 例如: STM32F415RGT (12) -> STM32F415RG (11), STM32F415R (10)
    if (base.length > 10) {
        names.push(base.substring(0, base.length - 1));
        names.push(base.substring(0, base.length - 2));
    }
    if (base.length > 12) {
        names.push(base.substring(0, base.length - 3));
    }

    return Array.from(new Set(names));
}

// [Local Data Optimization]
// 指向本地克隆的 embassy-rs/stm32-data-generated 仓库中的 chips 目录
// 这样可以实现秒级全量处理，无视 GitHub API 速率限制
const LOCAL_REPO_PATH = path.join(EMBASSY_STM32_DATA_PATH, 'data/chips');

/**
 * 尝试从远程仓库或本地路径获取特定 MCU 的数据
 */
async function fetchMcuData(mcu: string): Promise<any> {
    const names = getPotentialBaseNames(mcu);

    // 1. 优先尝试本地数据源 (User Request: Use local clone)
    if (fs.existsSync(LOCAL_REPO_PATH)) {
        for (const name of names) {
            const localFile = path.join(LOCAL_REPO_PATH, `${name}.json`);
            if (fs.existsSync(localFile)) {
                // console.log(`  [Local] Found ${name}.json`);
                return JSON.parse(fs.readFileSync(localFile, 'utf-8'));
            }
        }
    }

    // 2. 回退到 GitHub 远程抓取 (仅当本地仓库配置不存在时才使用，避免海量 404 导致的延迟)
    if (!fs.existsSync(LOCAL_REPO_PATH)) {
        for (const name of names) {
            // 使用 embassy-rs 官方生成的原始数据 (这是目前社区最准确的 STM32 芯片数据库)
            const url = `https://raw.githubusercontent.com/embassy-rs/stm32-data-generated/main/data/chips/${name}.json`;
            try {
                return await fetchJson(url);
            } catch (err: any) {
                if (err.message === '404') continue;
                console.warn(`    远程获取 ${name} 失败: ${err.message}`);
                throw err;
            }
        }
    }
    throw new Error('All potential names returned 404 (Local & Remote)');
}

/**
 * 脚本主逻辑
 */
async function main() {
    // 检查基础数据文件是否存在
    if (!fs.existsSync(BOARD_DATA_FILE)) {
        console.error('错误: 找不到板卡基本数据文件。请先运行 1_scan_boards_basic.ts 或 1b_discover_bare_chips.ts。');
        process.exit(1);
    }

    // 1. 解析所有 MCU 型号
    const boardData = JSON.parse(fs.readFileSync(BOARD_DATA_FILE, 'utf-8'));
    const mcus = new Set<string>();

    Object.values(boardData.STM32).forEach((series: any) => {
        series.forEach((board: any) => {
            if (board.mcu) mcus.add(board.mcu.toUpperCase());
        });
    });

    console.log(`共发现 ${mcus.size} 个唯一的 MCU 型号。正在检查缓存...`);

    // 2. 加载或初始化本地缓存
    let cache: Record<string, LayoutData> = {};
    if (fs.existsSync(CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }

    // 识别尚未抓取的数据
    const missingMcus = Array.from(mcus).filter(mcu => !cache[mcu]);
    console.log(`共有 ${missingMcus.length} 个 MCU 的布局数据需要抓取。`);

    // 3. 开始遍历抓取 (增加并发限制和总量限制进行初步测试)
    let fetchCount = 0;
    const FETCH_LIMIT = 6000; // 这里的限制是为了防止单次执行过久，建议分批运行或在确认稳定后调大

    for (const mcu of missingMcus) {
        if (fetchCount >= FETCH_LIMIT) {
            console.log(`已达到本次运行的抓取上限 (${FETCH_LIMIT})，请再次运行脚本继续抓取。`);
            break;
        }
        try {
            console.log(`正在抓取 ${mcu}... (${fetchCount + 1}/${FETCH_LIMIT})`);
            const data = await fetchMcuData(mcu);

            // 处理该芯片支持的所有封装
            data.packages.forEach((pkg: any) => {
                const pkgName = pkg.package.toUpperCase();
                const key = `${mcu}_${pkgName}`;

                cache[key] = {
                    mcu: mcu,
                    package: pkgName,
                    pins: pkg.pins.map((p: any) => ({
                        name: p.signals[0] || 'NC', // 没有信号则记为 NC (无连接)
                        position: p.position
                    }))
                };
            });

            // 存入一个通用的 MCU 键值，作为回退方案
            if (!cache[mcu] && data.packages.length > 0) {
                const firstPkg = data.packages[0];
                cache[mcu] = {
                    mcu: mcu,
                    package: firstPkg.package.toUpperCase(),
                    pins: firstPkg.pins.map((p: any) => ({
                        name: p.signals[0] || 'NC',
                        position: p.position
                    }))
                };
            }

            // 每次抓取成功都保存一次，确保断电/中断不丢失进度
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
            fetchCount++;
            // 只有远程请求才需要延迟，避免 API 限制；本地请求无需延迟
            if (!LOCAL_REPO_PATH || !fs.existsSync(LOCAL_REPO_PATH)) {
                await new Promise(r => setTimeout(r, 100));
            }
        } catch (err: any) {
            console.warn(`抓取并处理 ${mcu} 时失败: ${err.message}`);
            // 失败也算一次尝试，计入计数器
            fetchCount++;
        }
    }

    console.log('全部任务已完成。');
}

// 执行主程序
main().catch(console.error);
