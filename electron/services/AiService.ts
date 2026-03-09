import { app, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exec, execFile, execSync } from 'child_process';
import { promisify } from 'util';
import { configService } from './ConfigService';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const OPENCLAW_CONFIG_PATH = path.join(app.getPath('home'), '.openclaw', 'openclaw.json');

/**
 * 积木 Schema 数据（构建时由 extract_block_schema.js 生成）
 * 包含所有 474+ 积木的类型、字段、输入和分类信息
 */
let BLOCK_SCHEMA: any = null;
try {
    const schemaPath = path.join(app.getAppPath(), 'src', 'data', 'ai_block_schema.json');
    if (fs.existsSync(schemaPath)) {
        BLOCK_SCHEMA = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        console.log(`[AiService] 积木 Schema 已加载: ${BLOCK_SCHEMA._meta.total} 个积木`);
    }
} catch (e) {
    console.warn('[AiService] 积木 Schema 加载失败，将使用静态提示词:', e);
}

/**
 * 核心积木分类（始终注入到提示词中的基础积木）
 */
const CORE_CATEGORIES = new Set([
    '基础IO', '基础逻辑', 'Arduino核心', '变量', '串口通信', '时间'
]);

/**
 * 关键词 → 积木分类映射表
 * 根据用户指令中的关键词动态加载对应分类的积木
 */
const KEYWORD_CATEGORY_MAP: Record<string, string[]> = {
    // 硬件外设
    '舵机|servo|角度': ['舵机'],
    'LED灯带|彩灯|neopixel|ws2812|灯珠': ['LED灯带'],
    '电机|马达|motor|步进': ['电机'],
    '显示|屏幕|oled|lcd|tft|matrix|点阵': ['显示屏'],
    '传感器|温度|湿度|dht|超声波|距离|bmp|bme': ['传感器'],
    '存储|sd卡|eeprom|flash|文件': ['存储', '参数存储'],
    'rfid|射频|nfc': ['RFID'],
    '摄像头|camera|拍照': ['摄像头'],
    '音频|蜂鸣器|音乐|mp3|播放': ['音频', 'MP3'],
    '语音|tts|say': ['语音'],
    '触摸|touch': ['触摸'],
    '红外|ir|遥控': ['红外'],
    'rtc|时钟|日期': ['实时时钟'],
    'dac|模拟输出': ['DAC'],
    '输入|按钮|按键|旋钮|编码器': ['输入设备'],
    // 通信协议
    '串口|serial|uart': ['串口通信'],
    'i2c|iic': ['I2C'],
    'spi': ['SPI'],
    'mqtt|消息队列': ['MQTT'],
    'wifi|网络|连接|ip|http': ['WiFi网络', 'HTTP', 'Web服务'],
    '蓝牙|bluetooth|ble': ['蓝牙', 'BLE'],
    'lora|lorawan': ['LoRa'],
    '无线电|radio|nrf': ['无线电', 'NRF24'],
    'websocket|ws': ['WebSocket'],
    'esp.now': ['ESP-NOW'],
    'usb|hid|键盘|鼠标': ['USB HID'],
    'telegram|机器人': ['Telegram', '机器人'],
    // 平台
    'esp32|esp8266': ['ESP32专用'],
    'stm32': ['STM32专用'],
    // 高级功能
    '加密|hash|aes': ['加密'],
    'rtos|多任务|线程': ['RTOS'],
    'ota|升级|固件': ['OTA升级'],
    '游戏': ['游戏'],
    '自动化|定时': ['自动化', '定时器'],
};

/**
 * [AI 核心强化] EmbedBlocks Studio 专用系统提示词 (System Prompt)
 * 该提示词强制要求 AI 以特定的 JSON 结构返回响应，并提供了常用的积木定义 Schema。
 */
