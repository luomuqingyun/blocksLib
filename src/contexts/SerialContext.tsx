import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SerialPortInfo } from '../types/serial';
import { useTranslation } from 'react-i18next';
import { useSerialMonitor, SerialDataEvent } from '../hooks/serial/useSerialMonitor';
export type { SerialDataEvent };
import { useSerialActions } from '../hooks/serial/useSerialActions';

// ============================================================
// 1. 定义 Context 接口
// ============================================================

interface SerialContextType {
    ports: SerialPortInfo[];
    selectedPort: string;
    isConnected: boolean;
    serialInput: string;
    sentHistory: string[];

    baudRate: number;
    dataBits: 5 | 6 | 7 | 8;
    stopBits: 1 | 1.5 | 2;
    parity: 'none' | 'even' | 'mark' | 'odd' | 'space';
    hexDisplay: boolean;
    hexSend: boolean;
    lineEnding: 'none' | 'lf' | 'cr' | 'crlf';
    encoding: 'utf-8' | 'gbk' | 'ascii' | 'latin1';
    enterSends: boolean;
    clearInputOnSend: boolean;
    historyDeduplication: boolean;
    inputSpellCheck: boolean;

    dtrState: boolean;
    rtsState: boolean;
    toggleDTR: () => void;
    toggleRTS: () => void;

    setSelectedPort: (port: string) => void;
    setSerialInput: (input: string) => void;
    setBaudRate: (rate: number) => void;
    setDataBits: (bits: any) => void;
    setStopBits: (bits: any) => void;
    setParity: (parity: any) => void;
    setHexDisplay: (enabled: boolean) => void;
    setHexSend: (enabled: boolean) => void;
    setLineEnding: (ending: 'none' | 'lf' | 'cr' | 'crlf') => void;
    setEncoding: (encoding: 'utf-8' | 'gbk' | 'ascii' | 'latin1') => void;
    setEnterSends: (enabled: boolean) => void;
    setClearInputOnSend: (enabled: boolean) => void;
    setHistoryDeduplication: (enabled: boolean) => void;
    setInputSpellCheck: (enabled: boolean) => void;

    refreshPorts: () => Promise<void>;
    toggleSerial: () => void;
    clearSerial: () => void;
    sendSerialData: (data?: string) => Promise<'success' | 'error_format' | 'error_range' | 'error_send'>;
    restoreDefaults: () => Promise<void>;
    reloadHistory: () => Promise<void>;

    addSerialListener: (callback: (event: SerialDataEvent) => void) => void;
    removeSerialListener: (callback: (event: SerialDataEvent) => void) => void;
    addClearListener: (callback: () => void) => void;
    removeClearListener: (callback: () => void) => void;
}

const SerialContext = createContext<SerialContextType | undefined>(undefined);

const DEFAULT_SERIAL_SETTINGS = {
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    hexDisplay: false,
    hexSend: false,
    lineEnding: 'lf' as 'none' | 'lf' | 'cr' | 'crlf',
    encoding: 'utf-8' as 'utf-8' | 'gbk' | 'ascii' | 'latin1',
    enterSends: false,
    clearInputOnSend: false,
    historyDeduplication: true,
    inputSpellCheck: false
};

// ============================================================
// 2. Provider 组件
// ============================================================

