/**
 * ============================================================
 * EmbedBlocks 应用主入口 (Main Application Entry)
 * ============================================================
 * 
 * 本文件是前端 React 应用的根组件，负责:
 * 1. 组合所有 Context Provider (状态管理层)
 * 2. 根据项目状态切换 WelcomeScreen / 工作区视图
 * 3. 管理全局模态框 (设置、扩展、新建项目等)
 * 4. 处理原生菜单事件 (通过 useAppController)
 * 
 * 组件层级结构:
 * App (Provider 嵌套)
 *  └─ AppInner (路由逻辑)
 *       ├─ WelcomeScreen (无项目时)
 *       └─ AppContent (编辑器主界面)
 *            ├─ TopBar
 *            └─ WorkspaceLayout
 *                 ├─ BlocklyWrapper (左侧)
 *                 └─ RightPanel (右侧: 代码/串口)
 * 
 * @file src/App.tsx
 * @module EmbedBlocks/Frontend/App
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSystemProvider, useFileSystem } from './contexts/FileSystemContext';
import { SerialProvider, useSerial } from './contexts/SerialContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { BuildProvider, useBuild } from './contexts/BuildContext';
import { TopBar } from './components/Layout/TopBar';
import { WorkspaceLayout } from './components/Layout/WorkspaceLayout';
import { SettingsModal } from './components/SettingsModal';
import { ExtensionsModal } from './components/ExtensionsModal';
import { NewProjectModal } from './components/NewProjectModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Toast } from './components/Toast';
import { SavePromptModal } from './components/SavePromptModal';
import { BlocklyWrapper } from './components/BlocklyWrapper';
import { SerialMonitorPanel } from './components/SerialMonitor/SerialMonitorPanel';
import { ExtensionRegistry } from './registries/ExtensionRegistry';
import { BoardRegistry } from './registries/BoardRegistry';
import { RightPanel } from './components/Layout/RightPanel';
import { DiagnosticOverlay } from './components/DiagnosticOverlay';
import { useToolbox } from './hooks/useToolbox';

/**
 * 应用主内容区域
 * 包含 Blockly 编辑器和右侧面板的工作区布局
 */
function AppContent() {

  const { isConnected } = useSerial();
  const { blocklyRef, code, setCode, pendingXml, clearPendingXml, markWorkspaceDirty, currentFilePath } = useFileSystem();
  const { selectedBoard } = useBuild();
  const {
    rightPanelWidth, setRightPanelWidth,
    isManualEditMode,
    activeTab, setActiveTab
  } = useUI();

  // Custom hook for toolbox management
  const toolboxConfig = useToolbox(selectedBoard);

  // Auto-open Serial Monitor when connected
  useEffect(() => {
    if (isConnected) {
      setActiveTab('serial');
    }
  }, [isConnected, setActiveTab]);

  const handleBlocklyCodeChange = (newCode: string) => {
    if (!isManualEditMode) {
      if (newCode !== code) {
        setCode(newCode);
        if (!pendingXml) {
          markWorkspaceDirty();
        }
      }
    }
  };

  const handleViewportChange = (vs: { scrollX: number, scrollY: number, scale: number }) => {
    if (currentFilePath) {
      try {
        const normalizedPath = currentFilePath.replace(/\\/g, '/').toLowerCase();
        const key = `viewstate:${normalizedPath}`;
        console.log('[App] Saving view state to localStorage:', key, vs);
        localStorage.setItem(key, JSON.stringify({ ...vs, timestamp: Date.now() }));
      } catch (e) {
        // Silently ignore storage errors
      }
    }
  };

  // Trigger Blockly resize when activeTab changes (ResizeObserver handles panel width)
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
                  toolboxConfiguration={toolboxConfig}
                  selectedBoard={selectedBoard}
                  initialCode=""
                  initialXml={pendingXml}
                  onXmlLoaded={clearPendingXml}
                  onViewportChange={handleViewportChange}
                  currentFilePath={currentFilePath}
                  onUiChange={undefined} // No longer used for dirty state
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

// Separate component for listeners to use hooks
import { ProjectSettingsModal } from './components/Modals/ProjectSettingsModal';
import { HelpModal } from './components/Modals/HelpModal';
import { AboutOverlay } from './components/Modals/AboutOverlay';
import { useAppController } from './hooks/useAppController';

const GlobalListeners = () => {
  // Use the controller hook to handle all menu actions
  useAppController();

  const { selectedBoard } = useBuild();
  const { isExtensionsOpen, setIsExtensionsOpen, isSettingsOpen, setIsSettingsOpen, isHelpOpen, helpTitle, helpContent, helpPath, closeHelp, isAboutOpen, aboutContent, closeAbout } = useUI();
  const { savePrompt, handleSaveConfirm, handleDontSave, handleCancelPrompt } = useFileSystem();


  return (
    <>
      <NewProjectModal />
      <ExtensionsModal isOpen={isExtensionsOpen} onClose={() => setIsExtensionsOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} selectedBoard={selectedBoard} />
      <ProjectSettingsModal />
      <HelpModal isOpen={isHelpOpen} onClose={closeHelp} title={helpTitle} content={helpContent} helpPath={helpPath} />
      <AboutOverlay isOpen={isAboutOpen} onClose={closeAbout} content={aboutContent} />
      <SavePromptModal
        isOpen={savePrompt.isOpen}
        onSave={handleSaveConfirm}
        onDontSave={handleDontSave}
        onCancel={handleCancelPrompt}
      />
    </>
  );
};

function AppInner() {
  const { currentFilePath } = useFileSystem();
  const { setIsNewProjectOpen, setIsSettingsOpen, setIsExtensionsOpen } = useUI();
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  const refreshRecent = async () => {
    if (window.electronAPI) {
      const config = await window.electronAPI.getConfig();
      setRecentProjects(config.general?.recentProjects || []);
    }
  };

  useEffect(() => {
    refreshRecent();
  }, [currentFilePath]); // Also refresh when closing project (returning to welcome)

  // Initialize the extension system once at the top level
  useEffect(() => {
    ExtensionRegistry.ensureInitialized().catch(err => {
      console.error('[AppInner] Failed to initialize ExtensionRegistry:', err);
    });
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-slate-300 overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {!currentFilePath ? (
          <WelcomeScreen
            onNewProject={() => setIsNewProjectOpen(true)}
            onOpenConfig={() => setIsSettingsOpen(true)}
            onOpenExtensions={() => setIsExtensionsOpen(true)}
            recentProjects={recentProjects}
            onRefreshRecent={refreshRecent}
          />
        ) : (
          <AppContent key={currentFilePath} />
        )}
      </div>

      <GlobalListeners />
      <Toast />
    </div>
  );
}

function App() {
  return (
    <UIProvider>
      <FileSystemProvider>
        <SerialProvider>
          <BuildProvider>
            <AppInner />
            <DiagnosticOverlay />
          </BuildProvider>
        </SerialProvider>
      </FileSystemProvider>
    </UIProvider>
  );
}

export default App;