const BLOCKLY_SYSTEM_PROMPT = `
你是 EmbedBlocks Studio 的硬件积木编排执行器。你的唯一任务是根据用户指令生成 Blockly 积木 JSON。

## 绝对规则
1. 你的回复必须是且仅是一个合法的 JSON 对象，不要在 JSON 前后添加任何文字、Markdown 标记或代码围栏。
2. JSON 结构:
   { "content": "一句话硬件提示（可选）", "blocks": { Blockly JSON } }
3. 如果用户问的是纯知识性问题（如"什么是 I2C"），则只返回 { "content": "回答内容" }，不含 blocks。
4. 禁止任何社交辞令、自我介绍、欢迎语。直接输出 JSON。

## Blockly JSON 协议
根节点必须是 "arduino_entry_root"，它有两个 Statement 输入槽：
- "SETUP_STACK": 放置初始化积木（大部分外设在需要时系统底层会自动初始化 pinMode，除非特殊情况一般为空）
- "LOOP_STACK": 放置循环执行的积木（如 digitalWrite + delay）

积木之间通过 "next" 字段链接（形成垂直堆叠）。

## 完整输出示例（LED 闪烁 PA3 每 1000ms）
{"content":"已为您生成 LED 翻转逻辑。","blocks":{"blocks":{"languageVersion":0,"blocks":[{"type":"arduino_entry_root","id":"root_1","x":50,"y":50,"inputs":{"LOOP_STACK":{"block":{"type":"arduino_digital_toggle","id":"t_1","fields":{"PIN":"PA3"},"next":{"block":{"type":"arduino_delay_ms","id":"d_1","inputs":{"DELAY":{"shadow":{"type":"math_number","id":"n_1","fields":{"NUM":1000}}}}}}}}}}}]}}}

## 关键积木参考
- 延时: type="arduino_delay_ms", input="DELAY"
- 数字写: type="arduino_digital_write", fields={"PIN": "...", "STATE": "HIGH/LOW"}
- 数字翻转: type="arduino_digital_toggle", fields={"PIN": "..."}
- 主入口: type="arduino_entry_root", inputs={"SETUP_STACK": ..., "LOOP_STACK": ...}

## 上下文感知
优先使用用户当前所选的板卡和代码作为参考。如果用户没有指定引脚，根据板卡常见习惯给出（STM32 用 PA 引脚，Arduino 用数字引脚号）。
`;

/**
 * AI 服务 (AiService): 核心逻辑类，负责管理与 OpenClaw AI 引擎的集成。
 * 
 * 主要职责:
 * 1. 同步应用设置中的 AI 配置到 OpenClaw 的本地配置文件。
 * 2. 自动检测并优先使用软件内置的 OpenClaw 二进制文件。
 * 3. 处理前端发起的 AI 对话请求，并将其透传给 OpenClaw CLI。
 * 4. 提供环境自检功能，确保 API Key 和执行环境已就绪。
 */
export class AiService {
    private static instance: AiService;
    private isOpenClawAvailable: boolean = false;
    private openClawPath: string = 'openclaw'; // 默认使用系统全局变量
    private sessionMap: Map<string, string> = new Map(); // 文件路径 -> Session ID 映射

    private constructor() {
        // 初始化时自动进行环境检查，添加 catch 防止未捕获的 Promise 异常导致程序崩溃
        this.checkEnvironment().catch(err => {
            console.warn('[AiService] Initial environment check failed:', err?.message || err);
        });
    }

