// ----------------------------------------------------------------------------
// 右侧面板组件 (Right Panel Component)
// ----------------------------------------------------------------------------
// 显示代码编辑器、串口监视器和编译日志的容器:
// - 代码标签页: 生成的 Arduino 代码 (支持手动编辑模式)
// - 串口标签页: 串口监视器面板
// - 编译标签页: PlatformIO 编译/上传日志
// ----------------------------------------------------------------------------

import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Unlock, Trash2, Sparkles } from 'lucide-react';
import { CodeEditor } from '../CodeEditor';
import { SerialMonitorPanel } from '../SerialMonitor/SerialMonitorPanel';
import { AiAssistantPanel } from '../AiAssistant/AiAssistantPanel';
import { useSerial } from '../../contexts/SerialContext';
import { useFileSystem } from '../../contexts/FileSystemContext';
import { useUI } from '../../contexts/UIContext';
import { useBuild } from '../../contexts/BuildContext';

// --- 组件属性类型 ---
interface RightPanelProps {
    /** 面板宽度 (像素) */
    width: number;
}

export const RightPanel: React.FC<RightPanelProps> = ({ width }) => {
    const { t } = useTranslation();
    // 编译日志容器引用 (用于自动滚动)
    const bottomPanelRef = useRef<HTMLDivElement>(null);
    // 串口连接状态
    const { isConnected } = useSerial();

    // 文件系统: 代码内容
    const { code, setCode } = useFileSystem();

    // UI 状态: 手动编辑模式、当前标签页
    const { isManualEditMode, setIsManualEditMode, activeTab, setActiveTab } = useUI();

    // 构建上下文: 编译日志及清理函数
    const { logs, clearLogs, isBuilding } = useBuild();

    /** 根据日志内容返回语法高亮颜色 */
    const getLogColor = (log: string) => {
        const lower = log.toLowerCase();
        if (lower.includes('error:') || lower.includes('failed') || lower.includes('undefined reference') || lower.includes('fatal error')) return 'text-red-400';
        if (lower.includes('warning') || lower.includes('ignore unknown') || lower.includes('skipping')) return 'text-yellow-400';
        if (lower.includes('success') || lower.includes('done') || log.includes('==========')) return 'text-green-400';
        if (lower.startsWith('compiling') || lower.startsWith('building') || lower.startsWith('archiving') || lower.startsWith('indexing')) return 'text-blue-300';
        return 'text-slate-300';
    };

    /**
     * 滚动到底部
     * 用于新日志追加时自动滚动
     */
    const scrollToBottom = () => {
        if (bottomPanelRef.current) {
            bottomPanelRef.current.scrollTop = bottomPanelRef.current.scrollHeight;
        }
    };

    // 日志更新或切换到构建标签页时自动滚动
    useEffect(() => {
        if (activeTab === 'build') {
            scrollToBottom();
        }
    }, [logs, activeTab]);

    // ========== 渲染右侧面板 ==========
    return (
        <div
            className="flex flex-col border-l border-slate-700 bg-[#1e1e1e] shadow-2xl flex-none"
            style={{ width }}
        >

            {/* C++ 代码查看器 */}
            <div className="flex-1 flex flex-col min-h-0 border-b border-[#333]">
                {/* 代码编辑器头部: 标题和编辑模式切换 */}
                <div className="bg-[#252526] px-4 py-2 text-slate-400 text-xs font-mono font-bold uppercase tracking-wider flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span>{t('editor.sourcePreview')}</span>
                        {isManualEditMode && <span className="text-orange-500 text-[10px] bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">{t('editor.manualMode')}</span>}
                    </div>

                    {/* 编辑模式切换按钮 */}
                    <button
                        onClick={() => {
                            setIsManualEditMode(!isManualEditMode);
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${isManualEditMode ? 'text-orange-400 hover:bg-orange-900/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'}`}
                        title={isManualEditMode ? t('editor.lockTooltip') : t('editor.unlockTooltip')}
                    >
                        {isManualEditMode ? <Unlock size={12} /> : <Lock size={12} />}
                        <span className="text-[10px]">{isManualEditMode ? t('editor.unlock') : t('editor.locked')}</span>
                    </button>
                </div>
                {/* Monaco 代码编辑器 */}
                <div className="flex-1 overflow-hidden relative bg-[#1e1e1e]">
                    <CodeEditor
                        code={code}
                        readOnly={!isManualEditMode}
                        onChange={(val) => val !== undefined && setCode(val)}
                    />
                </div>
            </div>

            {/* 底部标签页: 编译日志 和 串口监视器 */}
            <div className="h-[40%] flex flex-col min-h-[200px] bg-[#1e1e1e]">

                {/* 标签页头部 */}
                <div className="flex justify-between items-end border-b border-[#333] bg-[#252526]">
                    <div className="flex">
                        {/* 构建输出标签 */}
                        <button
                            onClick={() => setActiveTab('build')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'build' ? 'border-blue-500 text-slate-200 bg-[#1e1e1e]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            {t('app.buildOutput')}
                        </button>
                        {/* 串口监视器标签 (带连接状态指示器) */}
                        <button
                            onClick={() => setActiveTab('serial')}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'serial' ? 'border-green-500 text-slate-200 bg-[#1e1e1e]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            {t('serial.tab')}
                            {isConnected && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
                        </button>
                        {/* AI 助手标签 (集成 OpenClaw，支持积木建议) */}
                        <button
                            onClick={() => {
                                setActiveTab('ai');
                                // 当切换到 AI 助手时，强制夺取所在窗口和 DOM 的焦点
                                setTimeout(() => {
                                    window.focus();
                                    const input = document.querySelector('input[data-input-protect="true"]') as HTMLInputElement;
                                    if (input) input.focus();
                                }, 50);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'ai' ? 'border-purple-500 text-slate-200 bg-[#1e1e1e]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            <Sparkles size={14} className={activeTab === 'ai' ? 'text-purple-400' : ''} />
                            {t('app.aiAssistant')}
                        </button>
                    </div>

                    {/* 日志清空工具按钮 */}
                    {activeTab === 'build' && (
                        <button
                            onClick={clearLogs}
                            disabled={isBuilding || logs.length === 0}
                            className={`mr-3 mb-1 px-2.5 py-1 text-[11px] font-medium rounded transition-all flex items-center gap-1.5 border ${isBuilding || logs.length === 0 ? 'text-slate-600 border-slate-700 bg-transparent cursor-not-allowed' : 'text-slate-300 border-slate-600 bg-[#333] hover:text-white hover:border-red-500 hover:bg-red-500/20 shadow-sm'}`}
                            title={t('serial.clearOutput', '清空输出')}
                        >
                            <Trash2 size={12} className={isBuilding || logs.length === 0 ? 'opacity-50' : 'text-red-400'} />
                            {t('serial.clear', '清空')}
                        </button>
                    )}
                </div>

                {/* 标签页内容: 构建日志 */}
                <div ref={bottomPanelRef} className={`flex-1 p-3 overflow-auto font-mono text-xs custom-scrollbar ${activeTab === 'build' ? 'block' : 'hidden pointer-events-none'}`}>
                    {logs.length === 0 && <div className="text-slate-500 italic flex items-center h-full justify-center">等待编译或上传输出...</div>}
                    {logs.map((log, i) => (
                        <div key={i} className={`mb-0.5 break-words whitespace-pre-wrap border-l-2 border-transparent hover:border-slate-700 pl-1 ${getLogColor(log)}`}>
                            {log}
                        </div>
                    ))}
                </div>

                {/* 标签页内容: 串口监视器 */}
                <div className={`flex-1 flex overflow-hidden ${activeTab === 'serial' ? '' : 'hidden pointer-events-none'}`}>
                    <SerialMonitorPanel
                        isVisible={activeTab === 'serial'}
                    />
                </div>

                {/* 标签页内容: AI 助手 */}
                <div className={`flex-1 flex overflow-hidden ${activeTab === 'ai' ? '' : 'hidden pointer-events-none'}`}>
                    <AiAssistantPanel
                        isVisible={activeTab === 'ai'}
                    />
                </div>

            </div>
        </div>
    );
};
