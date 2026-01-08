// ----------------------------------------------------------------------------
// 串口监视器面板组件 (Serial Monitor Panel Component)
// ----------------------------------------------------------------------------
// 提供串口通信的调试界面:
// - 端口配置: 波特率、数据位、停止位、校验位
// - 显示模式: 文本/十六进制、方向箭头、行尾标记
// - 发送功能: 多行输入、历史记录、Hex 发送
// - 使用 xterm.js 提供终端风格的交互体验
// ----------------------------------------------------------------------------

import React, { useRef, useEffect } from 'react';
import {
    RotateCcw, Trash2, XCircle, Monitor, RefreshCw, Send
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSerial, SerialDataEvent } from '../../contexts/SerialContext';
import { XtermComponent, XtermHandle } from '../XtermComponent';

// --- 组件属性类型 ---
export interface SerialMonitorProps {
    isVisible: boolean;
}

export const SerialMonitorPanel: React.FC<SerialMonitorProps> = ({ isVisible }) => {
    const { t } = useTranslation();
    const xtermRef = useRef<XtermHandle>(null);
    const [historyIndex, setHistoryIndex] = React.useState(-1);
    const [inputError, setInputError] = React.useState<string | null>(null);
    const [selection, setSelection] = React.useState('');
    const isStartOfLineRef = useRef(true);
    const lastTypeRef = useRef<'rx' | 'tx' | null>(null);
    const decoderRef = useRef<TextDecoder>(new TextDecoder('utf-8'));

    const {
        isConnected,
        ports, selectedPort, setSelectedPort, refreshPorts,
        baudRate, setBaudRate,
        dataBits, setDataBits,
        stopBits, setStopBits,
        parity, setParity,
        hexDisplay, setHexDisplay,
        hexSend, setHexSend,
        encoding,
        dtrState, rtsState, toggleDTR, toggleRTS,
        lineEnding, setLineEnding,
        enterSends, setEnterSends,
        restoreDefaults,
        clearSerial,
        toggleSerial,
        sendSerialData,
        serialInput, setSerialInput, sentHistory,
        inputSpellCheck,
        addSerialListener, removeSerialListener,
        addClearListener, removeClearListener
    } = useSerial();

    // Update decoder when encoding changes
    useEffect(() => {
        try {
            decoderRef.current = new TextDecoder(encoding || 'utf-8');
        } catch (e) {
            console.error('Failed to create TextDecoder:', e);
            decoderRef.current = new TextDecoder('utf-8');
        }
    }, [encoding]);

    // Clear error when Hex Send mode changes
    useEffect(() => {
        setInputError(null);
        if (hexSend) {
            setLineEnding('none');
        }
    }, [hexSend, setLineEnding]);

    // Handle Xterm Resizing
    useEffect(() => {
        if (isVisible && xtermRef.current) {
            // Small delay to allow layout to settle
            setTimeout(() => xtermRef.current?.fit(), 100);
        }
    }, [isVisible]);

    // Clear Listener
    useEffect(() => {
        const handleClear = () => {
            xtermRef.current?.clear();
        };
        addClearListener(handleClear);
        return () => removeClearListener(handleClear);
    }, [addClearListener, removeClearListener]);

    // Data Listener
    useEffect(() => {
        const handleData = (event: SerialDataEvent) => {
            // Performance: Removed console.log for high-speed serial data
            if (!xtermRef.current) {
                return;
            }

            // Hex Formatting (Display Logic)
            if (hexDisplay) {
                let bytes: Uint8Array;
                if (typeof event.data === 'string') {
                    bytes = new TextEncoder().encode(event.data);
                } else {
                    bytes = event.data;
                }

                const hexParts: string[] = [];
                bytes.forEach(b => hexParts.push(b.toString(16).padStart(2, '0').toUpperCase()));
                const colorCode = event.type === 'tx' ? '\x1b[34m' : '\x1b[32m';

                // Force newline if switching direction in hex (optional, but cleaner)
                if (lastTypeRef.current && lastTypeRef.current !== event.type && !isStartOfLineRef.current) {
                    xtermRef.current.write('\r\n');
                    isStartOfLineRef.current = true;
                }
                lastTypeRef.current = event.type;

                if (isStartOfLineRef.current) {
                    const arrow = event.type === 'tx' ? '← ' : '→ ';
                    xtermRef.current.write(colorCode + arrow + '\x1b[0m');
                    isStartOfLineRef.current = false;
                }

                xtermRef.current.write(`${colorCode}${hexParts.join(' ')} \x1b[0m`);
                return;
            }

            // Text Mode
            let text = '';
            if (typeof event.data === 'string') {
                text = event.data;
            } else {
                try {
                    // Use streaming decode
                    text = decoderRef.current.decode(event.data, { stream: true });
                } catch (e) {
                    console.error('Decode error:', e);
                    // Fallback
                    text = new TextDecoder('utf-8').decode(event.data);
                }
            }
            // console.log('[SerialMonitorPanel] Text mode, text length:', text.length, 'content:', text.substring(0, 50));

            // Check if direction changed
            if (lastTypeRef.current && lastTypeRef.current !== event.type && !isStartOfLineRef.current) {
                // Direction changed mid-line -> Force newline to get new arrow
                xtermRef.current.write('\r\n');
                isStartOfLineRef.current = true;
            }
            lastTypeRef.current = event.type;

            // Colors
            // RX: Arrow Green (32), Text Bright Green (92)
            // TX: Arrow Blue (34), Text Magenta (95)
            const arrowColor = event.type === 'tx' ? '\x1b[1;34m' : '\x1b[1;32m'; // Bold arrows
            const textColor = event.type === 'tx' ? '\x1b[95m' : '\x1b[92m';
            // Block arrows for better visibility "Like a block/one" (These are the Clickable Targets)
            const arrow = event.type === 'tx' ? '◄ ' : '► ';

            // We split by newlines to inject badges and arrows
            const parts = text.split(/(\r\n|\r|\n)/);

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (part === '') continue;

                if (part === '\r\n' || part === '\r' || part === '\n') {
                    // Newline found
                    let badge = '';
                    if (part === '\r\n') badge = '\x1b[90m[CRLF]\x1b[0m'; // Gray
                    else if (part === '\r') badge = '\x1b[90m[CR]\x1b[0m';
                    else badge = '\x1b[90m[LF]\x1b[0m';

                    // VISUAL FIX: Always force a physical newline in the terminal for any of these line endings
                    // This prevents \r from overwriting the current line (which wipes arrows/data).
                    // We render the badge to show what it *was*, but we perform a CRLF to show it cleanly.
                    if (part === '\r') {
                        xtermRef.current.write(badge + '\r\n');
                    } else {
                        // \n is handled by convertEol: true to become \r\n
                        // \r\n is \r followed by \n.
                        xtermRef.current.write(badge + part);
                    }
                    isStartOfLineRef.current = true;
                } else {
                    // Content
                    if (isStartOfLineRef.current) {
                        xtermRef.current.write(arrowColor + arrow + '\x1b[0m');
                        isStartOfLineRef.current = false;
                    }
                    xtermRef.current.write(textColor + part + '\x1b[0m');
                }
            }
        };

        addSerialListener(handleData);
        return () => removeSerialListener(handleData);
    }, [addSerialListener, removeSerialListener, hexDisplay]);


    const handleSend = async (override?: string) => {
        const result = await sendSerialData(override);
        if (result === 'success') {
            setInputError(null);
        } else if (hexSend) {
            if (result === 'error_format') setInputError(t('dialog.errorFormat'));
            else if (result === 'error_range') setInputError(t('dialog.errorRange'));
            else setInputError(t('dialog.invalidHex'));
        }
    };

    // Handle Input keys (History + Enter)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (enterSends && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            } else if (!enterSends && e.shiftKey) {
                // Allow Shift+Enter to force send when "Enter to Send" is disabled
                e.preventDefault();
                handleSend();
            }
        } else if (e.key === 'ArrowUp' && e.shiftKey) {
            e.preventDefault();
            // History Back
            if (sentHistory.length === 0) {
                // No history at all
            } else {
                if (historyIndex === 0) {
                    // Already at oldest
                    setInputError(t('serial.noOlderHistory'));
                    // Clear msg after 2s
                    setTimeout(() => setInputError(null), 2000);
                } else {
                    const newIndex = historyIndex === -1 ? sentHistory.length - 1 : historyIndex - 1;
                    setHistoryIndex(newIndex);
                    setSerialInput(sentHistory[newIndex]);
                    setInputError(null); // Clear any previous msg
                }
            }
        } else if (e.key === 'ArrowDown' && e.shiftKey) {
            e.preventDefault();
            // History Forward
            if (historyIndex === -1) {
                setInputError(t('serial.noNewerHistory'));
                setTimeout(() => setInputError(null), 2000);
            } else {
                const newIndex = historyIndex + 1;
                if (newIndex >= sentHistory.length) {
                    // We were at last item, now going to "new"
                    setHistoryIndex(-1);
                    setSerialInput('');
                    setInputError(null);
                } else {
                    setHistoryIndex(newIndex);
                    setSerialInput(sentHistory[newIndex]);
                    setInputError(null);
                }
            }
        }
    };

    return (
        <div className={`flex-1 flex-row overflow-hidden ${isVisible ? 'flex' : 'hidden'}`}>
            {/* Left Sidebar: Settings */}
            <div className="w-64 flex flex-col border-r border-[#333] bg-[#252526]">
                {/* Scrollable Settings Area */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                    <div className="p-2 bg-[#252526] font-bold text-xs text-slate-400 uppercase tracking-wider flex justify-between items-center">
                        <span>{t('serial.settings')}</span>
                        <button
                            onClick={restoreDefaults}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                            title={t('serial.restoreDefaults')}
                        >
                            <RotateCcw size={12} />
                        </button>
                    </div>
                    {/* Port Selection */}
                    <div className="flex items-center justify-between gap-2">
                        <label className="text-xs text-slate-400 whitespace-nowrap">{t('serial.port')}</label>
                        <div className="flex gap-2 flex-1 min-w-0">
                            <select
                                className="flex-1 bg-[#333] text-slate-200 text-xs rounded px-2 py-1 outline-none border border-slate-600 min-w-0"
                                value={selectedPort}
                                onChange={(e) => setSelectedPort(e.target.value)}
                                disabled={isConnected}
                            >
                                <option value="">{t('serial.selectPort')}</option>
                                <option disabled>──────</option>
                                {ports.map(p => (
                                    <option key={p.path} value={p.path}>
                                        {p.friendlyName || p.path}
                                    </option>
                                ))}
                            </select>
                            <button onClick={refreshPorts} className="p-1 hover:bg-[#444] rounded text-slate-400 shrink-0" title={t('app.refreshPorts') || "Refresh Ports"}>
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Baud Rate */}
                    <div className="flex items-center justify-between gap-2">
                        <label className="text-xs text-slate-400 whitespace-nowrap">{t('serial.baudRate')}</label>
                        <select
                            className="bg-[#333] text-slate-200 text-xs rounded px-2 py-1 outline-none border border-slate-600 w-32"
                            value={baudRate}
                            onChange={(e) => setBaudRate(Number(e.target.value))}
                            disabled={isConnected}
                        >
                            {[9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000, 2000000].map(rate => (
                                <option key={rate} value={rate}>{rate}</option>
                            ))}
                        </select>
                    </div>

                    {/* Data Bits */}
                    <div className="flex items-center justify-between gap-2">
                        <label className="text-xs text-slate-400 whitespace-nowrap">{t('serial.dataBits')}</label>
                        <select className="bg-[#333] text-slate-200 text-xs rounded px-2 py-1 outline-none border border-slate-600 w-32" value={dataBits} onChange={e => setDataBits(Number(e.target.value) as any)} disabled={isConnected}>
                            <option value="8">8-bit</option>
                            <option value="7">7-bit</option>
                            <option value="6">6-bit</option>
                            <option value="5">5-bit</option>
                        </select>
                    </div>

                    {/* Stop Bits */}
                    <div className="flex items-center justify-between gap-2">
                        <label className="text-xs text-slate-400 whitespace-nowrap">{t('serial.stopBits')}</label>
                        <select className="bg-[#333] text-slate-200 text-xs rounded px-2 py-1 outline-none border border-slate-600 w-32" value={stopBits} onChange={e => setStopBits(Number(e.target.value) as any)} disabled={isConnected}>
                            <option value="1">1 Stop</option>
                            <option value="1.5">1.5 Stop</option>
                            <option value="2">2 Stop</option>
                        </select>
                    </div>

                    {/* Parity */}
                    <div className="flex items-center justify-between gap-2">
                        <label className="text-xs text-slate-400 whitespace-nowrap">{t('serial.parity')}</label>
                        <select className="bg-[#333] text-slate-200 text-xs rounded px-2 py-1 outline-none border border-slate-600 w-32" value={parity} onChange={e => setParity(e.target.value as any)} disabled={isConnected}>
                            <option value="none">{t('serial.parityNone')}</option>
                            <option value="even">{t('serial.parityEven')}</option>
                            <option value="odd">{t('serial.parityOdd')}</option>
                            <option value="mark">{t('serial.parityMark')}</option>
                            <option value="space">{t('serial.paritySpace')}</option>
                        </select>
                    </div>

                    {/* Line Ending */}
                    <div className="flex items-center justify-between gap-2">
                        <label className="text-xs text-slate-400 whitespace-nowrap">{t('serial.lineEnding')}</label>
                        <select
                            className={`bg-[#333] text-slate-200 text-xs rounded px-2 py-1 outline-none border border-slate-600 w-32 ${hexSend ? 'opacity-50 cursor-not-allowed' : ''}`}
                            value={lineEnding}
                            onChange={(e) => setLineEnding(e.target.value as any)}
                            disabled={hexSend}
                        >
                            <option value="none">{t('serial.lineEndingNone')}</option>
                            <option value="lf">{t('serial.lineEndingLF')}</option>
                            <option value="cr">{t('serial.lineEndingCR')}</option>
                            <option value="crlf">{t('serial.lineEndingCRLF')}</option>
                        </select>
                    </div>

                    <div className="h-px bg-[#444] my-1"></div>

                    {/* Toggles & Signals Compact Grid */}
                    <div className="flex flex-col gap-2 pt-1">
                        {/* 2x2 Grid for Booleans */}
                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                                <input type="checkbox" checked={hexDisplay} onChange={e => setHexDisplay(e.target.checked)} />
                                <span>{t('serial.hexDisplay')}</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                                <input type="checkbox" checked={hexSend} onChange={e => setHexSend(e.target.checked)} />
                                <span>{t('serial.hexInput')}</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                                <input type="checkbox" checked={dtrState} onChange={() => toggleDTR()} />
                                <span>DTR</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                                <input type="checkbox" checked={rtsState} onChange={() => toggleRTS()} />
                                <span>RTS</span>
                            </label>
                        </div>
                    </div>
                </div>



                {/* Fixed Bottom Area: Start/Stop Button */}
                <div className="p-4 border-t border-[#333] bg-[#252526]">
                    <button
                        onClick={clearSerial}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2 mb-2 rounded font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                        title={t('serial.clear')}
                    >
                        <Trash2 size={16} /> {t('serial.clear')}
                    </button>
                    <button
                        onClick={toggleSerial}
                        className={`w-full flex justify-center items-center gap-2 px-4 py-2 rounded font-bold transition-all ${isConnected ? 'bg-red-900/50 text-red-400 hover:bg-red-900' : 'bg-green-900/50 text-green-400 hover:bg-green-900'}`}
                    >
                        {isConnected ? <><XCircle size={16} /> {t('serial.stop')}</> : <><Monitor size={16} /> {t('serial.start')}</>}
                    </button>
                </div>
            </div>

            {/* Right Content: Terminal & Input */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black relative">
                {/* Xterm Terminal */}
                <div className="flex-1 relative overflow-hidden">
                    <XtermComponent
                        ref={xtermRef}
                        className="absolute inset-0"
                        onSelectionChange={setSelection}
                    />
                </div>

                {/* Input Area */}
                <div className="p-2 bg-[#252526] border-t border-[#333] flex gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            className={`w-full h-full bg-[#1e1e1e] text-slate-200 p-2 pr-8 rounded border outline-none
                                focus:border-blue-500 transition-colors font-mono text-xs resize-none leading-tight custom-scrollbar
                                ${inputError ? 'border-red-500' : 'border-[#333]'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            placeholder={!isConnected ? t('serial.pleaseConnect') : (hexSend ? t('serial.hexPlaceholder') : t('serial.sendPlaceholder', "Send data..."))}
                            value={serialInput}
                            disabled={!isConnected}
                            spellCheck={inputSpellCheck}
                            onChange={(e) => {
                                setSerialInput(e.target.value);
                                if (inputError) setInputError(null);
                                setHistoryIndex(-1);
                            }}
                            onKeyDown={handleKeyDown}
                        />
                        {inputError && (
                            <div className="absolute left-0 bottom-full mb-1 bg-red-900/90 text-red-200 text-[10px] px-2 py-1 rounded shadow-lg border border-red-700 animate-in fade-in slide-in-from-bottom-1 z-10 whitespace-nowrap">
                                {inputError}
                                <div className="absolute left-4 -bottom-1 w-2 h-2 bg-red-900/90 border-r border-b border-red-700 rotate-45 transform"></div>
                            </div>
                        )}
                        {lineEnding !== 'none' && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 select-none pointer-events-none font-mono font-bold bg-[#252526] px-1 rounded">
                                {lineEnding === 'lf' ? '\\n' : lineEnding === 'cr' ? '\\r' : '\\r\\n'}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => handleSend()}
                        disabled={!isConnected || (!serialInput && lineEnding === 'none')}
                        className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white w-12 rounded transition-colors"
                        title={t('serial.send')}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div >
    );
};
