/**
 * ============================================================
 * 沙箱入口脚本 (Sandbox Entry)
 * ============================================================
 *
 * 运行在隔离的 iframe 中，负责执行不受信任的扩展代码和生成代码。
 * 包含：
 * 1. Headless Blockly 实例初始化
 * 2. Arduino 生成器配置
 * 3. 消息通信处理 (加载脚本、定义积木、生成代码)
 */
import * as Blockly from 'blockly';
import { arduinoGenerator } from '../generators/arduino-base';
import * as En from 'blockly/msg/en';
import * as Zh from 'blockly/msg/zh-hans';

const isZh = navigator.language && navigator.language.toLowerCase().startsWith('zh');
if (isZh) {
    Blockly.setLocale(Zh as any);
} else {
    Blockly.setLocale(En as any);
}

// 模拟全局 Blockly 对象供扩展使用
// 我们创建一个可变对象，继承自不可变的模块命名空间
// 这允许扩展添加像 Blockly.Arduino 这样的属性
const MockBlockly: any = { ...Blockly };
(window as any).Blockly = MockBlockly;

// 暴露 Arduino 生成器，以便扩展注册定义
(window as any).Blockly.Arduino = arduinoGenerator;

console.log('[Sandbox] Initialized');

window.addEventListener('message', async (event) => {
    const data = event.data;
    if (!data) return;

    try {
        if (data.type === 'load-script') {
            console.log(`[Sandbox] Loading script for ${data.id}`);
            // 安全性说明：我们处于沙箱 iframe 内部。
            // 使用 Function 构造函数在（iframe 的）全局作用域中运行代码。
            const runScript = new Function(data.content);
            runScript();
        } else if (data.type === 'load-definitions') {
            console.log(`[Sandbox] Loading JSON definitions for ${data.id}`);
            // 加载积木 JSON 定义
            Blockly.defineBlocksWithJsonArray(data.definitions);
        } else if (data.type === 'generate-code') {
            const stateText = data.xml; // 字段名保持为 'xml'，但也可能是 JSON 格式
            const workspace = new Blockly.Workspace();

            try {
                let loaded = false;
                // 尝试 JSON 反序列化
                if (typeof stateText === 'string' && stateText.trim().startsWith('{')) {
                    try {
                        const state = JSON.parse(stateText);
                        Blockly.serialization.workspaces.load(state, workspace);
                        loaded = true;
                    } catch (e) {
                        console.warn('[Sandbox] JSON parse failed, falling back to XML', e);
                    }
                }

                // 回退到 XML 格式
                if (!loaded) {
                    const dom = Blockly.utils.xml.textToDom(stateText);
                    Blockly.Xml.domToWorkspace(dom, workspace);
                }

                // 初始化 Arduino 生成器
                arduinoGenerator.init(workspace);
                // 生成 C++ 代码
                const code = arduinoGenerator.workspaceToCode(workspace);

                event.source?.postMessage({
                    type: 'code-generated',
                    requestId: data.requestId,
                    code: code,
                    success: true
                }, { targetOrigin: '*' });

            } catch (err: any) {
                console.error('[Sandbox] Generation failed', err);
                event.source?.postMessage({
                    type: 'code-generated',
                    requestId: data.requestId,
                    error: err.message,
                    success: false
                }, { targetOrigin: '*' });
            } finally {
                workspace.dispose();
            }
        }
    } catch (e) {
        console.error('[Sandbox] Error processing message', e);
    }
});