export const SerialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useTranslation();

    const [ports, setPorts] = useState<SerialPortInfo[]>([]);
    const [selectedPort, setSelectedPort] = useState<string>('');
    const [isConnected, setIsConnected] = useState(false);

    const [baudRate, setBaudRate] = useState(115200);
    const [dataBits, setDataBits] = useState<5 | 6 | 7 | 8>(8);
    const [stopBits, setStopBits] = useState<1 | 1.5 | 2>(1);
    const [parity, setParity] = useState<'none' | 'even' | 'mark' | 'odd' | 'space'>('none');
    const [hexDisplay, setHexDisplay] = useState(false);
    const [hexSend, setHexSend] = useState(false);
    const [lineEnding, setLineEnding] = useState<'none' | 'lf' | 'cr' | 'crlf'>('lf');
    const [encoding, setEncoding] = useState<'utf-8' | 'gbk' | 'ascii' | 'latin1'>('utf-8');
    const [enterSends, setEnterSends] = useState(false);
    const [clearInputOnSend, setClearInputOnSend] = useState(false);
    const [historyDeduplication, setHistoryDeduplication] = useState(true);
    const [inputSpellCheck, setInputSpellCheck] = useState(false);

    const [serialInput, setSerialInput] = useState('');
    const [sentHistory, setSentHistory] = useState<string[]>([]);
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);
    const [dtrState, setDtrState] = useState(false);
    const [rtsState, setRtsState] = useState(false);

    const listenersRef = useRef<((event: SerialDataEvent) => void)[]>([]);
    const clearListenersRef = useRef<(() => void)[]>([]);

    const broadcastEvent = useCallback((event: SerialDataEvent) => {
        listenersRef.current.forEach(cb => {
            try { cb(event); } catch (e) { console.error('[SerialContext] Error in listener:', e); }
        });
    }, []);

    const broadcastClear = useCallback(() => {
        clearListenersRef.current.forEach(cb => cb());
    }, []);

    const addSerialListener = useCallback((cb: (event: SerialDataEvent) => void) => {
        listenersRef.current.push(cb);
    }, []);

    const removeSerialListener = useCallback((cb: (event: SerialDataEvent) => void) => {
        listenersRef.current = listenersRef.current.filter(x => x !== cb);
    }, []);

    const addClearListener = useCallback((cb: () => void) => {
        clearListenersRef.current.push(cb);
    }, []);

    const removeClearListener = useCallback((cb: () => void) => {
        clearListenersRef.current = clearListenersRef.current.filter(x => x !== cb);
    }, []);

    // 引入业务逻辑 Hooks
    useSerialMonitor({
        setIsConnected, setSelectedPort, broadcastEvent, setIsConfigLoaded,
        setBaudRate, setDataBits, setStopBits, setParity, setHexDisplay, setHexSend,
        setLineEnding, setEncoding, setEnterSends, setClearInputOnSend,
        setHistoryDeduplication, setInputSpellCheck, setSentHistory, setPorts
    });

    const actions = useSerialActions({
        isConnected, selectedPort, baudRate, dataBits, stopBits, parity,
        hexSend, lineEnding, encoding, clearInputOnSend, historyDeduplication,
        sentHistory, serialInput, dtrState, rtsState,
        setSerialInput, setSentHistory, setDtrState, setRtsState,
        broadcastEvent, broadcastClear
    });

    const { toggleSerial, sendSerialData, toggleDTR, toggleRTS, clearSerial } = actions;

    // 配置保存逻辑
    useEffect(() => {
        if (!isConfigLoaded || !window.electronAPI) return;
        const settings = {
            baudRate, dataBits, stopBits, parity, hexDisplay, hexSend, lineEnding, encoding,
            enterSends, clearInputOnSend, historyDeduplication, inputSpellCheck,
            lastPort: selectedPort
        };
        window.electronAPI.setConfig('serialSettings', settings);
    }, [baudRate, dataBits, stopBits, parity, hexDisplay, hexSend, lineEnding, encoding, enterSends, clearInputOnSend, historyDeduplication, inputSpellCheck, selectedPort, isConfigLoaded]);

    // 历史记录去重逻辑
    useEffect(() => {
        if (historyDeduplication && sentHistory.length > 0 && window.electronAPI) {
            const unique = [...new Set([...sentHistory].reverse())].reverse();
            if (unique.length !== sentHistory.length) {
                setSentHistory(unique);
                window.electronAPI.updateHistory(unique);
            }
        }
    }, [historyDeduplication, sentHistory, setSentHistory]);

    const refreshPorts = async () => {
        if (window.electronAPI) {
            const list = await window.electronAPI.listPorts();
            setPorts(list);
            if (list.length > 0 && !selectedPort) setSelectedPort(list[0].path);
        }
    };

    const restoreDefaults = async () => {
        if (!window.electronAPI) return;
        if (confirm(t('serial.confirmRestoreDefaults'))) {
            if (isConnected) await window.electronAPI.closeSerial();
            setBaudRate(DEFAULT_SERIAL_SETTINGS.baudRate);
            setDataBits(8); setStopBits(1); setParity('none');
            setHexDisplay(false); setHexSend(false);
            setLineEnding('lf'); setEncoding('utf-8');
            setHistoryDeduplication(true); setInputSpellCheck(false);
            if (ports.length > 0) setSelectedPort(ports[0].path);
            else setSelectedPort('');
        }
    };

    const reloadHistory = async () => {
        if (window.electronAPI?.getConfig) {
            const history = await window.electronAPI.getConfig('serialSettings.serialHistory');
            if (history && Array.isArray(history)) setSentHistory(history);
        }
    };

    const value = {
        ports, selectedPort, isConnected, serialInput, sentHistory,
        baudRate, dataBits, stopBits, parity, hexDisplay, hexSend, lineEnding, encoding, enterSends, clearInputOnSend, historyDeduplication, inputSpellCheck,
        dtrState, rtsState, toggleDTR, toggleRTS,
        setSelectedPort, setSerialInput, setBaudRate, setDataBits, setStopBits,
        setParity, setHexDisplay, setHexSend, setLineEnding, setEncoding, setEnterSends, setClearInputOnSend, setHistoryDeduplication, setInputSpellCheck,
        refreshPorts, toggleSerial, clearSerial, sendSerialData, restoreDefaults, reloadHistory,
        addSerialListener, removeSerialListener, addClearListener, removeClearListener
    };

    return <SerialContext.Provider value={value}>{children}</SerialContext.Provider>;
};

export const useSerial = () => {
    const context = useContext(SerialContext);
    if (!context) throw new Error('useSerial must be used within a SerialProvider');
    return context;
};
