/**
 * ============================================================
 * 串口操作 Hook (Serial Actions Hook)
 * ============================================================
 * 
 * 封装串口核心操作:
 * - toggleSerial(): 连接/断开串口
 * - sendSerialData(): 发送数据（支持文本/Hex）
 * - toggleDTR/RTS(): 切换控制信号
 * - 发送历史记录管理
 * 
 * @file src/hooks/serial/useSerialActions.ts
 * @module EmbedBlocks/Frontend/Hooks/Serial
 */

import { useCallback } from 'react';
import { SerialDataEvent } from './useSerialMonitor';


interface SerialActionsProps {
    isConnected: boolean;
    selectedPort: string;
    baudRate: number;
    dataBits: number;
    stopBits: number;
    parity: string;
    hexSend: boolean;
    lineEnding: string;
    encoding: string;
    clearInputOnSend: boolean;
    historyDeduplication: boolean;
    sentHistory: string[];
    serialInput: string;
    dtrState: boolean;
    rtsState: boolean;

    setSerialInput: (input: string) => void;
    setSentHistory: (history: string[]) => void;
    setDtrState: (state: boolean) => void;
    setRtsState: (state: boolean) => void;
    broadcastEvent: (event: SerialDataEvent) => void;
    broadcastClear: () => void;
}

export const useSerialActions = (props: SerialActionsProps) => {
    const {
        isConnected, selectedPort, baudRate, dataBits, stopBits, parity,
        hexSend, lineEnding, encoding, clearInputOnSend, historyDeduplication,
        sentHistory, serialInput, dtrState, rtsState,
        setSerialInput, setSentHistory, setDtrState, setRtsState,
        broadcastEvent, broadcastClear
    } = props;

    const toggleSerial = useCallback(async () => {
        if (!selectedPort || !window.electronAPI) return;

        if (isConnected) {
            await window.electronAPI.closeSerial();
        } else {
            const result = await window.electronAPI.openSerial(selectedPort, baudRate, dataBits, stopBits, parity);
            if (!result.success) {
                broadcastEvent({
                    type: 'rx',
                    data: `\r\n\x1b[31m[Error] Failed to open ${selectedPort}: ${result.error}\x1b[0m\r\n`,
                    timestamp: Date.now()
                });
            }
        }
    }, [selectedPort, isConnected, baudRate, dataBits, stopBits, parity, broadcastEvent]);

    const sendSerialData = useCallback(async (dataOverride?: string): Promise<'success' | 'error_format' | 'error_range' | 'error_send'> => {
        if (!window.electronAPI) return 'error_send';
        const rawContent = dataOverride !== undefined ? dataOverride : serialInput;
        if (!rawContent && lineEnding === 'none') return 'success';
        if (!isConnected) return 'error_send';

        let contentToSend = rawContent;
        let dataPayload: string | Uint8Array = contentToSend;

        if (hexSend) {
            let hexClean = '';
            const trimmed = contentToSend.trim();
            if (trimmed.length > 0) {
                if (/[^0-9A-Fa-f\s]/.test(trimmed)) return 'error_format';
                const tokens = trimmed.split(/\s+/);
                for (const token of tokens) {
                    if (token.length > 2 && token.length % 2 !== 0) return 'error_range';
                }
                hexClean = contentToSend.replace(/[^0-9A-Fa-f]/g, '');
                if (hexClean.length === 0 || hexClean.length % 2 !== 0) return 'error_format';
            } else if (contentToSend.length > 0) return 'error_format';

            let suffixBytes: number[] = [];
            if (lineEnding === 'lf') suffixBytes = [0x0A];
            else if (lineEnding === 'cr') suffixBytes = [0x0D];
            else if (lineEnding === 'crlf') suffixBytes = [0x0D, 0x0A];

            const buffer = new Uint8Array((hexClean.length / 2) + suffixBytes.length);
            for (let i = 0; i < hexClean.length; i += 2) {
                buffer[i / 2] = parseInt(hexClean.substr(i, 2), 16);
            }
            for (let i = 0; i < suffixBytes.length; i++) {
                buffer[(hexClean.length / 2) + i] = suffixBytes[i];
            }
            dataPayload = buffer;
        } else {
            let suffix = '';
            if (lineEnding === 'lf') suffix = '\n';
            else if (lineEnding === 'cr') suffix = '\r';
            else if (lineEnding === 'crlf') suffix = '\r\n';
            dataPayload = contentToSend + suffix;
        }

        try {
            const res = await window.electronAPI.sendSerial(dataPayload, { encoding });
            if (!res.success) throw new Error(res.error);
        } catch (e: any) {
            broadcastEvent({
                type: 'rx',
                data: `\r\n\x1b[31m[Error] Send Failed: ${e.message}\x1b[0m\r\n`,
                timestamp: Date.now()
            });
            return 'error_send';
        }

        broadcastEvent({ type: 'tx', data: dataPayload, timestamp: Date.now() });

        if (dataOverride === undefined && clearInputOnSend) setSerialInput('');

        if (contentToSend.trim()) {
            let newHistory = [...sentHistory];
            if (historyDeduplication) newHistory = newHistory.filter(item => item !== contentToSend);
            if (newHistory.length >= 100) newHistory.shift();
            newHistory.push(contentToSend);
            setSentHistory(newHistory);
            window.electronAPI.updateHistory(newHistory);
        }
        return 'success';
    }, [serialInput, lineEnding, isConnected, hexSend, encoding, broadcastEvent, clearInputOnSend, setSerialInput, sentHistory, historyDeduplication, setSentHistory]);

    const toggleDTR = useCallback(async () => {
        if (!window.electronAPI) return;
        const newState = !dtrState;
        setDtrState(newState);
        if (isConnected) await window.electronAPI.setSerialSignals(newState, rtsState);
    }, [dtrState, isConnected, rtsState, setDtrState]);

    const toggleRTS = useCallback(async () => {
        if (!window.electronAPI) return;
        const newState = !rtsState;
        setRtsState(newState);
        if (isConnected) await window.electronAPI.setSerialSignals(dtrState, newState);
    }, [rtsState, isConnected, dtrState, setRtsState]);

    return { toggleSerial, sendSerialData, toggleDTR, toggleRTS, clearSerial: broadcastClear };
};
