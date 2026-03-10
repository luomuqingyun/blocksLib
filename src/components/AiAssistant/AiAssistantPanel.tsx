import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Send, Bot, User, Loader2, Key, Eraser } from 'lucide-react';
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

    // [NEW] 监听 AI 流式输出
    useEffect(() => {
        if (!window.electronAPI) return;

        const unsubscribe = (window.electronAPI as any).onAiChunk((data: { chunk?: string, blocks?: any, done?: boolean }) => {
            if (data.chunk) {
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                        // 如果检测到 <BLOCKS> 标签，则截断显示，隐藏后续 JSON 内容
                        let newContent = lastMsg.content + data.chunk;
                        if (newContent.includes('<BLOCKS>')) {
                            newContent = newContent.split('<BLOCKS>')[0];
                        }
                        return [
                            ...prev.slice(0, -1),
                            { ...lastMsg, content: newContent }
                        ];
                    }
                    return prev;
                });
            }

            if (data.blocks && blocklyRef.current) {
                try {
                    const blocksJson = typeof data.blocks === 'string' ? data.blocks : JSON.stringify(data.blocks);
                    const success = blocklyRef.current.loadXml(blocksJson);
                    if (success) {
                        markWorkspaceDirty();
                        setMessages(prev => [...prev, {
                            id: 'blocks-ok-' + Date.now(),
                            role: 'assistant',
                            content: '✅ 积木已同步至工作区',
                            timestamp: Date.now()
                        }]);
                    }
                } catch (e) {
                    console.error('[AI] 积木自动注入失败:', e);
                }
            }

            if (data.done) {
                setIsLoading(false);
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [currentFilePath]);

    // 清空历史记录
    const handleClearHistory = async () => {
        if (!currentFilePath || !window.electronAPI) return;

        const confirmed = await (window.electronAPI as any).showConfirmDialog({
            title: t('ai.clear_history_title') || '清除对话记忆',
            message: t('ai.clear_history_confirm') || '确定要清除当前项目的 AI 对话记忆吗？这将开启一个新的会话，AI 将不再记得之前的聊天内容。',
            buttons: [t('common.cancel') || '取消', t('common.confirm') || '确定']
        });

        if (confirmed) {
            await (window.electronAPI as any).clearAiSession(currentFilePath);
            setMessages([]); // 同时清空本地显示的聊天记录
        }
    };

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
             * [优化] 从单次调用切换为流式请求 (askAiStream)
             */
            if (window.electronAPI && (window.electronAPI as any).askAiStream) {
                // 先预置一条空的助手消息作为占位符
                const assistantMsgId = (Date.now() + 1).toString();
                setMessages(prev => [...prev, {
                    id: assistantMsgId,
                    role: 'assistant',
                    content: '', // 初始内容为空，后续通过 onAiChunk 填充
                    timestamp: Date.now()
                }]);

                // 获取当前工作区的积木 JSON 结构
                const workspaceBlocks = blocklyRef.current ? blocklyRef.current.getXml() : null;

                // 发起异步流式请求（不阻塞）
                (window.electronAPI as any).askAiStream({
                    prompt: input,
                    context: {
                        config: await window.electronAPI.getConfig(),
                        board: selectedBoard,
                        code: code,
                        filePath: currentFilePath,
                        workspaceBlocks: workspaceBlocks
                    }
                });
            } else {
                setIsLoading(false);
                setMessages(prev => [...prev, {
                    id: 'error-' + Date.now(),
                    role: 'assistant',
                    content: 'AI 接口未就续',
                    timestamp: Date.now()
                }]);
            }
        } catch (e: any) {
            setIsLoading(false);
            console.error('[AI] 请求异常:', e);
            setMessages(prev => [...prev, {
                id: 'err-' + Date.now(),
                role: 'assistant',
                content: t('ai.error') + ': ' + e.message,
                timestamp: Date.now()
            }]);
        } finally {
            // setIsLoading(false); // 注意：Loading 状态现在由 onAiChunk (data.done) 控制
        }
    };

    if (!isVisible) return null;

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-slate-300">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-[#252526] z-50">
                <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                    <h2 className="text-sm font-semibold text-gray-100">{t('ai.assistant_title') || 'AI 助手'}</h2>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 uppercase tracking-wider font-bold">OpenClaw</span>
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={handleClearHistory}
                        title={t('ai.clear_history') || '清除历史记录'}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-all group"
                    >
                        <Eraser className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    </button>
                    {/* 暂时隐藏关闭按钮，或者如果需要可以保留 */}
                </div>
            </div>

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
                                // [优化] 仅在输入框尚未获得焦点时执行激进的重置逻辑
                                // 如果已经获焦，则不执行 el.blur() -> el.focus()，从而允许浏览器处理原生的点击定位
                                if (el && document.activeElement !== el) {
                                    // 步骤 1: 先 blur 再 focus，强制产生真正的焦点转移事件
                                    el.blur();
                                    requestAnimationFrame(() => {
                                        el.focus();
                                        // 步骤 2: setSelectionRange 强制 Chromium 渲染光标（在强制奪取焦点时设为末尾是合理的默认行为）
                                        const len = el.value.length;
                                        el.setSelectionRange(len, len);
                                    });
                                }

                                // 步骤 3: 始终执行 IPC 同步 Compositor（非破坏性），确保即使已获焦也能刷新渲染状态
                                if (window.electronAPI?.focusFix) {
                                    window.electronAPI.focusFix();
                                }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                // onClick 中的逻辑保持防御性即可，不再强制 setSelectionRange(end, end)
                                // 因为原生定位通常发生在 MouseDown 后、Click 前
                                const el = inputRef.current;
                                if (el && document.activeElement !== el) {
                                    el.focus();
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
