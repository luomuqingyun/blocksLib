// ------------------------------------------------------------------
// Blockly 包装器组件 (Blockly Wrapper Component)
// ------------------------------------------------------------------
// 核心组件，负责初始化和管理 Blockly 工作区 (Workspace)。
// 包含主题定制、工具箱 (Toolbox) 配置、多语言支持以及代码生成集成。
// ------------------------------------------------------------------
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
// @ts-ignore
import * as Blockly from 'blockly';
import { CrossTabCopyPaste } from '@blockly/plugin-cross-tab-copy-paste';
import { CustomBackpack } from './blockly/CustomBackpack';
import { useTranslation } from 'react-i18next';
// import { createUseStyles } from 'react-jss'; // Removed
import { arduinoGenerator } from '../generators/arduino-base';
import { initAllModules, refreshBlockDefinitions } from '../modules/index';
import { PromptModal } from './PromptModal';
import { constructVariablesToolbox, constructTypesToolbox, constructToolsToolbox } from '../utils/variable_scanner';
import { validateBlock } from '../utils/block_validation';
import { initBlocklyPolyfills } from '../config/blockly-setup';
import { setBlocklyLocale } from '../locales/setupBlocklyLocales';
import { BoardRegistry } from '../registries/BoardRegistry';
import { DarkTheme, LightTheme, useBlocklyStyles } from './blockly/BlocklyTheme';
import { UnifiedSearch } from './blockly/UnifiedSearch';
import { useUI } from '../contexts/UIContext';

// Import custom hooks
import { useBlocklyShortcuts } from './blockly/hooks/useBlocklyShortcuts';
import { useWorkspacePersistence } from './blockly/hooks/useWorkspacePersistence';
import { useBlocklyDynamicToolbox } from './blockly/hooks/useBlocklyDynamicToolbox';
import { useBlocklyValidation } from './blockly/hooks/useBlocklyValidation';


// ------------------------------------------------------------------
// Initialize global setup
initAllModules();
initBlocklyPolyfills();

// ------------------------------------------------------------------
// Global Singleton Plugins
// ------------------------------------------------------------------
// Initialize once to avoid "already registered" errors during React remounts.
const copyPastePlugin = new CrossTabCopyPaste();
const initPlugins = () => {
  try {
    // Only init if not already registered (Check one known ID)
    if (!Blockly.ContextMenuRegistry.registry.getItem('blockCopyToStorage')) {
      copyPastePlugin.init({ contextMenu: true, shortcut: true });
    }
  } catch (e) {
    console.warn('[BlocklyWrapper] CrossTabCopyPaste already initialized or failed:', e);
  }
};
initPlugins();

interface BlocklyWrapperProps {
  onCodeChange: (code: string) => void;
  initialCode: string; // Not used but kept for prop compatibility or future
  initialXml?: string | null;
  onXmlLoaded?: () => void;
  onUiChange?: () => void; // Notify on scroll/zoom for view persistence
  onViewportChange?: (viewState: { scrollX: number; scrollY: number; scale: number }) => void;
  currentFilePath?: string | null;
  toolboxConfiguration: any;
  selectedBoard: string;
}

export interface BlocklyWrapperHandle {
  getXml: () => string;               // 获取工作区 XML/JSON 状态
  loadXml: (state: string) => void;   // 加载工作区状态
  resize: () => void;                 // 强制重绘/调整大小
  clear: () => void;                  // 清空工作区
}

// ------------------------------------------------------------------
// 主题定义 (Theme Definitions)
// ------------------------------------------------------------------
// Theme and Styles moved to ./blockly/BlocklyTheme.ts