    /**
     * 将 UI 用户设置中的配置同步到 OpenClaw 的标准配置文件 (~/.openclaw/openclaw.json)
     * 此过程确保软件界面修改后，底层的 OpenClaw 引擎能立即感知。
     * 
     * @param aiConfig 来自 ConfigService 的 AI 配置对象 (包含 apiKey, provider, model 等)
     */
    public async syncConfig(aiConfig: any) {
        if (!aiConfig) return;

        try {
            let config: any = {};
            // 如果文件已存在，先读取现有配置以进行合并，防止覆盖用户手动修改的其他项
            if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
                config = JSON.parse(await fs.promises.readFile(OPENCLAW_CONFIG_PATH, 'utf8'));
            }

            /**
             * 适配 OpenClaw 2026.3.2 官方推荐的架构:
             * 1. 环境变量 (env): 用于存储敏感的 API Key，避免在模型定义中明文出现。
             * 2. 代理默认设置 (agents.defaults): 定义系统默认使用的模型路径。
             */

            const provider = aiConfig.provider || 'deepseek';
            const modelId = aiConfig.model || (provider === 'deepseek' ? 'deepseek-chat' : 'gemini-1.5-pro');

            // 构造环境变量名，例如 "deepseek" 映射为 "DEEPSEEK_API_KEY"
            const envKey = `${provider.toUpperCase()}_API_KEY`;

            config.env = config.env || {};
            config.env[envKey] = aiConfig.apiKey; // 注意：此处的 apiKey 是已经解密后的明文

            // 针对自定义代理地址 (Base URL) 的处理
            if (aiConfig.baseUrl) {
                config.models = config.models || {};
                config.models.providers = config.models.providers || {};
                // 将用户配置的提供商注册为 OpenAI 兼容接口
                config.models.providers[provider] = {
                    api: "openai-completions",
                    baseUrl: aiConfig.baseUrl,
                    apiKey: aiConfig.apiKey,
                    models: [
                        { id: modelId, name: modelId.toUpperCase() }
                    ]
                };
            }

            // 设置 OpenClaw 默认模型路径，格式为 "provider/modelId"
            config.agents = config.agents || {};
            config.agents.defaults = config.agents.defaults || {};
            config.agents.defaults.model = { primary: `${provider}/${modelId}` };

            // 确保本地配置目录 (.openclaw) 存在
            const dir = path.dirname(OPENCLAW_CONFIG_PATH);
            if (!fs.existsSync(dir)) await fs.promises.mkdir(dir, { recursive: true });

            // 写入配置文件
            await fs.promises.writeFile(OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2));

            /**
             * 关键补丁：
             * OpenClaw 2026.3.2 运行 `agent --agent main` 时需要物理存在相应的 agent 目录。
             * 如果缺失，会导致路由失败。此处强制创建一个默认的 main agent 目录。
             * 我们不再写入 agent.md，而是选择直接在 ask() 方法中注入系统强化提示词。
             */
            const agentDir = path.join(dir, 'agents', 'main', 'agent');
            if (!fs.existsSync(agentDir)) {
                await fs.promises.mkdir(agentDir, { recursive: true });
            }

