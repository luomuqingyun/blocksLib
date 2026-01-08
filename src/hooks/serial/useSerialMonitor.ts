import { useEffect, useCallback } from 'react';

export interface SerialDataEvent {
    type: 'rx' | 'tx';
    data: string | Uint8Array;
    timestamp: number;
}

interface SerialMonitorProps {
    setIsConnected: (connected: boolean) => void;
    setSelectedPort: (port: string) => void;
    broadcastEvent: (event: SerialDataEvent) => void;
    setIsConfigLoaded: (loaded: boolean) => void;
    setBaudRate: (rate: number) => void;
    setDataBits: (bits: any) => void;
    setStopBits: (bits: any) => void;
    setParity: (parity: any) => void;
    setHexDisplay: (enabled: boolean) => void;
    setHexSend: (enabled: boolean) => void;
    setLineEnding: (ending: any) => void;
    setEncoding: (encoding: any) => void;
    setEnterSends: (enabled: boolean) => void;
    setClearInputOnSend: (enabled: boolean) => void;
    setHistoryDeduplication: (enabled: boolean) => void;
    setInputSpellCheck: (enabled: boolean) => void;
    setSentHistory: (history: string[]) => void;
    setPorts: (ports: any[]) => void;
}

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

        const init = async () => {
            const status = await window.electronAPI.getSerialStatus();
            setIsConnected(status.connected);

            let portToSelect = '';
            if (status.connected && status.port) {
                portToSelect = status.port;
                setSelectedPort(status.port);
            }

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

                if (!status.connected && settings.lastPort) {
                    portToSelect = settings.lastPort;
                    setSelectedPort(settings.lastPort);
                }
            }

            const history = await window.electronAPI.getConfig('serialSettings.serialHistory');
            if (history && Array.isArray(history)) {
                setSentHistory(history);
            }
            setIsConfigLoaded(true);

            const list = await window.electronAPI.listPorts();
            setPorts(list);
            if (list.length > 0 && !portToSelect) {
                setSelectedPort(list[0].path);
            }
        };

        const cleanupData = window.electronAPI.onMonitorData((data: any) => {
            let payload: string | Uint8Array;
            if (typeof data === 'string') {
                payload = data;
            } else if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
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

        const cleanupError = window.electronAPI.onMonitorError((err) => {
            broadcastEvent({
                type: 'rx',
                data: `\r\n\x1b[31m[Error] ${err}\x1b[0m\r\n`,
                timestamp: Date.now()
            });
        });

        init();

        return () => {
            cleanupData();
            cleanupStatus();
            cleanupError();
        };
    }, []);
};
