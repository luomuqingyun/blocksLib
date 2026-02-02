/**
 * ============================================================
 * 串口监视器 Hook (Serial Monitor Hook)
 * ============================================================
 * 
 * 管理串口监视器的初始化和事件监听:
 * - 加载用户保存的串口配置
 * - 监听串口数据接收事件
 * - 监听连接状态变化和错误
 * - 广播事件给 UI 组件
 * 
 * @file src/hooks/serial/useSerialMonitor.ts
 * @module EmbedBlocks/Frontend/Hooks/Serial
 */

import { useEffect, useCallback } from 'react';


/** 串口数据事件接口 */
export interface SerialDataEvent {
    type: 'rx' | 'tx';           // 数据类型：接收(RX) 或 发送(TX)
    data: string | Uint8Array;    // 数据内容：字符串或二进制字节数组
    timestamp: number;           // 时间戳
}

/** 串口监视器钩子的参数接口 */
interface SerialMonitorProps {
    setIsConnected: (connected: boolean) => void;     // 更新连接状态的回调
    setSelectedPort: (port: string) => void;          // 更新选中端口的回调
    broadcastEvent: (event: SerialDataEvent) => void;  // 向外界广播串口事件的回调
    setIsConfigLoaded: (loaded: boolean) => void;      // 标记配置是否已初始加载完成
    setBaudRate: (rate: number) => void;              // 设置波特率的回调
    setDataBits: (bits: any) => void;                 // 设置数据位的回调
    setStopBits: (bits: any) => void;                 // 设置停止位的回调
    setParity: (parity: any) => void;                 // 设置校验位的回调
    setHexDisplay: (enabled: boolean) => void;        // 设置是否十六进制显示的回调
    setHexSend: (enabled: boolean) => void;           // 设置是否十六进制发送的回调
    setLineEnding: (ending: any) => void;             // 设置行尾结束符的回调
    setEncoding: (encoding: any) => void;            // 设置文本编码的回调
    setEnterSends: (enabled: boolean) => void;         // 设置回车是否发送的回调
    setClearInputOnSend: (enabled: boolean) => void;   // 设置发送后是否清空输入的回调
    setHistoryDeduplication: (enabled: boolean) => void; // 设置历史记录是否去重的回调
    setInputSpellCheck: (enabled: boolean) => void;    // 设置输入框拼写检查的回调
    setSentHistory: (history: string[]) => void;      // 更新发送历史的回调
    setPorts: (ports: any[]) => void;                 // 更新可用端口列表的回调
}

/**
 * 串口监视器核心 Hooks
 * 负责与 Electron 后端通信，管理串口状态和数据流的同步。
 */
export const useSerialMonitor = (props: SerialMonitorProps) => {
    const {
        setIsConnected,
        setSelectedPort,
        broadcastEvent,
        setIsConfigLoaded,
        setBaudRate,
        setDataBits,
        setStopBits,
        setParity,
        setHexDisplay,
        setHexSend,
        setLineEnding,
        setEncoding,
        setEnterSends,
        setClearInputOnSend,
        setHistoryDeduplication,
        setInputSpellCheck,
        setSentHistory,
        setPorts
    } = props;

    useEffect(() => {
        if (!window.electronAPI) return;

        /**
         * 初始化串口和配置
         * 1. 检查当前真实的串口连接状态。
         * 2. 加载用户持久化的串口参数（波特率、显示模式等）。
         * 3. 扫描可用串口并自动选中最合适的端口。
         */
        const init = async () => {
            // 获取并同步前端连接状态
            const status = await window.electronAPI.getSerialStatus();
            setIsConnected(status.connected);

            let portToSelect = '';
            if (status.connected && status.port) {
                portToSelect = status.port;
                setSelectedPort(status.port);
            }

            // 从全局配置中恢复串口监视器设置
            const settings = await window.electronAPI.getConfig('serialSettings');
            if (settings) {
                if (settings.baudRate) setBaudRate(settings.baudRate);
                if (settings.dataBits) setDataBits(settings.dataBits);
                if (settings.stopBits) setStopBits(settings.stopBits);
                if (settings.parity) setParity(settings.parity);
                if (settings.hexDisplay !== undefined) setHexDisplay(settings.hexDisplay);
                if (settings.hexSend !== undefined) setHexSend(settings.hexSend);
                if (settings.lineEnding) setLineEnding(settings.lineEnding);
                if (settings.encoding) setEncoding(settings.encoding);
                if (settings.enterSends !== undefined) setEnterSends(settings.enterSends);
                if (settings.clearInputOnSend !== undefined) setClearInputOnSend(settings.clearInputOnSend);
                if (settings.historyDeduplication !== undefined) setHistoryDeduplication(settings.historyDeduplication);
                if (settings.inputSpellCheck !== undefined) setInputSpellCheck(settings.inputSpellCheck);

                // 如果没连串口，尝试选中上次使用的端口
                if (!status.connected && settings.lastPort) {
                    portToSelect = settings.lastPort;
                    setSelectedPort(settings.lastPort);
                }
            }

            // 恢复发送历史
            const history = await window.electronAPI.getConfig('serialSettings.serialHistory');
            if (history && Array.isArray(history)) {
                setSentHistory(history);
            }
            setIsConfigLoaded(true);

            // 获取端口列表并自动选中
            const list = await window.electronAPI.listPorts();
            setPorts(list);
            if (list.length > 0 && !portToSelect) {
                setSelectedPort(list[0].path);
            }
        };

        /**
         * 监听串口数据接收事件 (RX)
         * 处理各种可能的数据格式并统一转换为字符串或 Uint8Array 发送给 UI。
         */
        const cleanupData = window.electronAPI.onMonitorData((data: any) => {
            let payload: string | Uint8Array;
            if (typeof data === 'string') {
                payload = data;
            } else if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
                // 处理 Electron/Node 传递过来的 Buffer 对象包装
                payload = new Uint8Array(data.data);
            } else if (data instanceof Uint8Array) {
                payload = data;
            } else {
                try {
                    payload = new Uint8Array(data);
                } catch (e) {
                    console.error('[SerialMonitor] Unknown data format:', data);
                    return;
                }
            }

            broadcastEvent({
                type: 'rx',
                data: payload,
                timestamp: Date.now()
            });
        });

        /** 监听串口物理状态变化 (连接/断开) */
        const cleanupStatus = window.electronAPI.onMonitorStatus((status) => {
            setIsConnected(status.connected);
            if (status.connected && status.port) {
                setSelectedPort(status.port);
                broadcastEvent({
                    type: 'rx',
                    data: `\r\n\x1b[32m[System] Connected to ${status.port}\x1b[0m\r\n`,
                    timestamp: Date.now()
                });
            } else if (!status.connected) {
                broadcastEvent({
                    type: 'rx',
                    data: `\r\n\x1b[31m[System] Serial Port Disconnected\x1b[0m\r\n`,
                    timestamp: Date.now()
                });
            }
        });

        /** 监听串口发生的底层错误 */
        const cleanupError = window.electronAPI.onMonitorError((err) => {
            broadcastEvent({
                type: 'rx',
                data: `\r\n\x1b[31m[Error] ${err}\x1b[0m\r\n`,
                timestamp: Date.now()
            });
        });

        init();

        // 卸载钩子时，移除所有 IPC 监听器以防止内存泄漏
        return () => {
            cleanupData();
            cleanupStatus();
            cleanupError();
        };
    }, []);
};
