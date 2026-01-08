import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export interface XtermHandle {
    write: (data: string) => void;
    writeln: (data: string) => void;
    clear: () => void;
    fit: () => void;
    // onSelectionChange?: (callback: (selection: string) => void) => void; // Removed as per instruction
}

interface XtermComponentProps {
    className?: string;
    onSelectionChange?: (selection: string) => void;
    onArrowClick?: (lineText: string) => void;
}

export const XtermComponent = forwardRef<XtermHandle, XtermComponentProps>(({ className, onSelectionChange, onArrowClick }, ref) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermInstance = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const isDisposed = useRef(false);
    const onSelectionChangeRef = useRef(onSelectionChange);
    const onArrowClickRef = useRef(onArrowClick);

    useEffect(() => {
        onSelectionChangeRef.current = onSelectionChange;
        onArrowClickRef.current = onArrowClick;
    }, [onSelectionChange, onArrowClick]);

    const safeFit = useCallback(() => {
        if (isDisposed.current || !xtermInstance.current || !terminalRef.current) return;

        // Only fit if container is visible and has dimensions
        if (terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0) {
            try {
                // Double check it's not disposed before calling addon
                if (xtermInstance.current) {
                    fitAddon.current?.fit();
                }
            } catch (e) {
                console.warn('[XtermComponent] Fit failed', e);
            }
        }
    }, []);

    useImperativeHandle(ref, () => ({
        write: (data: string) => {
            if (!isDisposed.current) {
                // console.log('[XtermComponent] Writing to terminal:', data.length, 'chars'); // Debug log
                xtermInstance.current?.write(data);
            } else {
                console.warn('[XtermComponent] Write attempt on disposed terminal');
            }
        },
        writeln: (data: string) => {
            if (!isDisposed.current) xtermInstance.current?.writeln(data);
        },
        clear: () => {
            if (!isDisposed.current) {
                xtermInstance.current?.clear();
                xtermInstance.current?.reset();
            }
        },
        fit: safeFit
    }));

    useEffect(() => {
        if (!terminalRef.current) return;
        isDisposed.current = false;

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 12,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#1a1a1a',
                foreground: '#4ade80', // green-400
                cursor: '#4ade80',
                selectionBackground: '#264f78',
            },
            convertEol: true, // Convert \n to \r\n
            scrollback: 5000, // Larger buffer
        });

        const fit = new FitAddon();
        term.loadAddon(fit);

        term.open(terminalRef.current);

        xtermInstance.current = term;
        fitAddon.current = fit;

        // Initial fit
        if (terminalRef.current.offsetWidth > 0) {
            try { fit.fit(); } catch (e) { }
        }
        console.log('[XtermComponent] Terminal initialized and opened');

        // Handle selection
        term.onSelectionChange(() => {
            if (onSelectionChangeRef.current && !isDisposed.current) {
                onSelectionChangeRef.current(term.getSelection());
            }
        });

        // Handle resize
        const handleResize = () => {
            if (!isDisposed.current && terminalRef.current && terminalRef.current.offsetWidth > 0) {
                try { fit.fit(); } catch (e) { }
            }
        };
        window.addEventListener('resize', handleResize);

        // Also fit on initial load after a small delay to ensure container is ready
        const timer = setTimeout(() => {
            if (!isDisposed.current && terminalRef.current && terminalRef.current.offsetWidth > 0) {
                try { fit.fit(); } catch (e) { }
            }
        }, 100);

        return () => {
            isDisposed.current = true;
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);

            // Dispose everything properly
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

    useEffect(() => {
        const observer = new ResizeObserver(() => {
            if (terminalRef.current && terminalRef.current.offsetWidth > 0) {
                try {
                    fitAddon.current?.fit();
                } catch (e) {
                    // Ignore fit errors during rapid resize or if xterm is not ready
                }
            }
        });
        if (terminalRef.current) {
            observer.observe(terminalRef.current);
        }
        return () => observer.disconnect();
    }, []);

    // Use overflow: hidden for the container, xterm handles its own scrolling internally
    return <div className={className} ref={terminalRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
});

XtermComponent.displayName = 'XtermComponent';
