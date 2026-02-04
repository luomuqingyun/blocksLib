/**
 * ============================================================
 * Blockly 包装器组件 (Blockly Wrapper Component)
 * ============================================================
 * 
 * 核心组件，负责初始化和管理 Blockly 工作区 (Workspace)。
 * 
 * 核心功能:
 * - Blockly 工作区的创建和配置
 * - 主题定制 (深色/浅色自动切换)
 * - 工具箱 (Toolbox) 动态配置和分类回调
 * - 多语言支持 (i18n)
 * - 代码生成集成 (Arduino Generator)
 * - 工作区状态持久化 (XML/JSON)
 * - 积木块验证和错误提示
 * 
 * 暴露的方法 (通过 ref):
 * - getXml(): 获取工作区状态
 * - loadXml(): 加载工作区状态
 * - resize(): 强制调整大小
 * - clear(): 清空工作区
 * 
 * @file src/components/BlocklyWrapper.tsx
 * @module EmbedBlocks/Frontend/Components
 */
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback, memo } from 'react';
// @ts-ignore
import * as Blockly from 'blockly';
import { CustomBackpack } from './blockly/CustomBackpack';
import { useTranslation } from 'react-i18next';
// import { createUseStyles } from 'react-jss'; // Removed
import { arduinoGenerator } from '../generators/arduino-base';
import { initAllModules, refreshBlockDefinitions } from '../modules/index';
import { PromptModal } from './PromptModal';
import { constructVariablesToolbox, constructTypesToolbox, constructToolsToolbox } from '../utils/toolbox/ToolboxConstructor';
import { validateBlock } from '../utils/block_validation';

import { setBlocklyLocale } from '../locales/setupBlocklyLocales';
import { BoardRegistry } from '../registries/BoardRegistry';
import { DarkTheme, LightTheme, useBlocklyStyles } from './blockly/BlocklyTheme';
import { UnifiedSearch } from './blockly/UnifiedSearch';
import { useUI } from '../contexts/UIContext';
import { AppInitializer } from '../services/AppInitializer';

// Import custom hooks
import { useBlocklyShortcuts } from './blockly/hooks/useBlocklyShortcuts';
import { useWorkspacePersistence } from './blockly/hooks/useWorkspacePersistence';
import { useBlocklyDynamicToolbox } from './blockly/hooks/useBlocklyDynamicToolbox';
import { useBlocklyValidation } from './blockly/hooks/useBlocklyValidation';


// ------------------------------------------------------------------
// 全局初始化设置
// ------------------------------------------------------------------
// 移至 AppInitializer 处理