// ------------------------------------------------------------------
// ------------------------------------------------------------------
// 组件定义 (Component Definition)
// ------------------------------------------------------------------
export const BlocklyWrapper = forwardRef<BlocklyWrapperHandle, BlocklyWrapperProps>((props, ref) => {
  useBlocklyStyles(); // Activate extracted styles
  const { onCodeChange, toolboxConfiguration, initialXml, onXmlLoaded, onUiChange } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);
  const validationTimer = useRef<NodeJS.Timeout | null>(null);
  const { showNotification, activeTab } = useUI();
  const { i18n } = useTranslation();

  const [searchMode, setSearchMode] = useState<'workspace' | 'toolbox'>('workspace');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isToolboxPinned, setIsToolboxPinned] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches ? DarkTheme : LightTheme);
  const [promptState, setPromptState] = useState<{ isOpen: boolean; message: string; defaultValue: string; callback: ((value: string | null) => void) | null; }>({ isOpen: false, message: '', defaultValue: '', callback: null });

  const onCodeChangeRef = useRef(onCodeChange);
  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  const [isLocaleLoaded, setIsLocaleLoaded] = useState(false);
  const [workspaceInstance, setWorkspaceInstance] = useState<any>(null);
  const [isReadyForEdits, setIsReadyForEdits] = useState(false);
  const isReadyForEditsRef = useRef(false);
  useEffect(() => { isReadyForEditsRef.current = isReadyForEdits; }, [isReadyForEdits]);

  const onViewportChangeRef = useRef(props.onViewportChange);
  useEffect(() => {
    onViewportChangeRef.current = props.onViewportChange;
  }, [props.onViewportChange]);

  // 1. Hook: Persistence
  const { loadWorkspaceState, saveWorkspaceState, attemptViewRestore, ensureDefaultBlocks, isDisposed } = useWorkspacePersistence(
    workspaceRef,
    props.currentFilePath,
    setIsReadyForEdits,
    props.onXmlLoaded
  );

  // 2. Hook: Dynamic Toolbox
  const { handleToolboxItemSelect, refreshDynamicFlyout, activeDynamicCategoryRef } = useBlocklyDynamicToolbox(
    workspaceRef,
    toolboxConfiguration
  );

  // 3. Hook: Shortcuts
  useBlocklyShortcuts(setSearchMode, setIsSearchVisible);

  // 4. Hook: Validation
  const { handleValidationEvent, runValidation } = useBlocklyValidation(
    workspaceRef,
    isReadyForEditsRef,
    refreshDynamicFlyout
  );



  useEffect(() => {
    if (props.selectedBoard) {
      const board = BoardRegistry.get(props.selectedBoard);
      if (board && board.family) {
        arduinoGenerator.setFamily(board.family);
        if (workspaceRef.current && isReadyForEdits) {
          const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
          onCodeChangeRef.current(code);
        }
      }
    }
  }, [props.selectedBoard, isReadyForEdits]);

  useEffect(() => {
    if (!i18n.language) return;
    const applyLocale = async () => {
      try {
        await setBlocklyLocale(i18n.language);
        refreshBlockDefinitions();
        setIsLocaleLoaded(true);
        // Redundant updateToolbox removed. toolboxConfiguration dependency 
        // in the other useEffect handles this more reliably.
      } catch (error) {
        console.error("Failed to apply locale:", error);
        setIsLocaleLoaded(true);
      }
    };
    applyLocale();
  }, [i18n.language, toolboxConfiguration]);

  const ensureDefaultBlocksLocal = ensureDefaultBlocks;

  useImperativeHandle(ref, () => ({
    getXml: saveWorkspaceState,
    loadXml: loadWorkspaceState,
    resize: () => { if (workspaceRef.current) Blockly.svgResize(workspaceRef.current); },
    clear: () => { if (workspaceRef.current) workspaceRef.current.clear(); }
  }));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? DarkTheme : LightTheme;
      setCurrentTheme(newTheme);
      if (workspaceRef.current) workspaceRef.current.setTheme(newTheme);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const isToolboxPinnedRef = useRef(isToolboxPinned);
  useEffect(() => {
    isToolboxPinnedRef.current = isToolboxPinned;
  }, [isToolboxPinned]);

  useEffect(() => {
    if (!workspaceRef.current) return;
    const toolbox = workspaceRef.current.getToolbox();
    const flyout = toolbox ? (toolbox.getFlyout() || workspaceRef.current.getFlyout()) : workspaceRef.current.getFlyout();
    if (!flyout) return;
    if (isToolboxPinned) {
      if (flyout && (flyout as any).autoClose !== undefined) (flyout as any).autoClose = false;
    } else {
      if (flyout && (flyout as any).autoClose !== undefined) {
        (flyout as any).autoClose = true;
        flyout.hide();
      }
    }
  }, [isToolboxPinned]);

  // Removed manual shortcut patching - handled by useBlocklyShortcuts

  useEffect(() => {
    Blockly.dialog.setPrompt((message: string, defaultValue: string, callback: (value: string | null) => void) => {
      setPromptState({ isOpen: true, message, defaultValue, callback });
    });

    if (!editorRef.current || workspaceRef.current || !isLocaleLoaded) return;

    console.log('[BlocklyWrapper] Injecting workspace (should only happen once per project)');
    workspaceRef.current = Blockly.inject(editorRef.current, {
      toolbox: toolboxConfiguration || { kind: 'categoryToolbox', contents: [] },
      theme: currentTheme,
      trashcan: true,
      // @ts-ignore
      contextMenu: true,
      move: { scrollbars: true, drag: true, wheel: false },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
      renderer: 'geras'
    });

    // Update state to trigger dependent hooks
    setWorkspaceInstance(workspaceRef.current);

    workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_VARIABLES', constructVariablesToolbox);

    workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_TYPES', constructTypesToolbox);
    workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_TOOLS', constructToolsToolbox);

    // copyPastePlugin.init moved to global scope to prevent duplicate registration

    // Workspace Search init moved to useBlocklySearch hook

    // Custom Backpack is handled by React component, no plugin init needed

    ensureDefaultBlocks();

    if (props.initialXml) {
      loadWorkspaceState(props.initialXml);
    } else {
      setIsReadyForEdits(true);
      if (props.onXmlLoaded) props.onXmlLoaded();
    }

    const onWorkspaceChange = (event: any) => {
      if (event.isUiEvent || !workspaceRef.current || !isReadyForEditsRef.current) return;
      if (event.workspaceId !== workspaceRef.current.id) return;
      if (event.type === Blockly.Events.FINISHED_LOADING) return;
      try {
        const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
        onCodeChangeRef.current(code);
      } catch (e) { console.error("Generation Error", e); }
    };
    workspaceRef.current.addChangeListener(onWorkspaceChange);

    const uiListener = (event: any) => {
      if (event.type === Blockly.Events.VIEWPORT_CHANGE) {
        if (onViewportChangeRef.current && isReadyForEditsRef.current) {
          onViewportChangeRef.current({
            scrollX: workspaceRef.current?.scrollX || 0,
            scrollY: workspaceRef.current?.scrollY || 0,
            scale: workspaceRef.current?.scale || 1
          });
        }
      }
    };
    workspaceRef.current.addChangeListener(uiListener);

    // Enforcement: Singleton Entry Root
    const singletonEnforcer = (event: any) => {
      if (!workspaceRef.current) return;

      // Target ALL block-related events that could lead to duplicates
      if (event.type === Blockly.Events.BLOCK_CREATE ||
        event.type === Blockly.Events.BLOCK_MOVE ||
        event.type === Blockly.Events.BLOCK_CHANGE) {

        const allEntryBlocks = workspaceRef.current.getBlocksByType('arduino_entry_root', false);
        if (allEntryBlocks.length > 1) {
          // Find the "newest" or "extra" one.
          // In a CREATE event, event.blockId is the culprit.
          const culprit = workspaceRef.current.getBlockById(event.blockId);

          if (culprit && culprit.type === 'arduino_entry_root' && !culprit.isFlyout && !culprit.isMutator) {
            // We have multiple, and the one that just changed/moved/created is an Entry Root.
            // We intercept it.
            console.warn("[BlocklyWrapper] Intercepting duplicate Entry Root:", culprit.id);

            // Immediate notification
            showNotification("入口积木（Entry Root）在项目中只能存在一个，已自动拦截重复项。", "error");

            // Dispose in next tick to avoid workspace update conflicts
            setTimeout(() => {
              if (culprit.workspace) culprit.dispose(false);
            }, 0);
          }
        }
      }
    };
    workspaceRef.current.addChangeListener(singletonEnforcer);

    workspaceRef.current.addChangeListener(handleToolboxItemSelect);

    workspaceRef.current.addChangeListener(handleValidationEvent);

    setTimeout(runValidation, 500);

    setTimeout(() => { Blockly.svgResize(workspaceRef.current); }, 100);

    let resizeTimer: any;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (workspaceRef.current) {
          Blockly.svgResize(workspaceRef.current);
          attemptViewRestore();
        }
      }, 50); // Small debounce for smoother dragging
    });
    if (editorRef.current) {
      observer.observe(editorRef.current);
    }

    return () => {
      observer.disconnect();
      isDisposed.current = true;
      if (validationTimer.current) clearTimeout(validationTimer.current);
      if (workspaceRef.current) {
        workspaceRef.current.removeChangeListener(onWorkspaceChange);
        workspaceRef.current.removeChangeListener(uiListener);
        workspaceRef.current.removeChangeListener(singletonEnforcer);
        workspaceRef.current.removeChangeListener(handleToolboxItemSelect);
        workspaceRef.current.removeChangeListener(handleValidationEvent);
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
    };
  }, [isLocaleLoaded]); // Removed initialXml and toolboxConfiguration to prevent injection loops

  useEffect(() => {
    if (workspaceRef.current && toolboxConfiguration) {
      workspaceRef.current.updateToolbox(toolboxConfiguration);
      workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_VARIABLES', constructVariablesToolbox);
      workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_TYPES', constructTypesToolbox);
      workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_TOOLS', constructToolsToolbox);
    }
  }, [toolboxConfiguration]);



  const handlePromptConfirm = (value: string) => {
    if (promptState.callback) promptState.callback(value);
    setPromptState(prev => ({ ...prev, isOpen: false, callback: null }));
  };
  const handlePromptClose = () => {
    if (promptState.callback) promptState.callback(null);
    setPromptState(prev => ({ ...prev, isOpen: false, callback: null }));
  };

  return (
    <div className="relative w-full h-full">
      <div ref={editorRef} className="w-full h-full bg-slate-50 dark:bg-slate-900" style={{ minHeight: '400px' }} />
      <button
        onClick={() => setIsToolboxPinned(!isToolboxPinned)}
        style={{ zIndex: 1000 }}
        className={`absolute bottom-8 left-4 p-3 rounded-full shadow-xl transition-all ${isToolboxPinned ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}
        title={isToolboxPinned ? (Blockly.Msg.ARD_WS_UNPIN || "Unpin Toolbox") : (Blockly.Msg.ARD_WS_PIN || "Pin Toolbox")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
        </svg>
      </button>

      <PromptModal isOpen={promptState.isOpen} title={promptState.message} defaultValue={promptState.defaultValue} onConfirm={handlePromptConfirm} onClose={handlePromptClose} />
      <UnifiedSearch
        workspace={workspaceInstance}
        isVisible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
        initialMode={searchMode}
      />
      <CustomBackpack workspace={workspaceInstance} />
    </div>
  );
});

BlocklyWrapper.displayName = 'BlocklyWrapper';