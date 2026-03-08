import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Send, Bot, User, Loader2, Key } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useFileSystem } from '../../contexts/FileSystemContext';
import { useBuild } from '../../contexts/BuildContext';

/**
 * AI 助手消息接口
 */
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

/**
 * AI 助手面板组件: 提供实时聊天界面，支持 Markdown 渲染和积木同步逻辑。
 */
export const AiAssistantPanel: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: t('ai.welcome'),
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { currentFilePath, blocklyRef, markWorkspaceDirty, code } = useFileSystem();
    const { selectedBoard } = useBuild();

    /**
     * 将聊天列表滚动至最底部
     * 确保最新回复可见
     */
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    /**
     * [重点修复] 自动对焦与滚动逻辑 (Focus & Scroll Logic)
     * 当面板变为可见时，通过双重延迟 (requestAnimationFrame + setTimeout)
     * 确保输入框在 DOM 渲染与动画结束后能获得稳定焦点感。
     */
    useEffect(() => {
        if (isVisible) {
            scrollToBottom();
            // 第一步：请求下一帧，确保 React 已经完成了虚拟 DOM 挂载
            requestAnimationFrame(() => {
                // 第二步：使用 150ms 延迟，确保 CSS 动画 (RightPanel 展开) 结束
                // 这样可以防止在容器宽度为 0 或动画过程中对焦失败。
                const timer = setTimeout(() => {
                    if (inputRef.current) {
                        // [Phase 4] 双重对焦补丁 (Double-Focus Trick)
                        // 先失焦再获焦，强制 Chromium 重新绑定渲染层与物理输入流水线
                        inputRef.current.blur();
                        inputRef.current.focus();
                    }
                }, 150);
                return () => clearTimeout(timer);
            });
        }
    }, [messages, isVisible]);

    /**
     * 发送消息处理函数
     * 流程：前端记录用户消息 -> 启动 Loading 状态 -> 通过 IPC 隧道请求 OpenClaw -> 处理响应并注入积木
     */
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput(''); // 立即清空输入框
        setIsLoading(true);

        try {
            /** 
             * 调用 Electron 主进程中的 askOpenClaw IPC 接口
             * 该接口会透传指令给 AiService 处理。
             */
            if (window.electronAPI && (window.electronAPI as any).askOpenClaw) {
                const response = await (window.electronAPI as any).askOpenClaw({
                    prompt: input,
                    context: {
                        config: await window.electronAPI.getConfig(),
                        board: selectedBoard,
                        code: code
                    }
                });

                const assistantMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.content || t('ai.error'),
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, assistantMsg]);

                /**
                 * 核心逻辑：积木实时注入 (Hot Reload)
                 * 如果 AI 在响应中返回了 blocks 字段（标准的 Blockly JSON 格式），
                 * 软件将自动更新当前的积木工作区，无需用户手动拖拽。
                 */
                if (response.blocks && blocklyRef.current) {
                    try {
                        const blocksJson = typeof response.blocks === 'string'
                            ? response.blocks
                            : JSON.stringify(response.blocks);

                        // 调用封装的 BlocklyWrapper 加载新的积木定义
                        blocklyRef.current.loadXml(blocksJson);
                        markWorkspaceDirty(); // 标记为已修改，触发撤销栈记录
                        console.log('[AI] 已自动同步积木至工作区');
                    } catch (e) {
                        console.error('[AI] 积木注入失败:', e);
                    }
                }
            } else {
                // 仅用于开发阶段的模拟逻辑
                setTimeout(() => {
                    const assistantMsg: Message = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: '这是一个模拟回复。由于 OpenClaw 环境尚未完全就绪，我目前处于演示模式。',
                        timestamp: Date.now()
                    };
                    setMessages(prev => [...prev, assistantMsg]);
                    setIsLoading(false);
                }, 1000);
                return;
            }
        } catch (err) {
            console.error('AI 通信错误:', err);
            const errorMsg: Message = {
                id: 'error-' + Date.now(),
                role: 'assistant',
                content: t('ai.error'),
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-slate-300">
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative">
                {/* [Phase 3] 悬浮调试按钮组：用于在极少数输入失效情况下手动复位 */}
                <div className="absolute top-2 right-4 flex gap-2 z-20">
                    <button
                        onClick={() => {
                            setTimeout(() => inputRef.current?.focus(), 0);
                        }}
                        className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-400 rounded border border-slate-700 transition-colors flex items-center gap-1"
                        title="强制重置焦点"
                    >
                        <Bot size={12} />
                        Reset Focus
                    </button>
                </div>
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`p-3 rounded-lg text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-800 border border-slate-700'}`}>
                                <div className="markdown-body">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex gap-3 flex-row">
                            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                                <Bot size={16} />
                            </div>
                            <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg">
                                <Loader2 size={16} className="animate-spin text-purple-400" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 输入区 - 修正布局遮挡问题 */}
            <div className="p-4 border-t border-slate-700 bg-[#252526] z-50">
                <div className="relative flex items-center w-full pointer-events-auto">
                    {/* 
                        [防御性对焦补丁]
                        使用 inputRef.current?.focus() 强行夺回焦点。
                        onMouseDown 发生早于其它系统事件，通过 setTimeout(..., 0) 
                        将对焦请求推迟到当前事件冒泡链之后，确保绝对获焦。
                    */}
                    <div className="w-full relative flex-1 cursor-text select-text z-50">
                        <input
                            ref={inputRef}
                            type="text"
                            autoFocus
                            tabIndex={0}
                            data-input-protect="true"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                // [Phase 4] 阻止事件冒泡 (Cut interception)
                                // 禁止事件向上传递至 window，防止被全局监听器（如 Blockly）意外拦截
                                e.stopPropagation();
                                if (e.key === 'Enter') handleSend();
                            }}
                            onFocus={() => {
                                // [诊断日志] 记录焦点状态，便于 embedblocks-diag-*.md 链路追踪
                                console.log('[AiAssistant] Input Focused');
                                inputRef.current?.classList.add('border-blue-500');
                                inputRef.current?.classList.remove('border-slate-700');
                            }}
                            onBlur={() => {
                                console.log('[AiAssistant] Input Blurred');
                                inputRef.current?.classList.remove('border-blue-500');
                                inputRef.current?.classList.add('border-slate-700');
                            }}
                            onMouseDown={(e) => {
                                // [CRITICAL FIX] 阻止 mousedown 事件冒泡到 window/document。
                                // 因为 Blockly 全局绑定了 pointerdown/mousedown 并会调用 preventDefault()，
                                // 导致浏览器原生的“点击输入框出现光标”行为被强行拦截。
                                e.stopPropagation();

                                console.log('[AiAssistant] MouseDown to regain focus');
                                // [Phase 4 Ultimate Fix] 强制夺回系统级窗口焦点
                                // 解决 Electron 在 Windows 下的“幽灵焦点”Bug (DOM 获焦但 OS 不按键)
                                window.focus();

                                // 强制在点击瞬间夺回焦点，解决“点击输入框但不聚焦”的问题
                                setTimeout(() => {
                                    if (inputRef.current) {
                                        inputRef.current.blur();
                                        inputRef.current.focus();
                                    }
                                }, 0);
                            }}
                            onMouseUp={(e) => {
                                e.stopPropagation();
                                // 确保鼠标释放时窗口依然有强制焦点
                                window.focus();
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            placeholder={t('ai.placeholder')}
                            className="w-full h-full bg-[#1e1e1e] border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:border-blue-500 focus:outline-[2px] focus:outline-blue-500/50 focus:ring-1 focus:ring-blue-500 transition-all select-text cursor-text !pointer-events-auto"
                            style={{ WebkitUserSelect: 'text', userSelect: 'auto' }}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`absolute right-2.5 p-1.5 rounded-md transition-colors z-[60] ${!input.trim() || isLoading ? 'text-slate-600' : 'text-blue-500 hover:bg-blue-500/10 cursor-pointer'}`}
                    >
                        <Send size={16} />
                    </button>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Sparkles size={10} />
                        <span>{t('ai.poweredBy')}</span>
                    </div>
                    {/* [NEW] 快捷触发诊断 */}
                    <button
                        onClick={() => (window as any).InputLogger?.exportDiagnosticDirectly()}
                        className="text-slate-600 hover:text-blue-500 transition-colors px-1"
                        title="导出交互诊断报告 (Ctrl+Shift+L)"
                    >
                        Diag Log
                    </button>
                </div>
            </div>
        </div>
    );
};