/** 组件属性定义 */
interface BlocklyWrapperProps {
  /** 代码变更回调 */
  onCodeChange: (code: string) => void;
  /** 初始代码 (保留以兼容旧代码) */
  initialCode: string;
  /** 初始工作区状态 (XML/JSON 字符串) */
  initialXml?: string | null;
  /** XML 加载完成回调 */
  onXmlLoaded?: () => void;
  /** UI 变更回调 (如缩放、平移) */
  onUiChange?: () => void;
  /** 视口变更回调 (用于视图持久化) */
  onViewportChange?: (viewState: { scrollX: number; scrollY: number; scale: number }) => void;
  /** 当前打开的文件路径 */
  currentFilePath?: string | null;
  /** 工具箱配置数据 */
  toolboxConfiguration: any;
  /** 当前选中的开发板 ID */
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
// 组件定义 (Component Definition)
// ------------------------------------------------------------------
export const BlocklyWrapper = memo(forwardRef<BlocklyWrapperHandle, BlocklyWrapperProps>((props, ref) => {
  // 激活提取出的主题样式
  useBlocklyStyles();
  const { onCodeChange, toolboxConfiguration, initialXml, onXmlLoaded, onUiChange } = props;
  // Blockly DOM 容器引用
  const editorRef = useRef<HTMLDivElement>(null);
  // Blockly 工作区实例引用
  const workspaceRef = useRef<any>(null);
  // 验证延迟计时器引用
  const validationTimer = useRef<NodeJS.Timeout | null>(null);
  // 追踪 initialXml 是否已加载
  const initialXmlLoadedRef = useRef(false);
  // 防止重复注入工作区
  const hasInjectedRef = useRef(false);
  // UI 上下文
  const { showNotification, activeTab } = useUI();
  // 多语言翻译
  const { i18n } = useTranslation();

  // --- 内部状态 ---
  /** 搜索模式: 工作区 或 工具箱 */
  const [searchMode, setSearchMode] = useState<'workspace' | 'toolbox'>('workspace');
  /** 是否显示统一搜索 */
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  /** 是否钉住工具箱 (不自动关闭) */
  const [isToolboxPinned, setIsToolboxPinned] = useState(false);
  /** 当前主题 (跟随系统或切换) */
  const [currentTheme, setCurrentTheme] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches ? DarkTheme : LightTheme);
  /** 变量/积木块重命名弹窗状态 */
  const [promptState, setPromptState] = useState<{ isOpen: boolean; message: string; defaultValue: string; callback: ((value: string | null) => void) | null; }>({ isOpen: false, message: '', defaultValue: '', callback: null });

  /** 代码变更回调引用 (同步到 Ref 避免 Effect 频繁依赖) */
  const onCodeChangeRef = useRef(onCodeChange);
  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  /** 活跃标签页引用 */
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  /** 语言包加载状态 */
  const [isLocaleLoaded, setIsLocaleLoaded] = useState(false);
  /** 工作区实例状态 (用于传递给子组件) */
  const [workspaceInstance, setWorkspaceInstance] = useState<any>(null);
  /** 是否准备好接受编辑 (加载项目完成后) */
  const [isReadyForEdits, setIsReadyForEdits] = useState(false);
  /** 注册表版本 (用于触发依赖于 BoardRegistry 的 Effect) */
  const [registryVersion, setRegistryVersion] = useState(0);

  // 监听注册表变更
  useEffect(() => {
    return BoardRegistry.subscribe(() => {
      console.log('[BlocklyWrapper] BoardRegistry updated, refreshing definitions...');
      refreshBlockDefinitions();
      setRegistryVersion(v => v + 1);
    });
  }, []);
  // 组件挂载时执行全局初始化
  useEffect(() => {
    AppInitializer.initialize();
  }, []);

  const isReadyForEditsRef = useRef(false);
  useEffect(() => { isReadyForEditsRef.current = isReadyForEdits; }, [isReadyForEdits]);

  const onViewportChangeRef = useRef(props.onViewportChange);
  useEffect(() => {
    onViewportChangeRef.current = props.onViewportChange;
  }, [props.onViewportChange]);

  // --- 性能优化与状态追踪 Refs (移至顶层以符合 Hook 规则) ---
  const codeGenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const wasEditingRef = useRef(false);

  /**
   * 执行代码生成的函数 (Helper)
   */
  const triggerCodeGeneration = useCallback(() => {
    try {
      if (!workspaceRef.current) return;
      const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
      onCodeChangeRef.current(code);
    } catch (e) {
      console.error("[BlocklyWrapper] 代码生成错误:", e);
    }
  }, [workspaceRef]);

  // 1. Hook: 工作区持久化 (加载/保存 XML/JSON)
  const { loadWorkspaceState, saveWorkspaceState, attemptViewRestore, ensureDefaultBlocks, isDisposed } = useWorkspacePersistence(
    workspaceRef,
    props.currentFilePath,
    setIsReadyForEdits,
    props.onXmlLoaded
  );

  // 2. Hook: 动态工具箱 (管理 ARDUINO_VARIABLES 等特殊分类)
  const { handleToolboxItemSelect, refreshDynamicFlyout, activeDynamicCategoryRef } = useBlocklyDynamicToolbox(
    workspaceRef,
    toolboxConfiguration
  );

  // 3. Hook: 快捷键处理 (绑定搜索等快捷键)
  useBlocklyShortcuts(setSearchMode, setIsSearchVisible);

  // 4. Hook: 积木块验证 (实时检查错误并刷新飞出栏)
  const { handleValidationEvent, runValidation } = useBlocklyValidation(
    workspaceRef,
    isReadyForEditsRef,
    refreshDynamicFlyout
  );



  // ========== Effect: 开发板同步 ==========
  useEffect(() => {
    if (props.selectedBoard) {
      const board = BoardRegistry.get(props.selectedBoard);
      if (board && board.family) {
        console.log(`[BlocklyWrapper] Board synced: ${board.id} (${board.family})`);
        // 同步当前开发板到注册表，供积木块逻辑访问底层配置
        BoardRegistry.setCurrentBoard(board.id);
        // 设置代码生成器的家族类型
        arduinoGenerator.setFamily(board.family);
        // 如果工作区已就绪，立即触发重绘代码
        if (workspaceRef.current && isReadyForEditsRef.current) {
          const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
          onCodeChangeRef.current(code);
        }
      } else {
        console.warn(`[BlocklyWrapper] Board not found in registry yet: ${props.selectedBoard}`);
      }
    }
  }, [props.selectedBoard, isReadyForEdits, registryVersion]);

  // ========== Effect: 多语言加载 ==========
  useEffect(() => {
    if (!i18n.language) return;
    const applyLocale = async () => {
      try {
        // 配置 Blockly 的本地化字符串
        await setBlocklyLocale(i18n.language);
        // 刷新积木定义 (因为部分积木文本是动态生成的)
        refreshBlockDefinitions();
        setIsLocaleLoaded(true);
      } catch (error) {
        console.error("无法加载语言包:", error);
        setIsLocaleLoaded(true);
      }
    };
    applyLocale();
  }, [i18n.language, toolboxConfiguration]);

  const ensureDefaultBlocksLocal = ensureDefaultBlocks;

  // ========== 暴露方法给外部 ==========
  useImperativeHandle(ref, () => ({
    getXml: saveWorkspaceState,
    loadXml: loadWorkspaceState,
    resize: () => { if (workspaceRef.current) Blockly.svgResize(workspaceRef.current); },
    clear: () => { if (workspaceRef.current) workspaceRef.current.clear(); }
  }));

  // ========== Effect: 系统主题同步 ==========
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

  // ========== Effect: 工具箱钉住逻辑 ==========
  useEffect(() => {
    if (!workspaceRef.current) return;
    const toolbox = workspaceRef.current.getToolbox();
    const flyout = toolbox ? (toolbox.getFlyout() || workspaceRef.current.getFlyout()) : workspaceRef.current.getFlyout();
    if (!flyout) return;
    if (isToolboxPinned) {
      // 钉住：关闭自动隐藏
      if (flyout && (flyout as any).autoClose !== undefined) (flyout as any).autoClose = false;
    } else {
      // 不钉住：开启自动隐藏并立即隐藏
      if (flyout && (flyout as any).autoClose !== undefined) {
        (flyout as any).autoClose = true;
        flyout.hide();
      }
    }
  }, [isToolboxPinned]);

  // Removed manual shortcut patching - handled by useBlocklyShortcuts

  // ========== Effect: 核心初始化 (Blockly 注入与事件绑定) ==========
  useEffect(() => {
    // 设置自定义提示对话框代理
    Blockly.dialog.setPrompt((message: string, defaultValue: string, callback: (value: string | null) => void) => {
      setPromptState({ isOpen: true, message, defaultValue, callback });
    });

    if (!editorRef.current || workspaceRef.current || !isLocaleLoaded || hasInjectedRef.current) return;
    hasInjectedRef.current = true; // 标记已注入，防止重复操作

    console.log('[BlocklyWrapper] 注入工作区 (每个项目只应发生一次)');
    workspaceRef.current = Blockly.inject(editorRef.current, {
      toolbox: toolboxConfiguration || { kind: 'categoryToolbox', contents: [] },
      theme: currentTheme,
      media: 'media/blockly/', // 使用本地媒体资源，避免 CSP 违规并支持离线
      trashcan: true, // 垃圾桶
      // @ts-ignore
      contextMenu: true, // 右键菜单
      move: { scrollbars: true, drag: true, wheel: false },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
      renderer: 'geras'
    });

    // 更新实例状态以触发依赖 Hook
    setWorkspaceInstance(workspaceRef.current);

    // 注册工具箱分类回调
    workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_VARIABLES', constructVariablesToolbox);
    workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_TYPES', constructTypesToolbox);
    workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_TOOLS', constructToolsToolbox);

    // copyPastePlugin.init moved to global scope to prevent duplicate registration

    // Workspace Search init moved to useBlocklySearch hook

    // Custom Backpack is handled by React component, no plugin init needed

    // 确保有基本的入口积木 (void setup/loop)
    ensureDefaultBlocks();

    if (props.initialXml) {
      console.log('[BlocklyWrapper] 检测到 initialXml，正在加载工作区状态...');
      loadWorkspaceState(props.initialXml);
      initialXmlLoadedRef.current = true;
    } else {
      console.log('[BlocklyWrapper] 无 initialXml (新项目)，设置准备就绪并触发代码生成...');
      setIsReadyForEdits(true);
      if (props.onXmlLoaded) props.onXmlLoaded();
      // [FIX] 对于没有 initialXml 的新项目，延迟触发初始代码生成
      // 避免 useEffect 在就绪前运行导致空代码
      setTimeout(() => {
        if (workspaceRef.current) {
          try {
            console.log('[BlocklyWrapper] 生成初始代码...');
            const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
            onCodeChangeRef.current(code);
          } catch (e) {
            console.error("[BlocklyWrapper] 初始代码生成失败:", e);
          }
        }
      }, 100);
    }

    const onWorkspaceChange = (event: any) => {
      // 1. 过滤由于加载或初始化产生的事件
      if (!workspaceRef.current || !isReadyForEditsRef.current) return;
      if (event.workspaceId !== workspaceRef.current.id) return;
      if (event.type === Blockly.Events.FINISHED_LOADING) return;

      // 2. 状态感知：处理拖拽事件
      if (event.type === Blockly.Events.BLOCK_DRAG) {
        if (event.isStart) {
          isDraggingRef.current = true;
          if (codeGenTimerRef.current) clearTimeout(codeGenTimerRef.current);
          return;
        } else {
          isDraggingRef.current = false;
          if (codeGenTimerRef.current) clearTimeout(codeGenTimerRef.current);
          triggerCodeGeneration();
          return;
        }
      }

      // 3. 状态感知：处理输入状态 (Field Editing)
      // 判断当前是否有积木块的输入框、下拉菜单处于打开状态
      const isEditing = !!(Blockly.WidgetDiv.isVisible() || Blockly.DropDownDiv.isVisible());

      // 如果刚才在输入，现在刚退出，则立即触发一次更新 (Bypass Debounce)
      if (wasEditingRef.current && !isEditing) {
        console.log('[BlocklyWrapper] 退出编辑状态，立即触发代码生成');
        wasEditingRef.current = false;
        if (codeGenTimerRef.current) clearTimeout(codeGenTimerRef.current);
        triggerCodeGeneration();
        return;
      }

      // 记录当前编辑状态
      wasEditingRef.current = isEditing;

      // 4. 过滤非必要的 UI 事件 (如点击选择，但不包括上述状态切换)
      if (event.isUiEvent) return;

      // 5. 如果正在拖拽中，忽略后续产生的中间事件
      if (isDraggingRef.current) return;

      // 6. 执行防抖更新
      if (codeGenTimerRef.current) clearTimeout(codeGenTimerRef.current);

      // 智能分时：
      // - 正在输入时：使用适中延迟 (800ms)，避免打字卡顿的同时保证反馈流畅
      // - 非输入状态：使用常规延迟 (300ms)，保证操作反馈迅速
      const delay = isEditing ? 800 : 300;
      codeGenTimerRef.current = setTimeout(triggerCodeGeneration, delay);
    };
    workspaceRef.current.addChangeListener(onWorkspaceChange);

    /**
     * UI 变更监听 (缩放/平移)
     */
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

    /**
     * 单例强制约束: 确保项目中只有一个主入口积木
     */
    const singletonEnforcer = (event: any) => {
      if (!workspaceRef.current) return;

      // 监听可能产生副本的事件
      if (event.type === Blockly.Events.BLOCK_CREATE ||
        event.type === Blockly.Events.BLOCK_MOVE ||
        event.type === Blockly.Events.BLOCK_CHANGE) {

        const allEntryBlocks = workspaceRef.current.getBlocksByType('arduino_entry_root', false);
        if (allEntryBlocks.length > 1) {
          // 找到导致冲突的积木实例
          const culprit = workspaceRef.current.getBlockById(event.blockId);

          if (culprit && culprit.type === 'arduino_entry_root' && !culprit.isFlyout && !culprit.isMutator) {
            console.warn("[BlocklyWrapper] 拦截到重复的入口积木:", culprit.id);

            // 立即弹出通知
            showNotification("入口积木（Entry Root）在项目中只能存在一个，已自动拦截重复项。", "error");

            // 在下一周期销毁，避免冲突
            setTimeout(() => {
              if (culprit.workspace) culprit.dispose(false);
            }, 0);
          }
        }
      }
    };
    workspaceRef.current.addChangeListener(singletonEnforcer);

    // 绑定其他分类回调和监听器
    workspaceRef.current.addChangeListener(handleToolboxItemSelect);
    workspaceRef.current.addChangeListener(handleValidationEvent);

    // 延迟运行初始验证
    setTimeout(runValidation, 500);

    // 初始调整大小
    setTimeout(() => { Blockly.svgResize(workspaceRef.current); }, 100);

    // 创建 ResizeObserver 监听容器大小变化，自动调整工作区
    let resizeTimer: any;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (workspaceRef.current) {
          Blockly.svgResize(workspaceRef.current);
          attemptViewRestore();
        }
      }, 50); // 防抖处理
    });
    if (editorRef.current) {
      observer.observe(editorRef.current);
    }

