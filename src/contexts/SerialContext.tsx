/**
 * ============================================================
 * 串口通信上下文 (Serial Context)
 * ============================================================
 * 
 * 管理串口监视器的全局状态:
 * - 端口列表和选中端口
 * - 连接状态
 * - 通信参数 (波特率、数据位、停止位、校验)
 * - 显示设置 (HEX 显示、编码格式)
 * - 发送历史记录
 * - DTR/RTS 信号控制
 * 
 * 使用 useReducer 管理复杂状态，
 * 配置自动持久化到 electronAPI。
 * 
 * 依赖的 Hooks:
 * - useSerialMonitor: 监听串口事件
 * - useSerialActions: 串口操作 (连接、发送等)
 * 
 * @file src/contexts/SerialContext.tsx
 * @module EmbedBlocks/Frontend/Contexts/Serial
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { SerialPortInfo } from '../types/serial';
import { useTranslation } from 'react-i18next';
import { useSerialMonitor, SerialDataEvent } from '../hooks/serial/useSerialMonitor';
export type { SerialDataEvent };
import { useSerialActions } from '../hooks/serial/useSerialActions';


// ============================================================
// 1. 类型定义 (Types & State)
// ============================================================

export interface SerialState {
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
    isConfigLoaded: boolean;
}

type SerialAction =
    | { type: 'SET_PORTS'; payload: SerialPortInfo[] }
    | { type: 'SET_SELECTED_PORT'; payload: string }
    | { type: 'SET_CONNECTED'; payload: boolean }
    | { type: 'SET_SERIAL_INPUT'; payload: string }
    | { type: 'SET_SENT_HISTORY'; payload: string[] }
    | { type: 'SET_BAUD_RATE'; payload: number }
    | { type: 'SET_DATA_BITS'; payload: any }
    | { type: 'SET_STOP_BITS'; payload: any }
    | { type: 'SET_PARITY'; payload: any }
    | { type: 'SET_HEX_DISPLAY'; payload: boolean }
    | { type: 'SET_HEX_SEND'; payload: boolean }
    | { type: 'SET_LINE_ENDING'; payload: any }
    | { type: 'SET_ENCODING'; payload: any }
    | { type: 'SET_ENTER_SENDS'; payload: boolean }
    | { type: 'SET_CLEAR_INPUT_ON_SEND'; payload: boolean }
    | { type: 'SET_HISTORY_DEDUPLICATION'; payload: boolean }
    | { type: 'SET_INPUT_SPELL_CHECK'; payload: boolean }
    | { type: 'SET_DTR_STATE'; payload: boolean }
    | { type: 'SET_RTS_STATE'; payload: boolean }
    | { type: 'SET_CONFIG_LOADED'; payload: boolean }
    | { type: 'RESTORE_DEFAULTS'; payload: { ports: SerialPortInfo[] } };

const initialState: SerialState = {
    ports: [],
    selectedPort: '',
    isConnected: false,
    serialInput: '',
    sentHistory: [],
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    hexDisplay: false,
    hexSend: false,
    lineEnding: 'lf',
    encoding: 'utf-8',
    enterSends: false,
    clearInputOnSend: false,
    historyDeduplication: true,
    inputSpellCheck: false,
    dtrState: false,
    rtsState: false,
    isConfigLoaded: false
};

const DEFAULT_SETTINGS = {
    baudRate: 115200,
    dataBits: 8 as 5 | 6 | 7 | 8,
    stopBits: 1 as 1 | 1.5 | 2,
    parity: 'none' as 'none' | 'even' | 'mark' | 'odd' | 'space',
    hexDisplay: false,
    hexSend: false,
    lineEnding: 'lf' as 'none' | 'lf' | 'cr' | 'crlf',
    encoding: 'utf-8' as 'utf-8' | 'gbk' | 'ascii' | 'latin1',
    enterSends: false,
    clearInputOnSend: false,
    historyDeduplication: true,
    inputSpellCheck: false
};

function serialReducer(state: SerialState, action: SerialAction): SerialState {
    switch (action.type) {
        case 'SET_PORTS': return { ...state, ports: action.payload };
        case 'SET_SELECTED_PORT': return { ...state, selectedPort: action.payload };
        case 'SET_CONNECTED': return { ...state, isConnected: action.payload };
        case 'SET_SERIAL_INPUT': return { ...state, serialInput: action.payload };
        case 'SET_SENT_HISTORY': return { ...state, sentHistory: action.payload };
        case 'SET_BAUD_RATE': return { ...state, baudRate: action.payload };
        case 'SET_DATA_BITS': return { ...state, dataBits: action.payload };
        case 'SET_STOP_BITS': return { ...state, stopBits: action.payload };
        case 'SET_PARITY': return { ...state, parity: action.payload };
        case 'SET_HEX_DISPLAY': return { ...state, hexDisplay: action.payload };
        case 'SET_HEX_SEND': return { ...state, hexSend: action.payload };
        case 'SET_LINE_ENDING': return { ...state, lineEnding: action.payload };
        case 'SET_ENCODING': return { ...state, encoding: action.payload };
        case 'SET_ENTER_SENDS': return { ...state, enterSends: action.payload };
        case 'SET_CLEAR_INPUT_ON_SEND': return { ...state, clearInputOnSend: action.payload };
        case 'SET_HISTORY_DEDUPLICATION': return { ...state, historyDeduplication: action.payload };
        case 'SET_INPUT_SPELL_CHECK': return { ...state, inputSpellCheck: action.payload };
        case 'SET_DTR_STATE': return { ...state, dtrState: action.payload };
        case 'SET_RTS_STATE': return { ...state, rtsState: action.payload };
        case 'SET_CONFIG_LOADED': return { ...state, isConfigLoaded: action.payload };
        case 'RESTORE_DEFAULTS':
            return {
                ...state,
                ...DEFAULT_SETTINGS,
                selectedPort: action.payload.ports.length > 0 ? action.payload.ports[0].path : ''
            };
        default: return state;
    }
}

interface SerialContextType extends SerialState {
    dispatch: React.Dispatch<SerialAction>;
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
    toggleDTR: () => void;
    toggleRTS: () => void;

    addSerialListener: (callback: (event: SerialDataEvent) => void) => void;
    removeSerialListener: (callback: (event: SerialDataEvent) => void) => void;
    addClearListener: (callback: () => void) => void;
    removeClearListener: (callback: () => void) => void;
}

const SerialContext = createContext<SerialContextType | undefined>(undefined);

// ============================================================
// 2. Provider 组件
// ============================================================

export const SerialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useTranslation();
    const [state, dispatch] = useReducer(serialReducer, initialState);

    const listenersRef = useRef<((event: SerialDataEvent) => void)[]>([]);
    const clearListenersRef = useRef<(() => void)[]>([]);

    /** 
     * 广播串口数据事件 
     * 将订阅到的串口原始数据/解析后数据分发给所有监听者 (如多个串口监视器实例)
     */
    const broadcastEvent = useCallback((event: SerialDataEvent) => {
        listenersRef.current.forEach(cb => {
            try { cb(event); } catch (e) { console.error('[SerialContext] 监听回调出错:', e); }
        });
    }, []);

    /** 
     * 广播清屏事件 
     * 触发所有监视器的清空显示逻辑
     */
    const broadcastClear = useCallback(() => {
        clearListenersRef.current.forEach(cb => cb());
    }, []);

    /** 添加数据监听者 */
    const addSerialListener = useCallback((cb: (event: SerialDataEvent) => void) => {
        listenersRef.current.push(cb);
    }, []);

    /** 移除数据监听者 */
    const removeSerialListener = useCallback((cb: (event: SerialDataEvent) => void) => {
        listenersRef.current = listenersRef.current.filter(x => x !== cb);
    }, []);

    /** 添加清屏事件监听者 */
    const addClearListener = useCallback((cb: () => void) => {
        clearListenersRef.current.push(cb);
    }, []);

    /** 移除清屏事件监听者 */
    const removeClearListener = useCallback((cb: () => void) => {
        clearListenersRef.current = clearListenersRef.current.filter(x => x !== cb);
    }, []);

    // --- 供 UI 组件调用的辅助分发函数 (保持向后兼容) ---
    const setSelectedPort = (port: string) => dispatch({ type: 'SET_SELECTED_PORT', payload: port });
    const setSerialInput = (input: string) => dispatch({ type: 'SET_SERIAL_INPUT', payload: input });
    const setIsConnected = (connected: boolean) => dispatch({ type: 'SET_CONNECTED', payload: connected });
    const setIsConfigLoaded = (loaded: boolean) => dispatch({ type: 'SET_CONFIG_LOADED', payload: loaded });
    const setBaudRate = (rate: number) => dispatch({ type: 'SET_BAUD_RATE', payload: rate });
    const setDataBits = (bits: any) => dispatch({ type: 'SET_DATA_BITS', payload: bits });
    const setStopBits = (bits: any) => dispatch({ type: 'SET_STOP_BITS', payload: bits });
    const setParity = (parity: any) => dispatch({ type: 'SET_PARITY', payload: parity });
    const setHexDisplay = (enabled: boolean) => dispatch({ type: 'SET_HEX_DISPLAY', payload: enabled });
    const setHexSend = (enabled: boolean) => dispatch({ type: 'SET_HEX_SEND', payload: enabled });
    const setLineEnding = (ending: any) => dispatch({ type: 'SET_LINE_ENDING', payload: ending });
    const setEncoding = (encoding: any) => dispatch({ type: 'SET_ENCODING', payload: encoding });
    const setEnterSends = (enabled: boolean) => dispatch({ type: 'SET_ENTER_SENDS', payload: enabled });
    const setClearInputOnSend = (enabled: boolean) => dispatch({ type: 'SET_CLEAR_INPUT_ON_SEND', payload: enabled });
    const setHistoryDeduplication = (enabled: boolean) => dispatch({ type: 'SET_HISTORY_DEDUPLICATION', payload: enabled });
    const setInputSpellCheck = (enabled: boolean) => dispatch({ type: 'SET_INPUT_SPELL_CHECK', payload: enabled });
    const setSentHistory = (history: string[]) => dispatch({ type: 'SET_SENT_HISTORY', payload: history });
    const setPorts = (ports: any[]) => dispatch({ type: 'SET_PORTS', payload: ports });
    const setDtrState = (state: boolean) => dispatch({ type: 'SET_DTR_STATE', payload: state });
    const setRtsState = (state: boolean) => dispatch({ type: 'SET_RTS_STATE', payload: state });

    // 引入业务逻辑 Hooks
    useSerialMonitor({
        setIsConnected, setSelectedPort, broadcastEvent, setIsConfigLoaded,
        setBaudRate, setDataBits, setStopBits, setParity, setHexDisplay, setHexSend,
        setLineEnding, setEncoding, setEnterSends, setClearInputOnSend,
        setHistoryDeduplication, setInputSpellCheck, setSentHistory, setPorts
    });

    const actions = useSerialActions({
        ...state,
        setSerialInput, setSentHistory, setDtrState, setRtsState,
        broadcastEvent, broadcastClear
    });

    const { toggleSerial, sendSerialData, toggleDTR, toggleRTS, clearSerial } = actions;

    // 配置保存逻辑
    useEffect(() => {
        if (!state.isConfigLoaded || !window.electronAPI) return;
        const settings = {
            baudRate: state.baudRate,
            dataBits: state.dataBits,
            stopBits: state.stopBits,
            parity: state.parity,
            hexDisplay: state.hexDisplay,
            hexSend: state.hexSend,
            lineEnding: state.lineEnding,
            encoding: state.encoding,
            enterSends: state.enterSends,
            clearInputOnSend: state.clearInputOnSend,
            historyDeduplication: state.historyDeduplication,
            inputSpellCheck: state.inputSpellCheck,
            lastPort: state.selectedPort
        };
        window.electronAPI.setConfig('serialSettings', settings);
    }, [state.baudRate, state.dataBits, state.stopBits, state.parity, state.hexDisplay, state.hexSend, state.lineEnding, state.encoding, state.enterSends, state.clearInputOnSend, state.historyDeduplication, state.inputSpellCheck, state.selectedPort, state.isConfigLoaded]);

    /** 刷新可用串口列表 */
    const refreshPorts = async () => {
        if (window.electronAPI) {
            const list = await window.electronAPI.listPorts();
            setPorts(list);
            // 如果已有端口列表中存在项且未选中任何端口，默认选中第一个
            if (list.length > 0 && !state.selectedPort) setSelectedPort(list[0].path);
        }
    };

    /** 恢复串口配置为默认值 */
    const restoreDefaults = async () => {
        if (!window.electronAPI) return;
        if (confirm(t('serial.confirmRestoreDefaults'))) {
            // 如果当前已连接，先断开
            if (state.isConnected) await window.electronAPI.closeSerial();
            dispatch({ type: 'RESTORE_DEFAULTS', payload: { ports: state.ports } });
        }
    };

    /** 重新加载发送历史记录 (从全局配置中恢复) */
    const reloadHistory = async () => {
        if (window.electronAPI?.getConfig) {
            const history = await window.electronAPI.getConfig('serialSettings.serialHistory');
            if (history && Array.isArray(history)) setSentHistory(history);
        }
    };

    // --- 上下文对外暴露的值 ---
    const value = {
        ...state,
        dispatch,
        // Setter 函数
        setSelectedPort, setSerialInput, setBaudRate, setDataBits, setStopBits,
        setParity, setHexDisplay, setHexSend, setLineEnding, setEncoding, setEnterSends, setClearInputOnSend, setHistoryDeduplication, setInputSpellCheck,
        // 核心动作函数
        refreshPorts, toggleSerial, clearSerial, sendSerialData, restoreDefaults, reloadHistory, toggleDTR, toggleRTS,
        // 事件监听管理
        addSerialListener, removeSerialListener, addClearListener, removeClearListener
    };

    return <SerialContext.Provider value={value}>{children}</SerialContext.Provider>;
};

export const useSerial = () => {
    const context = useContext(SerialContext);
    if (!context) throw new Error('useSerial must be used within a SerialProvider');
    return context;
};
