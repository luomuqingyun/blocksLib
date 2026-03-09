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
            // 标准对焦：仅在面板切换为可见时，尝试对焦一次
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    // 独立的消息列表滚动逻辑
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
                // [NEW] 消息收到后恢复焦点，让用户可以连续追问
                setTimeout(() => inputRef.current?.focus(), 100);

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
                        const success = blocklyRef.current.loadXml(blocksJson);

                        if (success) {
                            markWorkspaceDirty(); // 标记为已修改，触发撤销栈记录
                            console.log('[AI] 已自动同步积木至工作区 (包含容错过滤)');

                            // ✅ 积木注入成功反馈
                            setMessages(prev => [...prev, {
                                id: 'blocks-ok-' + Date.now(),
                                role: 'assistant',
                                content: '✅ 积木已同步至工作区',
                                timestamp: Date.now()
                            }]);
                        } else {
                            throw new Error("UI 反馈：工作区加载失败或发生严重异常");
                        }
                    } catch (e) {
                        console.error('[AI] 积木注入失败:', e);
                        // ⚠️ 积木注入失败反馈
                        setMessages(prev => [...prev, {
                            id: 'blocks-err-' + Date.now(),
                            role: 'assistant',
                            content: '⚠️ 积木生成格式异常，请重试或手动搭建',
                            timestamp: Date.now()
                        }]);
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
            // [NEW] 无论成功失败，恢复对焦
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-slate-300">
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] min-w-0 flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`p-3 rounded-lg text-sm leading-relaxed break-words ${msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-800 border border-slate-700'}`}>
                                <div className="markdown-body ai-markdown">
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
                <div ref={messagesEndRef} className="h-12 shrink-0" />
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
                                // [关键] 阻止 ALL 键盘事件冒泡到 Blockly workspace
                                // 之前只拦截了 Enter，导致普通字符键被 Blockly 吞掉
                                e.stopPropagation();
                                if (e.key === 'Enter') {
                                    handleSend();
                                }
                            }}
                            onFocus={() => {
                                inputRef.current?.classList.add('border-blue-500');
                                inputRef.current?.classList.remove('border-slate-700');
                            }}
                            onBlur={() => {
                                inputRef.current?.classList.remove('border-blue-500');
                                inputRef.current?.classList.add('border-slate-700');
                            }}
                            /**
                             * [Event Firewall + Compositor Reset]
                             * 1. stopPropagation: 阻止事件到达 Blockly
                             * 2. blur→focus 循环: 强制产生真正的 FOCUS 事件
                             * 3. setSelectionRange: 强制 Chromium 绘制光标
                             * 4. IPC focusFix: 同步 Chromium Compositor
                             */
                            onPointerDown={(e) => {
                                e.stopPropagation();
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const el = inputRef.current;
                                if (el) {
                                    // 步骤 1: 先 blur 再 focus，强制产生真正的焦点转移事件
                                    el.blur();
                                    requestAnimationFrame(() => {
                                        el.focus();
                                        // 步骤 2: setSelectionRange 强制 Chromium 渲染光标
                                        const len = el.value.length;
                                        el.setSelectionRange(len, len);
                                    });
                                }
                                // 步骤 3: IPC 同步 Compositor（非破坏性）
                                if (window.electronAPI?.focusFix) {
                                    window.electronAPI.focusFix();
                                }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                const el = inputRef.current;
                                if (el && document.activeElement !== el) {
                                    el.focus();
                                    const len = el.value.length;
                                    el.setSelectionRange(len, len);
                                }
                            }}
                            placeholder={t('ai.placeholder')}
                            className="w-full h-full bg-[#1e1e1e] border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:border-blue-500 focus:outline-[2px] focus:outline-blue-500/50 focus:ring-1 focus:ring-blue-500 transition-all select-text cursor-text !pointer-events-auto"
                            style={{ WebkitUserSelect: 'text', userSelect: 'auto' }}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
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
                </div>
            </div>
        </div>
    );
};
