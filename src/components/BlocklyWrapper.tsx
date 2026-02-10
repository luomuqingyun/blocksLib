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
// import { Focus } from 'lucide-react';
// import { createUseStyles } from 'react-jss'; // Removed
import { arduinoGenerator } from '../generators/arduino-base';
import { initAllModules, refreshBlockDefinitions } from '../modules/index';
import { PromptModal } from './PromptModal';
import { constructVariablesToolbox, constructTypesToolbox, constructToolsToolbox } from '../utils/toolbox/ToolboxConstructor';
import { validateBlock } from '../utils/block_validation';
import { ConfirmModal } from './ConfirmModal';

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
import { useBuild } from '../contexts/BuildContext';


// ------------------------------------------------------------------
// 全局初始化设置
// ------------------------------------------------------------------
// 移至 AppInitializer 处理

/** 组件属性定义 */
interface BlocklyWrapperProps {
  /** 代码变更回调 */
  onCodeChange: (code: string) => void;
  /** [NEW] 模型结构变更回调 (用于脏检查) */
  onModelChange?: () => void;
  /** 初始代码 (保留以兼容旧代码) */
  initialCode: string;
  /** 初始工作区状态 (XML/JSON 字符串) */
  initialXml?: string | null;
  /** XML 加载完成回调 */
  onXmlLoaded?: () => void;
  /** UI 变更回调 (如缩放、平移) */
  onUiChange?: () => void;
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
  centerOnBlocks: () => void;         // 将积木居中
  resetCentering: () => void;         // 重置对齐标志位 (用于切换项目)
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
  const { onCodeChange, onModelChange, toolboxConfiguration, initialXml, onXmlLoaded, onUiChange } = props;
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
  // 全局配置 (用于同步外观设置)
  const { config } = useBuild();

