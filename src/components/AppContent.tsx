/**
 * ============================================================
 * 编辑器主界面 (App Content)
 * ============================================================
 * 
 * 包含 Blockly 编辑器和右侧面板的工作区布局。
 * 从 App.tsx 拆分出来以支持 React.lazy 延迟加载，从而优化启动性能。
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useUI } from '../contexts/UIContext';
import { useSerial } from '../contexts/SerialContext';
import { useBuild } from '../contexts/BuildContext';
import { useToolbox } from '../hooks/useToolbox';
import { TopBar } from './Layout/TopBar';
import { WorkspaceLayout } from './Layout/WorkspaceLayout';
import { BlocklyWrapper } from './BlocklyWrapper';
import { RightPanel } from './Layout/RightPanel';

export function AppContent() {
    // 获取串口连接状态
    const { isConnected } = useSerial();
    // 获取文件系统相关状态和操作
    const {
        blocklyRef, code, setCode, pendingXml, clearPendingXml,
        markWorkspaceDirty, currentFilePath, setIsLoading
    } = useFileSystem();
    // 获取当前选择的开发板
    const { selectedBoard } = useBuild();
    // 获取 UI 相关状态
    const {
        rightPanelWidth, setRightPanelWidth,
        isManualEditMode,
        activeTab, setActiveTab
    } = useUI();

    // 用于工具箱管理的自定义钩子
    const toolboxConfig = useToolbox(selectedBoard);

    // 连接成功后自动打开串口监视器
    useEffect(() => {
        if (isConnected) {
            setActiveTab('serial');
        }
    }, [isConnected, setActiveTab]);

    // [性能优化] 使用 Ref 隔离 handleBlocklyCodeChange，
    // 确保传递给 BlocklyWrapper 的 props 引用稳定，防止每次打字都触发 Reconciliation
    const setCodeRef = useRef(setCode);
    setCodeRef.current = setCode;
    const isManualEditModeRef = useRef(isManualEditMode);
    isManualEditModeRef.current = isManualEditMode;
    const codeRef = useRef(code);
    codeRef.current = code;
    const pendingXmlRef = useRef(pendingXml);
    pendingXmlRef.current = pendingXml;
    const markWorkspaceDirtyRef = useRef(markWorkspaceDirty);
    markWorkspaceDirtyRef.current = markWorkspaceDirty;

    const handleBlocklyCodeChange = useCallback((newCode: string) => {
        if (!isManualEditModeRef.current) {
            if (newCode !== codeRef.current) {
                setCodeRef.current(newCode);
                // 只有在非加载状态（pendingXml 为空）下才标记为脏
                if (!pendingXmlRef.current) {
                    markWorkspaceDirtyRef.current();
                }
            }
        }
    }, []); // 真正的引用稳定回调

    // 为 BlocklyWrapper 的 onXmlLoaded 提供稳定的回调
    const handleXmlLoaded = useCallback(() => {
        clearPendingXml();
        setIsLoading(false);
        console.log('[AppContent] Project loaded and lock released.');
    }, [clearPendingXml, setIsLoading]);

    // 当 activeTab 改变时触发 Blockly 调整大小（ResizeObserver 负责处理面板宽度）
    useEffect(() => {
        if (blocklyRef.current) {
            blocklyRef.current.resize();
        }
    }, [blocklyRef, activeTab]);

    return (
        <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-slate-200 overflow-hidden">
            <TopBar />
            <div className="flex-1 flex overflow-hidden">
                <WorkspaceLayout
                    rightPanelWidth={rightPanelWidth}
                    setRightPanelWidth={setRightPanelWidth}
                    leftPanel={
                        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                            <div className="flex-1 relative h-full">
                                <BlocklyWrapper
                                    ref={blocklyRef}
                                    onCodeChange={handleBlocklyCodeChange}
                                    onModelChange={markWorkspaceDirtyRef.current}  // [NEW] 绑定模型变更回调
                                    toolboxConfiguration={toolboxConfig}
                                    selectedBoard={selectedBoard}
                                    initialCode=""
                                    initialXml={pendingXml}
                                    onXmlLoaded={handleXmlLoaded}
                                    currentFilePath={currentFilePath}
                                    onUiChange={undefined}
                                />
                            </div>
                        </div>
                    }
                    rightPanel={
                        <RightPanel width={rightPanelWidth} />
                    }
                />
            </div>
        </div>
    );
}
