// ------------------------------------------------------------------
// 键盘诊断叠加层组件 (Keyboard Diagnostic Overlay Component)
// ------------------------------------------------------------------
// 提供实时键盘事件诊断工具，用于调试焦点和事件传播问题。
// 可通过 Ctrl+Alt+Shift+D 或菜单触发显示/隐藏。
// ------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import { useUI } from '../contexts/UIContext';

interface LogEntry {
  key: string;
  target: string;
  prevented: boolean;
  stopped: boolean;
  timestamp: number;
  phase?: string;
}

export const DiagnosticOverlay: React.FC = () => {
  const { showNotification } = useUI();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [activeFocus, setActiveFocus] = useState<string>('None');
  const [pos, setPos] = useState(() => {
    const width = 420;
    const height = 450;
    const x = Math.max(10, window.innerWidth - width - 20);
    const y = Math.max(10, window.innerHeight - height - 20);
    return { x, y };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

  useEffect(() => {
    console.log('[Diagnostic] Overlay mounted globally');

    // HMR Safety: Check if already patched
    if ((KeyboardEvent.prototype as any)._isEbPatched) {
      console.log('[Diagnostic] Already patched, skipping redundant logic.');
      return;
    }

    // Monkeypatch event methods to detect propagation stopping
    const originalStopProp = KeyboardEvent.prototype.stopPropagation;
    const originalStopImmProp = KeyboardEvent.prototype.stopImmediatePropagation;

    KeyboardEvent.prototype.stopPropagation = function () {
      (this as any)._propagationStopped = true;
      originalStopProp.apply(this);
    };
    KeyboardEvent.prototype.stopImmediatePropagation = function () {
      (this as any)._propagationStopped = true;
      (this as any)._immediatePropagationStopped = true;
      originalStopImmProp.apply(this);
    };
    (KeyboardEvent.prototype as any)._isEbPatched = true;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      let targetDesc = target?.tagName || 'UNKNOWN';
      if (target?.id) targetDesc += `#${target.id}`;
      const className = (target && typeof target.className === 'string') ? target.className : (target?.className as any)?.baseVal || '';
      if (className) {
        const firstClass = className.split(' ')[0];
        if (firstClass) targetDesc += `.${firstClass}`;
      }

      setTimeout(() => {
        setLogs(prev => [{
          key: e.key,
          target: targetDesc,
          prevented: e.defaultPrevented,
          stopped: (e as any)._propagationStopped || false,
          timestamp: Date.now(),
          phase: e.eventPhase === 1 ? 'CAPTURING' : e.eventPhase === 3 ? 'BUBBLING' : 'TARGET'
        }, ...prev].slice(0, 30));
      }, 0);
    };

    const toggleHandler = () => setIsVisible(v => !v);
    window.addEventListener('toggle-diagnostic-overlay', toggleHandler);

    const windowFocusHandler = () => {
      setLogs(prev => [{
        key: 'WINDOW_FOCUS',
        target: 'N/A',
        prevented: false,
        stopped: false,
        timestamp: Date.now(),
        phase: 'SYSTEM'
      }, ...prev].slice(0, 30));
    };

    const windowBlurHandler = () => {
      setLogs(prev => [{
        key: 'WINDOW_BLUR',
        target: 'N/A',
        prevented: false,
        stopped: false,
        timestamp: Date.now(),
        phase: 'SYSTEM'
      }, ...prev].slice(0, 30));
    };

    const focusTracker = () => {
      const el = document.activeElement as HTMLElement;
      if (el) {
        let desc = el.tagName;
        if (el.id) desc += `#${el.id}`;
        const className = (typeof el.className === 'string') ? el.className : (el.className as any)?.baseVal || '';
        if (className) desc += `.${className.split(' ')[0]}`;

        const isInput = ['INPUT', 'TEXTAREA'].includes(el.tagName) || el.isContentEditable;
        const isFocusable = el.tabIndex >= 0 || isInput;
        setActiveFocus(`${desc}${isInput ? ' [INPUT-READY]' : ''}${isFocusable ? ' [FOCUSABLE]' : ' [PASSIVE]'}`);
      }
    };

    const handleResize = () => {
      setPos(prev => constrainPos(prev.x, prev.y));
    };

    window.addEventListener('keydown', handler, true);
    window.addEventListener('focus', windowFocusHandler);
    window.addEventListener('blur', windowBlurHandler);
    window.addEventListener('resize', handleResize);
    const focusInterval = setInterval(focusTracker, 500);

    return () => {
      window.removeEventListener('keydown', handler, true);
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

  const startDrag = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPos(constrainPos(e.clientX - dragOffset.x, e.clientY - dragOffset.y));
      }
    };
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

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)', color: '#0f0', padding: '12px',
      borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace',
      width: '420px', maxHeight: '450px', overflow: 'hidden', pointerEvents: 'auto',
      userSelect: 'text', border: '1px solid #444', boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      display: 'flex', flexDirection: 'column'
    }}>
      <div
        onMouseDown={startDrag}
        style={{
          fontWeight: 'bold', borderBottom: '1px solid #444', paddingBottom: '8px', marginBottom: '8px',
          display: 'flex', justifyContent: 'space-between', cursor: 'move', userSelect: 'none',
          alignItems: 'flex-start'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '14px', color: '#0f0', letterSpacing: '1px' }}>⌨️ KEYBOARD DIAGNOSTICS</span>
          <span style={{
            color: activeFocus.includes('[INPUT-READY]') ? '#0f0' : '#f0f',
            fontSize: '11px',
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            Focus: {activeFocus}
          </span>
        </div>
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
      <div style={{ overflow: 'auto', flex: 1, paddingRight: '4px' }}>
        {logs.length === 0 && <div style={{ color: '#444', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>No events captured yet...</div>}
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '2px', whiteSpace: 'nowrap', borderBottom: '1px solid #1a1a1a', padding: '4px 0' }}>
            <span style={{ color: '#555', fontSize: '10px' }}>[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
            <b style={{
              color: log.key.includes('WINDOW_') ? '#ff0' : (log.prevented ? '#f55' : '#fff'),
              marginLeft: '6px', minWidth: '60px', display: 'inline-block'
            }}>{log.key}</b>
            <span style={{ color: '#888', marginLeft: '4px', fontSize: '11px' }}>at {log.target}</span>
            <span style={{ color: '#444', marginLeft: '4px', fontSize: '9px' }}>({log.phase})</span>
            {log.prevented ? <span style={{ color: '#f55', fontWeight: 'bold', fontSize: '10px' }}> [PREVENTED]</span> : ''}
            {log.stopped ? <span style={{ color: '#ff5', fontWeight: 'bold', fontSize: '10px' }}> [STOPPED]</span> : ''}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <button
          onClick={() => {
            (document.activeElement as HTMLElement)?.blur();
            document.body.focus();
            showNotification('Global focus reset to document body', 'success');
          }}
          style={{
            flex: 1, background: '#333', color: '#fff', border: '1px solid #555', padding: '6px',
            borderRadius: '4px', fontSize: '11px', cursor: 'pointer'
          }}
        >
          Reset Global Focus
        </button>
        <button
          onClick={() => setLogs([])}
          style={{
            background: '#333', color: '#fff', border: '1px solid #555', padding: '6px 12px',
            borderRadius: '4px', fontSize: '11px', cursor: 'pointer'
          }}
        >
          Clear Logs
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
