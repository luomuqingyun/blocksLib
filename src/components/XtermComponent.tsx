/**
 * ============================================================
 * 终端组件 (Xterm Terminal Component)
 * ============================================================
 * 
 * 基于 xterm.js 的终端模拟器组件。
 * 用于串口监视器的数据显示和编译日志输出。
 * 
 * 功能:
 * - 实时显示串口数据或编译日志
 * - 支持自动滚动和手动清屏
 * - 响应式自动调整尺寸 (FitAddon)
 * - 支持终端风格选区复制
 * 
 * 通过 ref 暴露 XtermHandle 接口供父组件控制:
 * - write(): 写入数据
 * - writeln(): 写入数据并换行
 * - clear(): 清空终端
 * - fit(): 强制重绘
 * 
 * @file src/components/XtermComponent.tsx
 * @module EmbedBlocks/Frontend/Components/XtermComponent
 */

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

/** 暴露给父组件的控制句柄 */
export interface XtermHandle {
    write: (data: string) => void;
    writeln: (data: string) => void;
    clear: () => void;
    fit: () => void;
}

/** 组件属性 */
interface XtermComponentProps {
    /** 可选的 CSS 类名 */
    className?: string;
    /** 选区内容变化回调 */
    onSelectionChange?: (selection: string) => void;
    /** 箭头点击回调 (未使用) */
    onArrowClick?: (lineText: string) => void;
}


export const XtermComponent = forwardRef<XtermHandle, XtermComponentProps>(({ className, onSelectionChange, onArrowClick }, ref) => {
    // DOM 容器引用
    const terminalRef = useRef<HTMLDivElement>(null);
    // xterm 实例引用
    const xtermInstance = useRef<Terminal | null>(null);
    // FitAddon 实例引用 (用于自动调整尺寸)
    const fitAddon = useRef<FitAddon | null>(null);
    // 是否已销毁标志 (防止异步操作在销毁后执行)
    const isDisposed = useRef(false);
    // 回调函数引用 (避免 Effect 重新绑定)
    const onSelectionChangeRef = useRef(onSelectionChange);
    const onArrowClickRef = useRef(onArrowClick);

    // 同步回调引用
    useEffect(() => {
        onSelectionChangeRef.current = onSelectionChange;
        onArrowClickRef.current = onArrowClick;
    }, [onSelectionChange, onArrowClick]);

    /**
     * 安全的 fit 操作
     * 检查容器是否可见且有有效尺寸
     */
    const safeFit = useCallback(() => {
        if (isDisposed.current || !xtermInstance.current || !terminalRef.current) return;

        // 只有容器可见且有尺寸时才执行 fit
        if (terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0) {
            try {
                // 再次检查是否已销毁
                if (xtermInstance.current) {
                    fitAddon.current?.fit();
                }
            } catch (e) {
                console.warn('[XtermComponent] Fit failed', e);
            }
        }
    }, []);

    // ========== 暴露给父组件的控制方法 ==========
    useImperativeHandle(ref, () => ({
        /** 写入数据到终端 */
        write: (data: string) => {
            if (!isDisposed.current) {
                xtermInstance.current?.write(data);
            } else {
                console.warn('[XtermComponent] Write attempt on disposed terminal');
            }
        },
        /** 写入数据并换行 */
        writeln: (data: string) => {
            if (!isDisposed.current) xtermInstance.current?.writeln(data);
        },
        /** 清空终端 */
        clear: () => {
            if (!isDisposed.current) {
                xtermInstance.current?.clear();
                xtermInstance.current?.reset();
            }
        },
        /** 调整终端尺寸 */
        fit: safeFit
    }));

    // ========== Effect: 初始化 xterm 终端 ==========
    useEffect(() => {
        if (!terminalRef.current) return;
        isDisposed.current = false;

        // 创建 xterm 实例
        const term = new Terminal({
            cursorBlink: true,           // 光标闪烁
            fontSize: 12,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#1a1a1a',
                foreground: '#4ade80',   // 绿色文本
                cursor: '#4ade80',
                selectionBackground: '#264f78',  // 选区背景色
            },
            convertEol: true,             // 将 \n 转换为 \r\n
            scrollback: 5000,             // 滚动缓冲区大小
        });

        // 加载 FitAddon 用于自动调整尺寸
        const fit = new FitAddon();
        term.loadAddon(fit);

        // 挂载到 DOM
        term.open(terminalRef.current);

        xtermInstance.current = term;
        fitAddon.current = fit;

        // 初始 fit
        if (terminalRef.current.offsetWidth > 0) {
            try { fit.fit(); } catch (e) { }
        }
        console.log('[XtermComponent] Terminal initialized and opened');

        // 监听选区变化
        term.onSelectionChange(() => {
            if (onSelectionChangeRef.current && !isDisposed.current) {
                onSelectionChangeRef.current(term.getSelection());
            }
        });

        // 监听窗口大小变化
        const handleResize = () => {
            if (!isDisposed.current && terminalRef.current && terminalRef.current.offsetWidth > 0) {
                try { fit.fit(); } catch (e) { }
            }
        };
        window.addEventListener('resize', handleResize);

        // 延迟 fit 以确保容器已就绪
        const timer = setTimeout(() => {
            if (!isDisposed.current && terminalRef.current && terminalRef.current.offsetWidth > 0) {
                try { fit.fit(); } catch (e) { }
            }
        }, 100);

        // 清理函数
        return () => {
            isDisposed.current = true;
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);

            // 正确销毁所有资源
            try {
                fit.dispose();
                term.dispose();
            } catch (e) {
                console.error('[XtermComponent] Disposal error', e);
            }

            xtermInstance.current = null;
            fitAddon.current = null;
        };
    }, []);

    // ========== Effect: 使用 ResizeObserver 监听容器尺寸变化 ==========
    useEffect(() => {
        const observer = new ResizeObserver(() => {
            if (terminalRef.current && terminalRef.current.offsetWidth > 0) {
                try {
                    fitAddon.current?.fit();
                } catch (e) {
                    // 忽略快速 resize 或 xterm 未就绪时的错误
                }
            }
        });
        if (terminalRef.current) {
            observer.observe(terminalRef.current);
        }
        return () => observer.disconnect();
    }, []);

    // 容器使用 overflow: hidden，xterm 内部处理滚动
    return <div className={className} ref={terminalRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
});

XtermComponent.displayName = 'XtermComponent';
