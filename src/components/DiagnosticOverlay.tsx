// ------------------------------------------------------------------
// 键盘诊断叠加层组件 (Keyboard Diagnostic Overlay Component)
// ------------------------------------------------------------------
// 提供实时键盘事件诊断工具，用于调试焦点和事件传播问题。
// 可通过 Ctrl+Alt+Shift+D 或菜单触发显示/隐藏。
// ------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import { useUI } from '../contexts/UIContext';

/**
 * 键盘事件日志条目接口
 * 记录每次键盘事件的详细信息
 */
interface LogEntry {
  /** 事件类型: KEYBOARD / MOUSE / SYSTEM */
  type: 'KEYBOARD' | 'MOUSE' | 'SYSTEM';
  /** 按下的键名或鼠标事件名 */
  key: string;
  /** 事件目标元素描述 */
  target: string;
  /** 是否调用了 preventDefault() */
  prevented: boolean;
  /** 是否调用了 stopPropagation() */
  stopped: boolean;
  /** 时间戳 */
  timestamp: number;
  /** 事件阶段: CAPTURING/TARGET/BUBBLING */
  phase?: string;
  /** 是否为输入元素 (INPUT/TEXTAREA/ContentEditable) */
  isInput?: boolean;
  /** 鼠标坐标 (仅对于鼠标事件) */
  coords?: { x: number; y: number };
}

/**
 * 键盘诊断叠加层组件
 * 提供实时键盘事件监控和焦点跟踪功能
 */