    // ========== 清理逻辑 ==========
    return () => {
      observer.disconnect();
      isDisposed.current = true;
      if (validationTimer.current) clearTimeout(validationTimer.current);
      if (codeGenTimerRef.current) clearTimeout(codeGenTimerRef.current);
      if (workspaceRef.current) {
        // 移除所有监听器并销毁工作区
        workspaceRef.current.removeChangeListener(onWorkspaceChange);
        workspaceRef.current.removeChangeListener(uiListener);
        workspaceRef.current.removeChangeListener(singletonEnforcer);
        workspaceRef.current.removeChangeListener(handleToolboxItemSelect);
        workspaceRef.current.removeChangeListener(handleValidationEvent);
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
      hasInjectedRef.current = false;
    };
  }, [isLocaleLoaded]); // Removed initialXml and toolboxConfiguration to prevent injection loops

  // ========== Effect: 动态更新工具箱 ==========
  useEffect(() => {
    if (workspaceRef.current && toolboxConfiguration) {
      workspaceRef.current.updateToolbox(toolboxConfiguration);
      // 重新注册回调，因为 updateToolbox 可能会重置分类
      workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_VARIABLES', constructVariablesToolbox);
      workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_TYPES', constructTypesToolbox);
      workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_TOOLS', constructToolsToolbox);
    }
  }, [toolboxConfiguration]);

  // ========== Effect: 处理延迟的 initialXml 更新 ==========
  // 修复在某些情况下 initialXml 在挂载后才到达的问题
  useEffect(() => {
    if (workspaceRef.current && props.initialXml && isReadyForEdits && !initialXmlLoadedRef.current) {
      console.log('[BlocklyWrapper] 检测到延迟的 initialXml，正在加载...', props.initialXml?.substring(0, 100));
      loadWorkspaceState(props.initialXml);
      initialXmlLoadedRef.current = true;

      // 加载后触发代码生成
      setTimeout(() => {
        if (workspaceRef.current) {
          try {
            const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
            onCodeChangeRef.current(code);
          } catch (e) {
            console.error("[BlocklyWrapper] 延迟代码生成失败:", e);
          }
        }
      }, 200);
    }
  }, [props.initialXml, isReadyForEdits, loadWorkspaceState]);

  // 当文件路径变化时重置标记 (视为新项目界面加载)
  useEffect(() => {
    initialXmlLoadedRef.current = false;
  }, [props.currentFilePath]);


  /** 处理重命名对话框确认 */
  const handlePromptConfirm = (value: string) => {
    if (promptState.callback) promptState.callback(value);
    setPromptState(prev => ({ ...prev, isOpen: false, callback: null }));
  };
  /** 处理重命名对话框取消 */
  const handlePromptClose = () => {
    if (promptState.callback) promptState.callback(null);
    setPromptState(prev => ({ ...prev, isOpen: false, callback: null }));
  };

  // ========== 渲染组件界面 ==========
  return (
    <div className="relative w-full h-full">
      {/* Blockly 编辑器挂载容器 */}
      <div ref={editorRef} className="w-full h-full bg-slate-50 dark:bg-slate-900" style={{ minHeight: '400px' }} />

      {/* 钉住工具箱悬浮按钮 */}
      <button
        onClick={() => setIsToolboxPinned(!isToolboxPinned)}
        style={{ zIndex: 1000 }}
        className={`absolute bottom-8 left-4 p-3 rounded-full shadow-xl transition-all ${isToolboxPinned ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}
        title={isToolboxPinned ? (Blockly.Msg.ARD_WS_UNPIN || "取消钉住工具箱") : (Blockly.Msg.ARD_WS_PIN || "钉住工具箱")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
        </svg>
      </button>

      {/* 变量/积木重命名模态框 */}
      <PromptModal isOpen={promptState.isOpen} title={promptState.message} defaultValue={promptState.defaultValue} onConfirm={handlePromptConfirm} onClose={handlePromptClose} />

      {/* 统一搜索组件 (工作区搜索/工具箱搜索) */}
      <UnifiedSearch
        workspace={workspaceInstance}
        isVisible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
        initialMode={searchMode}
      />

      {/* 自定义背包组件 */}
      <CustomBackpack workspace={workspaceInstance} />
    </div>
  );
}));

BlocklyWrapper.displayName = 'BlocklyWrapper';