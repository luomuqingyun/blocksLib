/**
 * ============================================================
 * EmbedBlocks 应用主入口 (Main Application Entry)
 * ============================================================
 */

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSystemProvider, useFileSystem } from './contexts/FileSystemContext';
import { SerialProvider, useSerial } from './contexts/SerialContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { BuildProvider, useBuild } from './contexts/BuildContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Toast } from './components/Toast';
import { ExtensionRegistry } from './registries/ExtensionRegistry';
import { useAppController } from './hooks/useAppController';
import { AppInitializer } from './services/AppInitializer';
import { setBlocklyLocale } from './locales/setupBlocklyLocales';
import i18next from 'i18next';

import { AppContent } from './components/AppContent';

// [OPTIMIZATION] 延迟加载非核心重型组件，显著提升启动速度
const NewProjectModal = lazy(() => import('./components/NewProjectModal').then(m => ({ default: m.NewProjectModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const ExtensionsModal = lazy(() => import('./components/ExtensionsModal').then(m => ({ default: m.ExtensionsModal })));
const ProjectSettingsModal = lazy(() => import('./components/Modals/ProjectSettingsModal').then(m => ({ default: m.ProjectSettingsModal })));
const HelpModal = lazy(() => import('./components/Modals/HelpModal').then(m => ({ default: m.HelpModal })));
const AboutOverlay = lazy(() => import('./components/Modals/AboutOverlay').then(m => ({ default: m.AboutOverlay })));
const SavePromptModal = lazy(() => import('./components/SavePromptModal').then(m => ({ default: m.SavePromptModal })));

// 加载占位符
const LoadingOverlay = () => (
  <div className="h-full w-full flex items-center justify-center bg-[#1e1e1e] text-slate-400">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-sm font-medium animate-pulse">Loading Workspace...</span>
    </div>
  </div>
);

const GlobalListeners = () => {
  useAppController();
  const { selectedBoard } = useBuild();
  const {
    isExtensionsOpen, setIsExtensionsOpen,
    isSettingsOpen, setIsSettingsOpen,
    isHelpOpen, helpTitle, helpContent, helpPath, closeHelp,
    isAboutOpen, aboutContent, closeAbout
  } = useUI();
  const { savePrompt, handleSaveConfirm, handleDontSave, handleCancelPrompt } = useFileSystem();

  return (
    <Suspense fallback={null}>
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
    </Suspense>
  );
};

function AppInner() {
  const { currentFilePath } = useFileSystem();
  const { config } = useBuild();
  const { setIsNewProjectOpen, setIsSettingsOpen, setIsExtensionsOpen } = useUI();
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  console.log('[AppInner] Rendering - filePath:', currentFilePath);

  const refreshRecent = async () => {
    if (window.electronAPI) {
      const start = performance.now();
      const config = await window.electronAPI.getConfig();
      const end = performance.now();
      console.log(`[App] fetchConfig: ${(end - start).toFixed(2)}ms`);
      setRecentProjects(config.general?.recentProjects || []);
    }
  };

  // 组件挂载时执行全局初始化 (已移至 App.tsx 处理)
  useEffect(() => {
    refreshRecent();
  }, [currentFilePath]);

  // [New] 监听配置变更广播，实时刷新最近项目和自动发现状态
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.onConfigChanged) return;

    const unsubscribe = window.electronAPI.onConfigChanged((key) => {
      if (key === 'general.recentProjects' || key === 'general.projectHistoryLimit') {
        refreshRecent();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    // [OPTIMIZATION] 静默预加载核心系统与重型组件 (Background Pre-warming)
    console.log('[App] Starting background pre-warming...');
    const preloadStart = performance.now();

    // 1. 初始化模块注册表 (Blockly Definitions)
    AppInitializer.initialize();

    // 2. 初始化核心 ExtensionRegistry (后台执行，不阻塞首屏 UI)
    ExtensionRegistry.ensureInitialized().then(() => {
      console.log(`[App] ExtensionRegistry.init resolved.`);
    }).catch(err => {
      console.error('[AppInner] Failed to initialize ExtensionRegistry:', err);
    });

    // 3. 预加载代码块和多语言
    const lang = i18next.language || 'zh';

    // [OPTIMIZATION] 彻底解耦！不再等待 ExtensionRegistry 和 locales 等待，
    // UI 此时已获得了足够的数据（recentProjects）可以瞬间渲染出首页。
    // 将整个耗时 400ms~2000ms 的过程丢到真正的后台！
    setIsInitializing(false);

    Promise.all([
      import('./components/NewProjectModal'),
      import('./components/SettingsModal'),
      setBlocklyLocale(lang)
    ]).then(() => {
      const preloadEnd = performance.now();
      console.log(`[App] Background pre-warming complete in ${(preloadEnd - preloadStart).toFixed(2)}ms.`);
    }).catch(err => {
      console.warn('[App] Pre-warming deferred or failed (non-critical):', err);
    });
  }, []);

  const themeClass = config.appearance?.theme === 'light' ? 'theme-light' : 'theme-dark';

  return (
    <div className={`h-screen w-screen flex flex-col bg-[#1e1e1e] text-slate-300 overflow-hidden ${themeClass}`}>
      {isInitializing ? (
        <LoadingOverlay />
      ) : (
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
            <AppContent />
          )}
        </div>
      )}
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
          </BuildProvider>
        </SerialProvider>
      </FileSystemProvider>
    </UIProvider>
  );
}

export default App;