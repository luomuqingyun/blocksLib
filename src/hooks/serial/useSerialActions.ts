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


/**
 * 串口操作钩子的参数接口
 */
interface SerialActionsProps {
    isConnected: boolean;       // 串口是否已连接
    selectedPort: string;       // 当前选中的串口名称（如 COM3, /dev/ttyUSB0）
    baudRate: number;           // 波特率
    dataBits: number;           // 数据位 (5, 6, 7, 8)
    stopBits: number;           // 停止位 (1, 1.5, 2)
    parity: string;             // 校验位 (none, even, odd, mark, space)
    hexSend: boolean;           // 是否开启 Hex 十六进制发送模式
    lineEnding: string;         // 行尾结束符模式 (none, lf, cr, crlf)
    encoding: string;           // 文本编码格式 (utf-8, gbk 等)
    clearInputOnSend: boolean;  // 发送后是否自动清空输入框
    historyDeduplication: boolean; // 历史记录是否自动去重
    sentHistory: string[];      // 已发送内容的历史记录列表
    serialInput: string;        // 当前输入框中的内容
    dtrState: boolean;          // DTR 信号状态
    rtsState: boolean;          // RTS 信号状态

    setSerialInput: (input: string) => void;         // 设置输入框内容的函数
    setSentHistory: (history: string[]) => void;     // 更新历史记录的函数
    setDtrState: (state: boolean) => void;           // 更新 DTR 状态的函数
    setRtsState: (state: boolean) => void;           // 更新 RTS 状态的函数
    broadcastEvent: (event: SerialDataEvent) => void; // 向监视器广播串口事件（RX/TX 数据）
    broadcastClear: () => void;                      // 广播清屏指令
}

export const useSerialActions = (props: SerialActionsProps) => {
    const {
        isConnected, selectedPort, baudRate, dataBits, stopBits, parity,
        hexSend, lineEnding, encoding, clearInputOnSend, historyDeduplication,
        sentHistory, serialInput, dtrState, rtsState,
        setSerialInput, setSentHistory, setDtrState, setRtsState,
        broadcastEvent, broadcastClear
    } = props;

    /**
     * 切换串口连接状态
     * 如果已连接则断开，如果未连接则尝试根据当前配置打开串口。
     */
    const toggleSerial = useCallback(async () => {
        if (!selectedPort || !window.electronAPI) return;

        if (isConnected) {
            await window.electronAPI.closeSerial();
        } else {
            const result = await window.electronAPI.openSerial(selectedPort, baudRate, dataBits, stopBits, parity);
            if (!result.success) {
                // 如果打开失败，在监视器中打印错误信息
                broadcastEvent({
                    type: 'rx',
                    data: `\r\n\x1b[31m[Error] Failed to open ${selectedPort}: ${result.error}\x1b[0m\r\n`,
                    timestamp: Date.now()
                });
            }
        }
    }, [selectedPort, isConnected, baudRate, dataBits, stopBits, parity, broadcastEvent]);

    /**
     * 向串口发送数据
     * 支持文本和 Hex 两种模式，并自动追加行尾结束符。
     * 
     * @param dataOverride - 可选，直接发送指定内容而非输入框内容。
     * @returns 发送状态码
     */
    const sendSerialData = useCallback(async (dataOverride?: string): Promise<'success' | 'error_format' | 'error_range' | 'error_send'> => {
        if (!window.electronAPI) return 'error_send';
        const rawContent = dataOverride !== undefined ? dataOverride : serialInput;
        if (!rawContent && lineEnding === 'none') return 'success';
        if (!isConnected) return 'error_send';

        let contentToSend = rawContent;
        let dataPayload: string | Uint8Array = contentToSend;

        if (hexSend) {
            // Hex 发送模式逻辑
            let hexClean = '';
            const trimmed = contentToSend.trim();
            if (trimmed.length > 0) {
                // 1. 简单校验：只允许十六进制字符和空格
                if (/[^0-9A-Fa-f\s]/.test(trimmed)) return 'error_format';

                // 2. 单词长度校验：不支持奇数长度的 Hex 单词（非严格，但有助于防止歧义）
                const tokens = trimmed.split(/\s+/);
                for (const token of tokens) {
                    if (token.length > 2 && token.length % 2 !== 0) return 'error_range';
                }

                // 3. 提取纯 Hex 字符串
                hexClean = contentToSend.replace(/[^0-9A-Fa-f]/g, '');
                if (hexClean.length === 0 || hexClean.length % 2 !== 0) return 'error_format';
            } else if (contentToSend.length > 0) return 'error_format';

            // 4. 构建二进制 Buffer 并追加行尾结束符对应的字节
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
            // 文本发送模式逻辑
            let suffix = '';
            if (lineEnding === 'lf') suffix = '\n';
            else if (lineEnding === 'cr') suffix = '\r';
            else if (lineEnding === 'crlf') suffix = '\r\n';
            dataPayload = contentToSend + suffix;
        }

        try {
            // 执行实际的 IPC 发送调用
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

        // 记录发送日志
        broadcastEvent({ type: 'tx', data: dataPayload, timestamp: Date.now() });

        // 根据配置清理输入框
        if (dataOverride === undefined && clearInputOnSend) setSerialInput('');

        // 更新并持久化历史记录
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

    /** 切换 DTR (Data Terminal Ready) 信号状态 */
    const toggleDTR = useCallback(async () => {
        if (!window.electronAPI) return;
        const newState = !dtrState;
        setDtrState(newState);
        if (isConnected) await window.electronAPI.setSerialSignals(newState, rtsState);
    }, [dtrState, isConnected, rtsState, setDtrState]);

    /** 切换 RTS (Request To Send) 信号状态 */
    const toggleRTS = useCallback(async () => {
        if (!window.electronAPI) return;
        const newState = !rtsState;
        setRtsState(newState);
        if (isConnected) await window.electronAPI.setSerialSignals(dtrState, newState);
    }, [rtsState, isConnected, dtrState, setRtsState]);

    return { toggleSerial, sendSerialData, toggleDTR, toggleRTS, clearSerial: broadcastClear };
};