  // --- 内部状态 ---
  /** 搜索模式: 工作区 或 工具箱 */
  const [searchMode, setSearchMode] = useState<'workspace' | 'toolbox'>('workspace');
  /** 是否显示统一搜索 */
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  /** 是否钉住工具箱 (不自动关闭) */
  const [isToolboxPinned, setIsToolboxPinned] = useState(false);
  /** 当前主题 (根据配置智能初始化，防止闪屏) */
  const [currentTheme, setCurrentTheme] = useState(() => {
    return config.appearance?.theme === 'light' ? LightTheme : DarkTheme;
  });
  /** 变量/积木块重命名弹窗状态 */
  const [promptState, setPromptState] = useState<{ isOpen: boolean; message: string; defaultValue: string; callback: ((value: string | null) => void) | null; }>({ isOpen: false, message: '', defaultValue: '', callback: null });
  /** 确认弹窗状态 */
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: (() => void) | null; onCancel: (() => void) | null; type?: 'danger' | 'warning' | 'info'; }>({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });

  /** 代码变更回调引用 (同步到 Ref 避免 Effect 频繁依赖) */
  const onCodeChangeRef = useRef(onCodeChange);
  const onModelChangeRef = useRef(onModelChange);
  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
    onModelChangeRef.current = onModelChange;
  }, [onCodeChange, onModelChange]);

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
  /** [NEW] 是否内部加载中 (Blockly 注入过程) */
  const [isInjecting, setIsInjecting] = useState(false);

  // 监听配置变更或工作区就绪，以同步外观设置
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    // 1. 同步主题
    const targetTheme = config.appearance?.theme === 'light' ? LightTheme : DarkTheme;
    if (workspace.getTheme().name !== targetTheme.name) {
      console.log(`[BlocklyWrapper] Switching theme to: ${targetTheme.name}`);
      setCurrentTheme(targetTheme);
      workspace.setTheme(targetTheme);
    }

    // 2. 同步栅格显示与颜色
    const showGrid = config.appearance?.showGrid !== false;
    const grid = workspace.getGrid();
    if (grid) {
      const targetSpacing = showGrid ? 20 : 0;
      const gridColour = targetTheme.getComponentStyle('gridColour') || '#FF0000';

      workspace.options.gridOptions.spacing = targetSpacing;
      workspace.options.gridOptions.enabled = showGrid;
      workspace.options.gridOptions.colour = gridColour;

      if (!(grid as any)._isPatched) {
        const originalUpdate = grid.update;
        grid.update = function (scale: number) {
          this.spacing_ = workspace.options.gridOptions.spacing;
          this.colour_ = workspace.options.gridOptions.colour;
          originalUpdate.call(this, scale);
        };
        (grid as any)._isPatched = true;
      }

      if (typeof grid.setSpacing === 'function') {
        grid.setSpacing(targetSpacing);
      }
      grid.update(workspace.scale);
      Blockly.svgResize(workspace);
    }
  }, [workspaceInstance, config.appearance?.theme, config.appearance?.showGrid]);

  // 监听注册表变更
  useEffect(() => {
    return BoardRegistry.subscribe(() => {
      refreshBlockDefinitions();
      setRegistryVersion(v => v + 1);
    });
  }, []);

  const isReadyForEditsRef = useRef(false);
  useEffect(() => { isReadyForEditsRef.current = isReadyForEdits; }, [isReadyForEdits]);

  const onUiChangeRef = useRef(onUiChange);
  useEffect(() => {
    onUiChangeRef.current = onUiChange;
  }, [onUiChange]);

  const attemptViewRestoreRef = useRef<any>(null);
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

  // 1. Hook: 工作区持久化
  const { loadWorkspaceState, saveWorkspaceState, attemptViewRestore, ensureDefaultBlocks, centerOnBlocks, resetCentering, isDisposed } = useWorkspacePersistence(
    workspaceRef,
    props.currentFilePath,
    (ready) => {
      setIsReadyForEdits(ready);
      if (ready) setIsInjecting(false);
    },
    props.onXmlLoaded
  );

  // 2. Hook: 动态工具箱
  const { handleToolboxItemSelect, refreshDynamicFlyout, activeDynamicCategoryRef } = useBlocklyDynamicToolbox(
    workspaceRef,
    toolboxConfiguration
  );

  // 3. Hook: 快捷键处理
  useBlocklyShortcuts(setSearchMode, setIsSearchVisible);

  // 4. Hook: 积木块验证
  const { handleValidationEvent, runValidation } = useBlocklyValidation(
    workspaceRef,
    isReadyForEditsRef,
    refreshDynamicFlyout
  );

  useEffect(() => { attemptViewRestoreRef.current = attemptViewRestore; }, [attemptViewRestore]);

  // ========== Effect: 开发板同步 ==========
  useEffect(() => {
    if (props.selectedBoard) {
      const board = BoardRegistry.get(props.selectedBoard);
      if (board && board.family) {
        BoardRegistry.setCurrentBoard(board.id);
        arduinoGenerator.setFamily(board.family);
        if (workspaceRef.current && isReadyForEditsRef.current) {
          const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
          onCodeChangeRef.current(code);
        }
      }
    }
  }, [props.selectedBoard, isReadyForEdits, registryVersion]);

  // ========== Effect: 多语言加载 ==========
  useEffect(() => {
    if (!i18n.language) return;
    const applyLocale = async () => {
      try {
        await setBlocklyLocale(i18n.language);
        refreshBlockDefinitions();
        setIsLocaleLoaded(true);
      } catch (error) {
        setIsLocaleLoaded(true);
      }
    };
    applyLocale();
  }, [i18n.language, toolboxConfiguration]);

  // ========== 暴露方法给外部 ==========
  useImperativeHandle(ref, () => ({
    getXml: saveWorkspaceState,
    loadXml: loadWorkspaceState,
    resize: () => { if (workspaceRef.current) Blockly.svgResize(workspaceRef.current); },
    clear: () => { if (workspaceRef.current) workspaceRef.current.clear(); },
    centerOnBlocks: centerOnBlocks,
    resetCentering: resetCentering
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
      if (flyout && (flyout as any).autoClose !== undefined) (flyout as any).autoClose = false;
    } else {
      if (flyout && (flyout as any).autoClose !== undefined) {
        (flyout as any).autoClose = true;
        flyout.hide();
      }
    }
  }, [isToolboxPinned]);

  // ========== Effect: 核心初始化 (Blockly 注入与事件绑定) ==========
  useEffect(() => {
    // 设置自定义提示对话框代理
    Blockly.dialog.setPrompt((message: string, defaultValue: string, callback: (value: string | null) => void) => {
      setPromptState({ isOpen: true, message, defaultValue, callback });
    });

    // 设置自定义确认对话框代理
    Blockly.dialog.setConfirm((message: string, callback: (confirmed: boolean) => void) => {
      setConfirmState({
        isOpen: true,
        title: Blockly.Msg.ARD_SYS_CONFIRM || "Confirm",
        message: message,
        onConfirm: () => {
          callback(true);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          callback(false);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      });
    });

    if (!editorRef.current || workspaceRef.current || !isLocaleLoaded || hasInjectedRef.current) return;
    hasInjectedRef.current = true; // 标记已注入，防止重复操作

    console.log('[BlocklyWrapper] 注入工作区 (每个项目只应发生一次)');
    setIsInjecting(true);

    const initialShowGrid = config.appearance?.showGrid !== false;
    const initialGridColour = (currentTheme as any).getComponentStyle ? currentTheme.getComponentStyle('gridColour') : '#475569';

    workspaceRef.current = Blockly.inject(editorRef.current, {
      toolbox: toolboxConfiguration || { kind: 'categoryToolbox', contents: [] },
      theme: currentTheme,
      media: 'media/blockly/',
      trashcan: true,
      // @ts-ignore
      contextMenu: true,
      move: { scrollbars: true, drag: true, wheel: false },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 4.0, minScale: 0.2, scaleSpeed: 1.1 },
      grid: {
        spacing: initialShowGrid ? 20 : 0,
        length: 1,
        colour: initialGridColour,
        snap: true
      },
      renderer: 'geras'
    });

    setWorkspaceInstance(workspaceRef.current);

    workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_VARIABLES', constructVariablesToolbox);
    workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_TYPES', constructTypesToolbox);
    workspaceRef.current.registerToolboxCategoryCallback('ARDUINO_TOOLS', constructToolsToolbox);

    ensureDefaultBlocks();

    if (props.initialXml) {
      loadWorkspaceState(props.initialXml);
      initialXmlLoadedRef.current = true;
    } else {
      setIsReadyForEdits(true);
      setIsInjecting(false);
      if (props.onXmlLoaded) props.onXmlLoaded();
      setTimeout(() => {
        if (workspaceRef.current) {
          try {
            const code = arduinoGenerator.workspaceToCode(workspaceRef.current);
            onCodeChangeRef.current(code);
          } catch (e) {
            console.error("[BlocklyWrapper] 初始代码生成失败:", e);
          }
        }
      }, 100);
    }

    const onWorkspaceChange = (event: any) => {
      if (!workspaceRef.current || !isReadyForEditsRef.current) return;
      if (event.workspaceId !== workspaceRef.current.id) return;
      if (event.type === Blockly.Events.FINISHED_LOADING) return;

      const structuralEvents = [
        Blockly.Events.BLOCK_CREATE,
        Blockly.Events.BLOCK_DELETE,
        Blockly.Events.BLOCK_MOVE,
        Blockly.Events.BLOCK_CHANGE,
        Blockly.Events.VAR_CREATE,
        Blockly.Events.VAR_DELETE,
        Blockly.Events.VAR_RENAME,
        Blockly.Events.COMMENT_CREATE,
        Blockly.Events.COMMENT_DELETE,
        Blockly.Events.COMMENT_CHANGE
      ];

      if (structuralEvents.includes(event.type)) {
        if (onModelChangeRef.current) {
          onModelChangeRef.current();
        }
      }

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

      const isEditing = !!(Blockly.WidgetDiv.isVisible() || Blockly.DropDownDiv.isVisible());

      if (wasEditingRef.current && !isEditing) {
        wasEditingRef.current = false;
        if (codeGenTimerRef.current) clearTimeout(codeGenTimerRef.current);
        triggerCodeGeneration();
        return;
      }

      wasEditingRef.current = isEditing;

      if (event.isUiEvent) return;
      if (isDraggingRef.current) return;
      if (codeGenTimerRef.current) clearTimeout(codeGenTimerRef.current);

      const delay = isEditing ? 800 : 300;
      codeGenTimerRef.current = setTimeout(triggerCodeGeneration, delay);
    };
    workspaceRef.current.addChangeListener(onWorkspaceChange);

    const uiListener = (event: any) => {
      const uiEvents = [
        Blockly.Events.SELECTED,
        Blockly.Events.CLICK,
        Blockly.Events.BUBBLE_OPEN,
        Blockly.Events.TRASHCAN_OPEN,
        Blockly.Events.TOOLBOX_ITEM_SELECT,
        Blockly.Events.THEME_CHANGE
      ];

      if (uiEvents.includes(event.type) || event.type === Blockly.Events.UI) {
        if (onUiChangeRef.current) {
          onUiChangeRef.current();
        }
      }
    };
    workspaceRef.current.addChangeListener(uiListener);

    const singletonEnforcer = (event: any) => {
      if (!workspaceRef.current) return;
      if (event.type === Blockly.Events.BLOCK_CREATE ||
        event.type === Blockly.Events.BLOCK_MOVE ||
        event.type === Blockly.Events.BLOCK_CHANGE) {
        const allEntryBlocks = workspaceRef.current.getBlocksByType('arduino_entry_root', false);
        if (allEntryBlocks.length > 1) {
          const culprit = workspaceRef.current.getBlockById(event.blockId);
          if (culprit && culprit.type === 'arduino_entry_root' && !culprit.isFlyout && !culprit.isMutator) {
            showNotification("入口积木（Entry Root）在项目中只能存在一个，已自动拦截重复项。", "error");
            setTimeout(() => {
              if (culprit.workspace) culprit.dispose(false);
            }, 0);
          }
        }
      }
    };
    workspaceRef.current.addChangeListener(singletonEnforcer);

    // [NEW] 入口积木删除保护：拦截删除事件并弹出确认
    const deletionGuarantor = (event: any) => {
      if (!workspaceRef.current || isDraggingRef.current) return;

      // 我们在拦截删除时需要非常小心，Blockly 的删除事件是不可撤销的拦截
      // 更好的方式是利用 Blockly 的 Delete 事件并结合撤销
      if (event.type === Blockly.Events.BLOCK_DELETE) {
        const isEntryBlock = event.ids?.some((id: string) => {
          // 注意：BLOCK_DELETE 发生时积木已经从 workspace 移除，我们需要通过 event.oldXml (如果有) 
          // 或者在事件触发前记录。但更简单的是，如果是 Entry Root，它在 group 中被删除
          // 我们检测被删除的积木列表中是否有 entry_root
          return event.oldXml && event.oldXml.getAttribute('type') === 'arduino_entry_root';
        }) || (event.oldJson && event.oldJson.type === 'arduino_entry_root');

        if (isEntryBlock) {
          // 立即触发撤销以找回积木
          Blockly.Events.setGroup(false);
          workspaceRef.current.undo(false);

          // 弹出确认框
          setConfirmState({
            isOpen: true,
            title: i18n.t('dialog.confirmDeleteTitle') || "确认删除",
            message: i18n.t('dialog.confirmDeleteEntry') || "确定要删除入口积木吗？这将清除所有程序逻辑。",
            type: 'danger',
            onConfirm: () => {
              // 用户确认删除：临时移除监听器执行删除
              workspaceRef.current.removeChangeListener(deletionGuarantor);
              const block = workspaceRef.current.getBlocksByType('arduino_entry_root', false)[0];
              if (block) block.dispose(false);
              setConfirmState(prev => ({ ...prev, isOpen: false }));
              // 稍后重新绑定 (防止递归)
              setTimeout(() => {
                if (workspaceRef.current) workspaceRef.current.addChangeListener(deletionGuarantor);
              }, 100);
            },
            onCancel: () => {
              setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
          });
        }
      }
    };
    workspaceRef.current.addChangeListener(deletionGuarantor);

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
          if (!isReadyForEditsRef.current) {
            attemptViewRestoreRef.current?.();
          }
        }
      }, 80);
    });
    if (editorRef.current) {
      observer.observe(editorRef.current);
    }

    return () => {
      observer.disconnect();
      isDisposed.current = true;
      if (validationTimer.current) clearTimeout(validationTimer.current);
      if (codeGenTimerRef.current) clearTimeout(codeGenTimerRef.current);
      if (workspaceRef.current) {
        workspaceRef.current.removeChangeListener(onWorkspaceChange);
        workspaceRef.current.removeChangeListener(uiListener);
        workspaceRef.current.removeChangeListener(singletonEnforcer);
        workspaceRef.current.removeChangeListener(deletionGuarantor);
        workspaceRef.current.removeChangeListener(handleToolboxItemSelect);
        workspaceRef.current.removeChangeListener(handleValidationEvent);
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
      hasInjectedRef.current = false;
    };
  }, [isLocaleLoaded]);

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

  // ========== Effect: 项目切换感知与加载 (Instant Switching) ==========
  // 当文件路径或初始代码改变时，触发状态合并，重置对齐标记，并加载新内容
  useEffect(() => {
    if (!workspaceRef.current) return;

    console.log('[BlocklyWrapper] Project context changed, applying new state:', props.currentFilePath);

    // 1. 重置加载状态标记
    initialXmlLoadedRef.current = false;
    // 2. 重置对齐标志 (允许新项目完成一次自动对齐)
    resetCentering();

    // 3. 如果已有 initialXml，立即执行加载
    if (props.initialXml) {
      console.log('[BlocklyWrapper] Loading new project XML/JSON...');
      loadWorkspaceState(props.initialXml);
      initialXmlLoadedRef.current = true;

      // 触发一次代码生成
      setTimeout(() => {
        if (workspaceRef.current && !isDisposed.current) {
          triggerCodeGeneration();
        }
      }, 100);
    } else {
      // 新项目 (无 XML)，直接就绪
      console.log('[BlocklyWrapper] New project (empty), setting ready.');
      setIsReadyForEdits(true);
      if (props.onXmlLoaded) props.onXmlLoaded();
      triggerCodeGeneration();
    }
  }, [props.currentFilePath, props.initialXml, loadWorkspaceState, resetCentering, triggerCodeGeneration]);


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
  const containerClasses = [
    "relative w-full h-full",
    config.appearance?.theme === 'light' ? "theme-light" : "theme-dark",
    (config.appearance?.showGrid === false) ? "grid-hidden" : ""
  ].join(' ');

  return (
    <div className={containerClasses}>
      {/* Blockly 编辑器挂载容器 */}
      <div
        ref={editorRef}
        className="w-full h-full"
        style={{
          minHeight: '400px',
          backgroundColor: config.appearance?.theme === 'light' ? '#ffffff' : '#1e1e1e'
        }}
      />

      {/* [NEW] 内部加载遮罩：仅在首次 Blockly 注入过程中显示，切换项目时复用不重显 */}
      {(isInjecting && !workspaceInstance) && (
        <div className="absolute inset-0 z-[50] flex items-center justify-center bg-[#1e1e1e]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm text-slate-500 animate-pulse font-medium">Initializing Blocks...</span>
          </div>
        </div>
      )}

      {/* 钉住工具箱悬浮按钮 */}
      <button
        onClick={() => setIsToolboxPinned(!isToolboxPinned)}
        style={{ zIndex: 1000 }}
        className={`absolute bottom-8 left-4 p-3 rounded-full shadow-xl transition-all ${isToolboxPinned ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}
        title={isToolboxPinned ? (Blockly.Msg.ARD_WS_UNPIN || "取消钉住工具箱") : (Blockly.Msg.ARD_WS_PIN || "钉住工具箱")}
      >
        <svg xmlns="http://www.w3.org/2000/round" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
        </svg>
      </button>

      {/* 变量/积木重命名模态框 */}
      <PromptModal isOpen={promptState.isOpen} title={promptState.message} defaultValue={promptState.defaultValue} onConfirm={handlePromptConfirm} onClose={handlePromptClose} />

      {/* 通用确认模态框 */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm || (() => { })}
        onClose={confirmState.onCancel || (() => { })}
      />

      {/* 统一搜索组件 (工作区搜索/工具箱搜索) */}
      <UnifiedSearch
        workspace={workspaceInstance}
        isVisible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
        initialMode={searchMode}
        toolboxConfiguration={toolboxConfiguration}
      />

      {/* 自定义背包组件 */}
      <CustomBackpack workspace={workspaceInstance} />
    </div>
  );
}));

BlocklyWrapper.displayName = 'BlocklyWrapper';