            console.log(`[AiService] OpenClaw 2026.3.2 配置已同步: ${OPENCLAW_CONFIG_PATH}`);
        } catch (e) {
            console.error('[AiService] 同步 OpenClaw 配置失败:', e);
        }
    }

    /** 手动清理指定项目的会话，重置 AI 记忆 */
    public clearSession(filePath: string) {
        if (filePath && this.sessionMap.has(filePath)) {
            console.log(`[AiService] 手动清理项目会话历史: ${filePath}`);
            this.sessionMap.delete(filePath);
        }
    }

    /** 获取单例实例 */
    public static getInstance(): AiService {
        if (!AiService.instance) {
            AiService.instance = new AiService();
        }
        return AiService.instance;
    }

    /**
     * 获取 OpenClaw 可执行文件的绝对路径。
     * 检测顺序:
     * 1. 用户在设定面板里显式填入的自定义绝对路径 (最高优先级)。
     * 2. 系统环境变量中的 'openclaw' 全局命令 (兜底方案)。
     */
    private getOpenClawPath(): string {
        // 1. 读取用户界面设置里的自定义路径
        const customPath = configService.get('ai.customPath');
        if (customPath && typeof customPath === 'string' && customPath.trim() !== '') {
            if (fs.existsSync(customPath)) {
                console.log(`[AiService] 检测到用户指定的自定义 OpenClaw 路径: ${customPath}`);
                return customPath;
            } else {
                console.warn(`[AiService] 警告: 用户配置的自定义路径不存在 (${customPath}), 自动降级至系统环境`);
            }
        }

        // 2. 回退至系统全局命令
        return 'openclaw';
    }

    private async resolveExecutable(command: string): Promise<string> {
        if (path.isAbsolute(command)) {
            return command;
        }
        try {
            if (process.platform === 'win32') {
                const { stdout } = await execAsync(`where ${command}`);
                const paths = stdout.trim().split('\n').map(p => p.trim());
                // 在 Windows 上优先使用 .cmd 后缀的文件，以便后续解析底层 JS
                const cmdPath = paths.find(p => p.toLowerCase().endsWith('.cmd'));
                return cmdPath || paths[0];
            } else {
                const { stdout } = await execAsync(`which ${command}`);
                return stdout.split('\n')[0].trim();
            }
        } catch (e) {
            console.error(`[AiService] Error resolving ${command}:`, e);
            return command;
        }
    }

    /**
     * 针对 Windows 环境下 cmd.exe 本身拒绝处理含有换行符的多语言参数的致命缺陷：
     * 分析 npm 生成的 .cmd 文件底层，抽离出对应的 JS 脚本并直接交由 Node 原生进程执行，
     * 以达成完全绕过 cmd.exe 和底层环境变量缺陷的目的。
     */
    private async getTrueExecutableAndArgs(cliPath: string, args: string[]): Promise<{ cmd: string, args: string[] }> {
        let resolvedPath = await this.resolveExecutable(cliPath);

        if (process.platform === 'win32' && resolvedPath.toLowerCase().endsWith('.cmd')) {
            try {
                if (fs.existsSync(resolvedPath)) {
                    const content = await fs.promises.readFile(resolvedPath, 'utf8');
                    const lines = content.split('\n');
                    for (let i = lines.length - 1; i >= 0; i--) {
                        const line = lines[i];
                        // 匹配 "%dp0%\node_modules\openclaw\bin\openclaw.mjs" 此类内容
                        const match = line.match(/"[^"]*?\\node_modules\\[^"]+\.(?:js|mjs|cjs)"/i);
                        if (match) {
                            let p = match[0].replace(/"/g, '');
                            p = p.replace(/%~dp0|%dp0%/gi, path.dirname(resolvedPath) + path.sep);

                            // 必须使用 'node' 而不是 process.execPath，因为由于这是 Electron 主进程，process.execPath 指向 electron.exe !
                            return { cmd: 'node', args: [p, ...args] };
                        }
                    }
                }
            } catch (e) {
                console.warn('[AiService] 底层 .cmd 重定向解析失败，降级执行:', e);
            }
        }
        return { cmd: resolvedPath, args };
    }

    /**
     * 检查 OpenClaw 环境是否可用。
     * 通过运行 `--version` 命令来确认可执行文件是否能正常响应。
     */
    public async checkEnvironment(): Promise<boolean> {
        const resolvedPath = this.getOpenClawPath();
        this.openClawPath = resolvedPath;

        try {
            const exeSpecs = await this.getTrueExecutableAndArgs(resolvedPath, ['--version']);
            await execFileAsync(exeSpecs.cmd, exeSpecs.args);
            this.isOpenClawAvailable = true;
            console.log(`[AiService] 环境检查通过，使用路径: ${resolvedPath}`);
            return true;
        } catch (err) {
            this.isOpenClawAvailable = false;
            return false;
        }
    }

    /**
     * AI 对话核心方法（主入口）
     * 
     * @param prompt 用户通过侧边栏输入的原始文本
     * @param context (可选) 额外的上下文信息，如当前项目代码、板卡型号等
     * @returns 包含 AI 生成内容或错误信息的对象
     */
    public async ask(prompt: string, context?: any): Promise<any> {
        console.log('[AiService] 收到 AI 指令:', prompt);

        const isReady = await this.checkEnvironment();

        if (isReady) {
            try {
                let enhancedPrompt = prompt;

                // 如果附加了项目上下文信息，则组合为强化提示词
                if (context && (context.board || context.code)) {
                    let contextStr = "【当前项目运行环境】\n";
                    if (context.board) {
                        contextStr += `- 目标开发板架构/型号: ${context.board}\n`;
                    }
                    if (context.code && context.code.trim()) {
                        contextStr += `- 现有的（由 Blockly 积木生成的）C++ 代码:\n\`\`\`cpp\n${context.code}\n\`\`\`\n\n`;
                    }
                    contextStr += "【用户的请求指令】\n";
                    enhancedPrompt = `${contextStr}${prompt}`;
                    console.log('[AiService] 已拼接项目上下文强化提示词。');
                }

                // 注入系统级指令 (Hidden System Instruction)带上动态计算的积木 Schema
                const dynamicSchemaStr = this.buildDynamicBlocksPrompt(prompt, context);
                enhancedPrompt = `${BLOCKLY_SYSTEM_PROMPT}\n\n${dynamicSchemaStr}\n\n【用户当前真实指令】\n${enhancedPrompt}`;

                /**
                 * 执行 OpenClaw 代理任务:
                 * --agent main: 指定使用主代理，确保其加载正确的配置和技能。
                 * --session-id: 按项目路径锁定会话 ID。同一项目内保留聊天记忆，切换项目则自动隔离。
                 * --message: 传递强化后的用户的指令。
                 */
                let sessionId = `eb_temp_${Date.now()}`;
                if (context && context.filePath) {
                    const fp = context.filePath;
                    if (!this.sessionMap.has(fp)) {
                        this.sessionMap.set(fp, `eb_proj_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
                    }
                    sessionId = this.sessionMap.get(fp)!;
                }

                const exeSpecs = await this.getTrueExecutableAndArgs(this.openClawPath, ['agent', '--agent', 'main', '--session-id', sessionId, '--message', enhancedPrompt]);
                const { stdout } = await execFileAsync(exeSpecs.cmd, exeSpecs.args, { maxBuffer: 10 * 1024 * 1024 });

                // [DEBUG] 输出原始响应以排查格式问题
                console.log('[AiService] OpenClaw 原始输出:', stdout.substring(0, 500) + (stdout.length > 500 ? '...' : ''));

                // 解析回复 (Robust JSON Extraction)
                const result = this.extractJsonObject(stdout);
                if (result) {
                    console.log('[AiService] 已成功解析结构化 AI 响应');
                    const normalizedBlocks = this.normalizeBlocksResponse(result.blocks);
                    console.log('[AiService] 发送给前端的 Blocks JSON:', JSON.stringify(normalizedBlocks, null, 2));
                    return {
                        content: result.content || result.message || result.response || "AI 响应处理完成。",
                        blocks: normalizedBlocks
                    };
                }

                // 兜底：如果无法提取 JSON，则作为纯文本处理
                console.warn('[AiService] 无法从 AI 响应中提取结构化 JSON，退回纯文本模式');
                return { content: this.cleanRawText(stdout) };
            } catch (e: any) {
                const errorStr = (e.stdout || '') + (e.stderr || '') + (e.message || '');
                console.error('[AiService] OpenClaw 运行异常:', errorStr);

                // 针对 API Key 缺失或无效的特别指引
                if (errorStr.toLowerCase().includes('config') || errorStr.toLowerCase().includes('api key')) {
                    return {
                        content: `### 🔑 需要配置 AI 授权\n\nOpenClaw 检测到您的 API Key 尚未设置或已失效。请点击下方按钮运行设置程序：\n\n\`\`\`bash\nopenclaw setup\n\`\`\`\n您也可以直接在软件设置中手动填写。`,
                        isUnconfigured: true
                    };
                }

                return {
                    content: `抱歉，执行 OpenClaw 时出错。这通常是由于网络连接超时或 API Key 余额不足导致的。\n\n详情: ${e.message}`,
                    error: true
                };
            }
        }

        /**
         * 兜底逻辑:
         * 如果检测到没有 OpenClaw 环境，则进入引导/模拟模式。
         */
        return this.simulateResponse(prompt, context);
    }

    /**
     * 根据用户指令和当前板卡，动态挑选相关联的积木 Schema 子集。
     * 解决将 474+ 个积木全量注入导致 Token 超限的问题。
     */
    private buildDynamicBlocksPrompt(prompt: string, context?: any): string {
        if (!BLOCK_SCHEMA || !BLOCK_SCHEMA.blocks) return '';

        const activeCategories = new Set<string>(CORE_CATEGORIES);
        const lowerPrompt = prompt.toLowerCase();

        // 1. 根据关键词匹配附加分类
        for (const [pattern, categories] of Object.entries(KEYWORD_CATEGORY_MAP)) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(lowerPrompt)) {
                categories.forEach(c => activeCategories.add(c));
            }
        }

        // 2. 根据上下文（板卡）匹配特殊分类
        if (context && context.board) {
            const boardName = context.board.toLowerCase();
            if (boardName.includes('esp32') || boardName.includes('esp8266')) {
                activeCategories.add('ESP32专用');
            } else if (boardName.includes('stm32')) {
                activeCategories.add('STM32专用');
            }
        }

        // 3. 过滤出命中的积木
        const selectedBlocks = BLOCK_SCHEMA.blocks.filter((b: any) => activeCategories.has(b.category));
        const categoriesArray = Array.from(activeCategories).join(', ');

        console.log(`[AiService] 动态提示词: 命中了 ${activeCategories.size} 个分类 (${categoriesArray}), 共 ${selectedBlocks.length} 个积木`);

        // 4. 构建精简的 Markdown 表格
        let md = `## 可用积木动态速查表(共 ${selectedBlocks.length} 个)\n`;
        md += `本表仅包含与你当前任务相关的积木（动态提取）。你可以按需组合。\n\n`;
        md += `| 积木 type (重要) | 积木说明 | fields (表单字段) | inputs (连接槽) |\n`;
        md += `|------------------|----------|-------------------|-----------------|\n`;

        for (const b of selectedBlocks) {
            // 压缩 fields 和 inputs 显示
            const fieldsVal = b.fields ? Object.keys(b.fields).join(', ') : '-';
            const inputsVal = b.inputs ? Object.keys(b.inputs).map(k => `${k}(${b.inputs[k]})`).join(', ') : '-';
            const desc = b.description ? b.description.split('\n')[0].replace(/\|/g, '/') : (b.category || '-');

            md += `| \`${b.type}\` | ${desc} | ${fieldsVal} | ${inputsVal} |\n`;
        }

        return md;
    }

    /**
     * 从复杂的 AI 输出文本中强行提取出第一个合法的 JSON 对象。
     * 使用括号计数法精准匹配嵌套的 {} 结构，解决正则无法处理深层 Blockly JSON 的问题。
     */
    private extractJsonObject(text: string): any {
        if (!text) return null;
        const trimmed = text.trim();

        // 路径 1: 尝试完整解析
        try {
            return JSON.parse(trimmed);
        } catch (e) { /* 继续尝试 */ }

        // 路径 2: 尝试匹配被 ```json ... ``` 包裹的内容
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/s);
        if (codeBlockMatch) {
            try { return JSON.parse(codeBlockMatch[1].trim()); } catch (e2) { }
        }

        // 路径 3: 使用括号计数法提取第一个完整的 JSON 对象
        const extracted = this.extractBalancedJson(text);
        if (extracted) {
            try { return JSON.parse(extracted); } catch (e3) { }
        }

        return null;
    }

    /**
     * 括号计数法：从文本中提取第一个完整匹配的 {} JSON 对象。
     * 正确处理字符串内的转义括号和深度嵌套结构。
     */
    private extractBalancedJson(text: string): string | null {
        let start = text.indexOf('{');
        if (start === -1) return null;

        let depth = 0;
        let inString = false;
        let escape = false;

        for (let i = start; i < text.length; i++) {
            const ch = text[i];

            if (escape) {
                escape = false;
                continue;
            }

            if (ch === '\\') {
                escape = true;
                continue;
            }

            if (ch === '"') {
                inString = !inString;
                continue;
            }

            if (inString) continue;

            if (ch === '{') depth++;
            if (ch === '}') {
                depth--;
                if (depth === 0) {
                    return text.substring(start, i + 1);
                }
            }
        }
        return null;
    }

    /**
     * 规范化 AI 返回的 blocks 数据，确保符合 Blockly 序列化格式。
     * 处理常见的 AI 输出偏差：缺少外层包裹、数组格式、缺少 languageVersion 等。
     */
    private normalizeBlocksResponse(blocks: any): any {
        if (!blocks) return null;

        try {
            // 情况 1: blocks 已经是完整的 { blocks: { languageVersion, blocks: [...] } } 格式
            if (blocks.blocks && blocks.blocks.blocks && Array.isArray(blocks.blocks.blocks)) {
                return blocks;
            }

            // 情况 2: blocks 是 { languageVersion, blocks: [...] } 格式（缺少外层 blocks 包裹）
            if (blocks.languageVersion !== undefined && Array.isArray(blocks.blocks)) {
                return { blocks };
            }

            // 情况 3: blocks 是积木数组 [...]
            if (Array.isArray(blocks)) {
                return { blocks: { languageVersion: 0, blocks } };
            }

            // 情况 4: blocks 是单个积木对象 { type: "...", ... }
            if (blocks.type) {
                return { blocks: { languageVersion: 0, blocks: [blocks] } };
            }

            // 其他情况原样返回
            return blocks;
        } catch (e) {
            console.warn('[AiService] blocks 规范化失败:', e);
            return blocks;
        }
    }

    /**
     * 清理纯文本 AI 回复，移除 OpenClaw CLI 的元信息干扰。
     */
    private cleanRawText(text: string): string {
        if (!text) return 'AI 响应为空。';
        // 移除 ANSI 转义码和 OpenClaw 进度指示器
        return text.replace(/\x1b\[[0-9;]*m/g, '').replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g, '').trim();
    }

    /**
     * 模拟响应与错误引导逻辑
     * 仅在 OpenClaw 环境缺失或作为演示时调用。
     */
    private simulateResponse(prompt: string, context: any): any {
        const lower = prompt.toLowerCase();

        // 核心引导：告诉用户如何安装 OpenClaw
        if (!this.isOpenClawAvailable) {
            return {
                content: `### 🚀 尚未检测到 OpenClaw 环境\n\n要在软件中调用强大的 AI 辅助功能，您需要先完成以下环境配置工作：\n\n1. 请确保您的电脑已经安装了 [Node.js](https://nodejs.org/)。\n2. **安装 OpenClaw CLI**: \n   \`\`\`bash\n   npm install -g openclaw\n   \`\`\`\n3. **验证环境**: \n   在系统终端输入 \`openclaw --version\` 确认可用后，**重启本软件**即可开箱即用。\n\n**提示**: OpenClaw 是一个高功率的 AI 代理框架，EmbedBlocks 需要依赖它在本地为您执行代码生成和积木编排任务。`,
                isInstruction: true
            };
        }

        // 简单的关键词匹配，用于快速演示 Demo
        if (lower.includes('闪烁') || lower.includes('blink')) {
            return {
                content: '好的，我已经为您生成了 LED 闪烁逻辑（Pin 13）。相应的积木组件已准备就绪。',
                blocks: {
                    "languageVersion": 0,
                    "blocks": [
                        {
                            "type": "arduino_entry_root",
                            "id": "root",
                            "x": 50,
                            "y": 50,
                            "inputs": {
                                "LOOP_STACK": {
                                    "block": {
                                        "type": "arduino_digital_toggle",
                                        "id": "toggle",
                                        "fields": { "PIN": "13" },
                                        "next": {
                                            "block": {
                                                "type": "arduino_delay_ms",
                                                "id": "delay_1s",
                                                "inputs": {
                                                    "DELAY": {
                                                        "shadow": {
                                                            "type": "math_number",
                                                            "id": "val_1s",
                                                            "fields": { "NUM": 1000 }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }
            };
        }

        return {
            content: `收到您的指令: "${prompt}"。由于 OpenClaw 当前处于离线状态，我只能进行简单的文本记录。请检查设置以恢复 AI 的完整编排能力。`
        };
    }
}

export const aiService = AiService.getInstance();