export const DiagnosticOverlay: React.FC = () => {
  const { showNotification } = useUI();
  // 键盘事件日志列表
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // 叠加层可见性状态
  const [isVisible, setIsVisible] = useState(false);
  // 当前焦点元素描述
  const [activeFocus, setActiveFocus] = useState<string>('None');
  // 叠加层位置 (可拖拽)
  const [pos, setPos] = useState(() => {
    // 计算初始位置: 屏幕右下角
    const width = 420;
    const height = 450;
    const x = Math.max(10, window.innerWidth - width - 20);
    const y = Math.max(10, window.innerHeight - height - 20);
    return { x, y };
  });
  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  // 拖拽开始时的鼠标偏移
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  /**
   * 约束位置在窗口范围内
   * 防止叠加层超出屏幕边界
   */
  const constrainPos = (px: number, py: number) => {
    const width = 420;
    const height = 450;
    const maxX = Math.max(0, window.innerWidth - width - 20);
    const maxY = Math.max(0, window.innerHeight - height - 20);
    return {
      x: Math.min(Math.max(10, px), maxX),
      y: Math.min(Math.max(10, py), maxY)
    };
  };

  // ========== 主要 Effect: 初始化键盘事件监听和方法补丁 ==========
  useEffect(() => {
    console.log('[Diagnostic] Overlay mounted globally');

    // HMR 安全检查: 避免重复补丁
    if ((KeyboardEvent.prototype as any)._isEbPatched) {
      console.log('[Diagnostic] Already patched, skipping redundant logic.');
      return;
    }

    // 保存原始方法引用
    const originalStopProp = KeyboardEvent.prototype.stopPropagation;
    const originalStopImmProp = KeyboardEvent.prototype.stopImmediatePropagation;

    // 补丁 stopPropagation - 标记事件传播已假止
    KeyboardEvent.prototype.stopPropagation = function () {
      (this as any)._propagationStopped = true;
      originalStopProp.apply(this);
    };
    // 补丁 stopImmediatePropagation - 标记事件立即停止
    KeyboardEvent.prototype.stopImmediatePropagation = function () {
      (this as any)._propagationStopped = true;
      (this as any)._immediatePropagationStopped = true;
      originalStopImmProp.apply(this);
    };
    // 标记已补丁
    (KeyboardEvent.prototype as any)._isEbPatched = true;

    const getTargetDesc = (target: HTMLElement | null) => {
      if (!target) return 'UNKNOWN';
      let desc = target.tagName;
      if (target.id) desc += `#${target.id}`;
      const className = (typeof target.className === 'string') ? target.className : (target.className as any)?.baseVal || '';
      if (className) {
        const firstClass = className.split(' ')[0];
        if (firstClass) desc += `.${firstClass}`;
      }
      return desc;
    };

    const isElementEditable = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      const tagName = el.tagName.toUpperCase();
      return (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        el.isContentEditable ||
        !!el.closest('.blocklyHtmlInput') ||
        !!el.closest('.monaco-editor')
      );
    };

    const kbdHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const targetDesc = getTargetDesc(target);
      const isInput = isElementEditable(target);

      setTimeout(() => {
        setLogs(prev => [{
          type: 'KEYBOARD' as const,
          key: e.key,
          target: targetDesc,
          isInput,
          prevented: e.defaultPrevented,
          stopped: (e as any)._propagationStopped || false,
          timestamp: Date.now(),
          phase: e.eventPhase === 1 ? 'CAPTURING' : e.eventPhase === 3 ? 'BUBBLING' : 'TARGET'
        }, ...prev].slice(0, 50));
      }, 0);
    };

    const mouseHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest('.diagnostic-panel-container')) return;

      const targetDesc = getTargetDesc(target);
      const isInput = isElementEditable(target);

      setLogs(prev => [{
        type: 'MOUSE' as const,
        key: `CLICK_${e.button === 0 ? 'LEFT' : e.button === 2 ? 'RIGHT' : 'MID'}`,
        target: targetDesc,
        isInput,
        prevented: e.defaultPrevented,
        stopped: false,
        timestamp: Date.now(),
        phase: 'TARGET',
        coords: { x: e.clientX, y: e.clientY }
      }, ...prev].slice(0, 50));
    };

    /** 切换叠加层可见性 */
    const toggleHandler = () => setIsVisible(v => !v);
    window.addEventListener('toggle-diagnostic-overlay', toggleHandler);

    const windowFocusHandler = () => {
      setLogs(prev => [{
        type: 'SYSTEM' as const,
        key: 'WINDOW_FOCUS',
        target: 'N/A',
        prevented: false,
        stopped: false,
        timestamp: Date.now(),
        phase: 'SYSTEM'
      }, ...prev].slice(0, 50));
    };

    /** 窗口失去焦点时记录 */
    const windowBlurHandler = () => {
      setLogs(prev => [{
        type: 'SYSTEM' as const,
        key: 'WINDOW_BLUR',
        target: 'N/A',
        prevented: false,
        stopped: false,
        timestamp: Date.now(),
        phase: 'SYSTEM'
      }, ...prev].slice(0, 50));
    };

    /**
     * 焦点跟踪器
     * 定期检查当前焦点元素并更新显示
     */
    const focusTracker = () => {
      const el = document.activeElement as HTMLElement;
      if (el) {
        let desc = el.tagName;
        if (el.id) desc += `#${el.id}`;
        const className = (typeof el.className === 'string') ? el.className : (el.className as any)?.baseVal || '';
        if (className) desc += `.${className.split(' ')[0]}`;

        // 检测是否是输入元素
        const isInput = ['INPUT', 'TEXTAREA'].includes(el.tagName) || el.isContentEditable;
        const isFocusable = el.tabIndex >= 0 || isInput;
        setActiveFocus(`${desc}${isInput ? ' [INPUT-READY]' : ''}${isFocusable ? ' [FOCUSABLE]' : ' [PASSIVE]'}`);
      }
    };

    /** 窗口大小变化时重新约束位置 */
    const handleResize = () => {
      setPos(prev => constrainPos(prev.x, prev.y));
    };

    window.addEventListener('keydown', kbdHandler, true);
    window.addEventListener('mousedown', mouseHandler, true);
    window.addEventListener('focus', windowFocusHandler);
    window.addEventListener('blur', windowBlurHandler);
    window.addEventListener('resize', handleResize);
    const focusInterval = setInterval(focusTracker, 500);

    return () => {
      window.removeEventListener('keydown', kbdHandler, true);
      window.removeEventListener('mousedown', mouseHandler, true);
      window.removeEventListener('focus', windowFocusHandler);
      window.removeEventListener('blur', windowBlurHandler);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('toggle-diagnostic-overlay', toggleHandler);
      clearInterval(focusInterval);
      KeyboardEvent.prototype.stopPropagation = originalStopProp;
      KeyboardEvent.prototype.stopImmediatePropagation = originalStopImmProp;
      delete (KeyboardEvent.prototype as any)._isEbPatched;
    };
  }, []);

  /**
   * 开始拖动叠加层
   * 记录初始鼠标偏移量
   */
  const startDrag = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });
  };

  // ========== Effect: 拖拽移动处理 ==========
  useEffect(() => {
    /** 鼠标移动时更新位置 */
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPos(constrainPos(e.clientX - dragOffset.x, e.clientY - dragOffset.y));
      }
    };
    /** 鼠标释放时停止拖拽 */
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, dragOffset]);

  // 不可见时不渲染
  if (!isVisible) return null;

  /**
   * 导出当前的交互记录为 Markdown 格式的文档记录
   */
  const exportLogsAsDocument = () => {
    if (logs.length === 0) {
      showNotification('没有可导出的日志记录', 'info');
      return;
    }

    const title = `# EmbedBlocks Interaction Diagnostic Record (${new Date().toLocaleString()})\n\n`;
    const header = `| Time | Type | Action/Key | Target Element | Detail |\n| :--- | :--- | :--- | :--- | :--- |\n`;
    const rows = logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString([], { hour12: false });
      const type = log.type === 'KEYBOARD' ? '⌨️ KBD' : log.type === 'MOUSE' ? '🖱️ MOUSE' : '⚙️ SYS';
      const detail = log.type === 'MOUSE' ? `Coord: (${log.coords?.x}, ${log.coords?.y})` :
        `${log.prevented ? '[Prevented]' : ''} ${log.stopped ? '[Stopped]' : ''} (${log.phase})`;
      return `| ${time} | ${type} | **${log.key}** | \`${log.target}\` | ${detail} |`;
    }).join('\n');

    const doc = title + header + rows;

    // 方案 1: 使用现代 Clipboard API
    if (navigator.clipboard) {
      navigator.clipboard.writeText(doc).then(() => {
        showNotification('交互记录已作为 Markdown 文档复制到剪切板', 'success');
      }).catch(err => {
        console.warn('[Diagnostic] Clipboard API failed, trying fallback...', err);
        fallbackCopy(doc);
      });
    } else {
      fallbackCopy(doc);
    }
  };

  /**
   * 备选复制方案: 使用隐藏的 Textarea (不受焦点限制)
   */
  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        showNotification('交互记录已通过兼容模式复制到剪切板', 'success');
      } else {
        throw new Error('execCommand failed');
      }
    } catch (err) {
      console.error('所有复制方案均失败:', err);
      showNotification('无法复制记录，请在控制台查看输出', 'error');
      console.log('--- DIAGNOSTIC LOG ---', text);
    }
  };

  // ========== 渲染诊断叠加层 ==========
  return (
    <div
      className="diagnostic-panel-container"
      style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)', color: '#0f0', padding: '12px',
        borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace',
        width: '420px', maxHeight: '450px', overflow: 'hidden', pointerEvents: 'auto',
        userSelect: 'text', border: '1px solid #444', boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column'
      }}
    >
      {/* 标题栏 - 支持拖拽 */}
      <div
        onMouseDown={startDrag}
        style={{
          fontWeight: 'bold', borderBottom: '1px solid #444', paddingBottom: '8px', marginBottom: '8px',
          display: 'flex', justifyContent: 'space-between', cursor: 'move', userSelect: 'none',
          alignItems: 'flex-start'
        }}
      >
        {/* 标题和焦点信息 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '14px', color: '#0f0', letterSpacing: '1px' }}>⌨️ 交互诊断工具 (Mouse/Kbd)</span>
          <span style={{
            color: activeFocus.includes('[INPUT-READY]') ? '#0f0' : '#f0f',
            fontSize: '11px',
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            焦点: {activeFocus}
          </span>
        </div>
        {/* 关闭按钮 */}
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer',
            width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '4px', transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#f44'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        >
          ×
        </button>
      </div>
      {/* 事件日志列表 */}
      <div style={{ overflow: 'auto', flex: 1, paddingRight: '4px' }}>
        {logs.length === 0 && <div style={{ color: '#444', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>尚未捕获任何事件...</div>}
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '2px', whiteSpace: 'nowrap', borderBottom: '1px solid #1a1a1a', padding: '4px 0' }}>
            <span style={{ color: '#555', fontSize: '10px' }}>[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
            <span style={{ marginLeft: '4px' }}>{log.type === 'KEYBOARD' ? '⌨️' : log.type === 'MOUSE' ? '🖱️' : '⚙️'}</span>
            <b style={{
              color: log.type === 'SYSTEM' ? '#ff0' : (log.prevented ? '#f55' : '#fff'),
              marginLeft: '4px', minWidth: '60px', display: 'inline-block'
            }}>{log.key}</b>
            <span style={{ color: '#888', marginLeft: '4px', fontSize: '11px' }}>于 {log.target}</span>
            {log.isInput && <span style={{ color: '#f90', fontSize: '9px', fontWeight: 'bold' }}> [EDIT]</span>}
            {log.coords && <span style={{ color: '#0af', fontSize: '9px' }}> ({log.coords.x}, {log.coords.y})</span>}
            {log.prevented ? <span style={{ color: '#f55', fontWeight: 'bold', fontSize: '10px' }}> [已阻止]</span> : ''}
            {log.stopped ? <span style={{ color: '#ff5', fontWeight: 'bold', fontSize: '10px' }}> [已停止]</span> : ''}
          </div>
        ))}
      </div>
      {/* 底部操作按钮 */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <button
          onClick={exportLogsAsDocument}
          style={{
            flex: 1, background: '#060', color: '#fff', border: '1px solid #0a0', padding: '6px',
            borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          📄 导出文档记录
        </button>
        <button
          onClick={() => {
            (document.activeElement as HTMLElement)?.blur();
            document.body.focus();
            showNotification('Global focus reset to document body', 'success');
          }}
          style={{
            background: '#333', color: '#fff', border: '1px solid #555', padding: '6px',
            borderRadius: '4px', fontSize: '11px', cursor: 'pointer'
          }}
        >
          重置焦点
        </button>
        {/* 清空日志按钮 */}
        <button
          onClick={() => setLogs([])}
          style={{
            background: '#333', color: '#fff', border: '1px solid #555', padding: '6px 12px',
            borderRadius: '4px', fontSize: '11px', cursor: 'pointer'
          }}
        >
          清空
        </button>
      </div>
      <div style={{
        fontSize: '11px',
        color: '#ccc',
        marginTop: '10px',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.1)',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #333'
      }}>
        <b style={{ color: '#fff' }}>TIP:</b> Drag Header to move | <b style={{ color: '#0f0' }}>Ctrl+Alt+Shift+D</b> to hide
      </div>
    </div>
  );
};

export default DiagnosticOverlay;
