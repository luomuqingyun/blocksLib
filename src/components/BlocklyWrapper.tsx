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
      // 这里的逻辑是：如果启用则设为 20，不启用则设为 0（彻底隐藏）
      const targetSpacing = showGrid ? 20 : 0;
      const gridColour = targetTheme.getComponentStyle('gridColour') || '#FF0000';

      console.log('[BlocklyWrapper] Grid Sync Details:', {
        showGrid,
        targetSpacing,
        gridColour,
        workspaceOptions: workspace.options.gridOptions
      });

      // 更新 Options 同步 (基础设置)
      workspace.options.gridOptions.spacing = targetSpacing;
      workspace.options.gridOptions.enabled = showGrid;
      workspace.options.gridOptions.colour = gridColour;

      // [MONKEYPATCH REDUX] 劫持 grid.update 方法
      // 只有这样才能确保在缩放和移动时，自定义颜色和间距不被 Blockly 内部逻辑覆盖
      if (!(grid as any)._isPatched) {
        const originalUpdate = grid.update;
        grid.update = function (scale: number) {
          // 每次更新前确保 Options 是最新的 (单一事实来源)
          this.spacing_ = workspace.options.gridOptions.spacing;
          this.colour_ = workspace.options.gridOptions.colour;

          originalUpdate.call(this, scale);

          // [AGGRESSIVE DOM SYNC] 暴力注入 SVG 属性
          // 检查所有可能的模式元素属性名 (Blockly 12 及其变体)
          const pattern = (this as any).gridPattern_ || (this as any).pattern || (this as any).pattern_;
          if (pattern) {
            // 查找所有可能的视觉元素
            const elements = pattern.querySelectorAll('circle, line, path');
            elements.forEach((v: any) => {
              // 强制颜色
              v.setAttribute('fill', this.colour_);
              v.setAttribute('stroke', this.colour_);
              // 强制可见性
              v.setAttribute('visibility', this.spacing_ > 0 ? 'visible' : 'hidden');
              // 冗余保险：如果 spacing 为 0，彻底透明
              if (this.spacing_ === 0) {
                v.setAttribute('opacity', '0');
              } else {
                v.setAttribute('opacity', '1');
              }
            });
          }
        };
        (grid as any)._isPatched = true;
      }

      // 立即触发应用
      // 兼容某些版本的 grid.setSpacing
      if (typeof grid.setSpacing === 'function') {
        grid.setSpacing(targetSpacing);
      }
      grid.update(workspace.scale);

      // 视觉兜底：立即执行一次全量注入
      const forcePattern = (grid as any).gridPattern_ || (grid as any).pattern || (grid as any).pattern_;
      if (forcePattern) {
        forcePattern.querySelectorAll('circle, line, path').forEach((v: any) => {
          v.setAttribute('fill', gridColour);
          v.setAttribute('stroke', gridColour);
          v.setAttribute('visibility', showGrid ? 'visible' : 'hidden');
          v.setAttribute('opacity', showGrid ? '1' : '0');
        });
      }

      Blockly.svgResize(workspace);
    }
  }, [workspaceInstance, config.appearance?.theme, config.appearance?.showGrid]);

  // 监听注册表变更
  useEffect(() => {
    return BoardRegistry.subscribe(() => {
      console.log('[BlocklyWrapper] BoardRegistry updated, refreshing definitions...');
      refreshBlockDefinitions();
      setRegistryVersion(v => v + 1);
    });
  }, []);
  // 组件挂载时执行全局初始化 (已移至 App.tsx 处理)

  const isReadyForEditsRef = useRef(false);
  useEffect(() => { isReadyForEditsRef.current = isReadyForEdits; }, [isReadyForEdits]);

  const onUiChangeRef = useRef(onUiChange);
  useEffect(() => {
    onUiChangeRef.current = onUiChange;
  }, [onUiChange]);

  // 为 ResizeObserver 缓存 attemptViewRestore 的最新引用，避免闭包过时
  const attemptViewRestoreRef = useRef<any>(null);
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
  const { loadWorkspaceState, saveWorkspaceState, attemptViewRestore, ensureDefaultBlocks, centerOnBlocks, resetCentering, isDisposed } = useWorkspacePersistence(
    workspaceRef,
    props.currentFilePath,
    (ready) => {
      setIsReadyForEdits(ready);
      if (ready) setIsInjecting(false);
    },
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

  useEffect(() => { attemptViewRestoreRef.current = attemptViewRestore; }, [attemptViewRestore]);



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
    setIsInjecting(true);
    // [FIX] 动态计算初始栅格配置，防止从默认灰白色闪烁到自定义颜色
    const initialShowGrid = config.appearance?.showGrid !== false;
    const initialGridColour = (currentTheme as any).getComponentStyle ? currentTheme.getComponentStyle('gridColour') : '#475569';

    workspaceRef.current = Blockly.inject(editorRef.current, {
      toolbox: toolboxConfiguration || { kind: 'categoryToolbox', contents: [] },
      theme: currentTheme,
      media: 'media/blockly/', // 使用本地媒体资源，避免 CSP 违规并支持离线
      trashcan: true, // 垃圾桶
      // @ts-ignore
      contextMenu: true, // 右键菜单
      move: { scrollbars: true, drag: true, wheel: false },
      // zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 4.0, minScale: 0.2, scaleSpeed: 1.1 },
      grid: {
        spacing: initialShowGrid ? 20 : 0,
        // length: 3,
        length: 1,
        colour: initialGridColour,
        snap: true
      },
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
      setIsInjecting(false);
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
     * UI 变更监听 (如选中的积木改变等)
     */
    const uiListener = (event: any) => {
      // 积木块改变颜色、标注等 UI 事件
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

    // 绑定其他分类回调 and 监听器
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
          // 只有在尚未就绪（加载/首次对齐阶段）时，才在 Resize 时执行视图恢复
          if (!isReadyForEditsRef.current) {
            attemptViewRestoreRef.current?.();
          }
        }
      }, 80); // 略微增加防抖时间
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