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
import { Lock, Unlock } from 'lucide-react';
import { CodeEditor } from '../CodeEditor';
import { SerialMonitorPanel } from '../SerialMonitor/SerialMonitorPanel';
import { useSerial } from '../../contexts/SerialContext';
import { useFileSystem } from '../../contexts/FileSystemContext';
import { useUI } from '../../contexts/UIContext';
import { useBuild } from '../../contexts/BuildContext';

// --- 组件属性类型 ---
interface RightPanelProps {
    width: number;
}

export const RightPanel: React.FC<RightPanelProps> = ({ width }) => {
    const { t } = useTranslation();
    const bottomPanelRef = useRef<HTMLDivElement>(null);
    const { isConnected } = useSerial();

    // FileSystem
    const { code, setCode } = useFileSystem();

    // UI
    const { isManualEditMode, setIsManualEditMode, activeTab, setActiveTab } = useUI();

    // Build
    const { logs } = useBuild();

    // Auto-scroll build logs logic
    const scrollToBottom = () => {
        if (bottomPanelRef.current) {
            bottomPanelRef.current.scrollTop = bottomPanelRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (activeTab === 'build') {
            scrollToBottom();
        }
    }, [logs, activeTab]);

    return (
        <div
            className="flex flex-col border-l border-slate-700 bg-[#1e1e1e] shadow-2xl flex-none"
            style={{ width }}
        >

            {/* C++ Code Viewer */}
            <div className="flex-1 flex flex-col min-h-0 border-b border-[#333]">
                <div className="bg-[#252526] px-4 py-2 text-slate-400 text-xs font-mono font-bold uppercase tracking-wider flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span>{t('editor.sourcePreview')}</span>
                        {isManualEditMode && <span className="text-orange-500 text-[10px] bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">{t('editor.manualMode')}</span>}
                    </div>

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
                <div className="flex-1 overflow-hidden relative bg-[#1e1e1e]">
                    <CodeEditor
                        code={code}
                        readOnly={!isManualEditMode}
                        onChange={(val) => val !== undefined && setCode(val)}
                    />
                </div>
            </div>

            {/* Bottom Tabs: Terminal & Monitor */}
            <div className="h-[40%] flex flex-col min-h-[200px] bg-[#1e1e1e]">

                {/* Tab Headers */}
                <div className="flex border-b border-[#333] bg-[#252526]">
                    <button
                        onClick={() => setActiveTab('build')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'build' ? 'border-blue-500 text-slate-200 bg-[#1e1e1e]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        {t('app.buildOutput')}
                    </button>
                    <button
                        onClick={() => setActiveTab('serial')}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'serial' ? 'border-green-500 text-slate-200 bg-[#1e1e1e]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        {t('serial.tab')}
                        {isConnected && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
                    </button>
                </div>

                {/* Tab Content: Build Logs */}
                <div ref={bottomPanelRef} className={`flex-1 p-3 overflow-auto font-mono text-xs custom-scrollbar ${activeTab === 'build' ? 'block' : 'hidden'}`}>
                    {logs.length === 0 && <div className="text-[#00ff00]/50">No logs yet...</div>}
                    {logs.map((log, i) => (<div key={i} className="mb-0.5 text-[#00ff00] break-words whitespace-pre-wrap border-l-2 border-transparent hover:border-slate-700 pl-1">{log}</div>))}
                </div>

                <SerialMonitorPanel
                    isVisible={activeTab === 'serial'}
                />

            </div>
        </div>
    );
};
