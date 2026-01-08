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

function AppContent() {
  const { isConnected } = useSerial();
  const { blocklyRef, code, setCode, projectMetadata, pendingXml, clearPendingXml, setIsDirty, markWorkspaceDirty, currentFilePath } = useFileSystem();
  const { selectedBoard, setSelectedBoard } = useBuild();
  const {
    rightPanelWidth, setRightPanelWidth,
    isManualEditMode,
    activeTab, setActiveTab
  } = useUI();

  // Removed manual useEffect for pendingXml. Handled by BlocklyWrapper prop.

  // Local state for toolbox
  const [toolboxConfig, setToolboxConfig] = useState<any>(null);

  // Sync Toolbox when board changes, Language changes, or Registry updates
  const { i18n } = useTranslation();

  const refreshToolbox = async () => {
    if (selectedBoard) {
      // Get base config from Registry
      const baseConfig = BoardRegistry.getToolboxConfig(selectedBoard);

      // Get user config for visibility
      let hiddenCategories: string[] = [];
      if (window.electronAPI) {
        const userConfig = await window.electronAPI.getConfig();
        hiddenCategories = userConfig.toolbox?.hiddenCategories || [];
      }

      if (hiddenCategories.length === 0) {
        setToolboxConfig(baseConfig);
        return;
      }

      // Filter contents
      // We assume baseConfig is { kind: 'categoryToolbox', contents: [...] }
      const newContents = (baseConfig.contents || []).filter((item: any) => {
        // If it's a category, check if its ID (or Name which we use as ID in settings) is hidden
        if (item.kind === 'category') {
          // The settings uses the 'name' property (e.g. %{BKY_CAT_LOGIC}) or 'id' property as the key
          const key = item.id || item.name;
          if (key && hiddenCategories.includes(key)) {
            return false;
          }
        }
        return true;
      });

      console.log(`[App] 刷新工具箱 (Refresh Toolbox) - Board: ${selectedBoard}, Hidden: ${hiddenCategories.length}`);
      setToolboxConfig({ ...baseConfig, contents: newContents });
    }
  };

  useEffect(() => {
    refreshToolbox();
  }, [selectedBoard, i18n.language]);

  // Subscribe to dynamic registry updates (e.g. extension loaded)
  useEffect(() => {
    const unsubscribe = BoardRegistry.subscribe(() => {
      console.log('[App] BoardRegistry updated, refreshing toolbox...');
      refreshToolbox();
    });

    // Also listen for custom config update events (dispatched by Settings)
    const handleConfigUpdate = () => {
      console.log('[App] Config updated, refreshing toolbox...');
      refreshToolbox();
    };
    window.addEventListener('embedblocks:config-updated', handleConfigUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('embedblocks:config-updated', handleConfigUpdate);
    };
  }, [selectedBoard]);

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