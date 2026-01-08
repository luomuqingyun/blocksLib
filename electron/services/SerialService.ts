import { SerialPort } from 'serialport';
import { EventEmitter } from 'events';
import iconv from 'iconv-lite';

export interface SerialConfig {
    path: string;
    baudRate: number;
    dataBits: 5 | 6 | 7 | 8;
    stopBits: 1 | 1.5 | 2;
    parity: 'none' | 'even' | 'mark' | 'odd' | 'space';
}

// ============================================================
// 串口服务 (Serial Service)
// ============================================================
// 负责与物理串口设备进行通信的底层服务。
// 继承自 EventEmitter 以广播 data, status, error 事件。
export class SerialService extends EventEmitter {
    private activeSerialPort: SerialPort | null = null;
    private activeSerialConfig: SerialConfig | null = null;

    constructor() {
        super();
    }

    // ----------------------------------------------------------------
    // 列出端口 (List Ports)
    // 获取当前系统可用的串口列表
    // ----------------------------------------------------------------
    public async listPorts() {
        try {
            const ports = await SerialPort.list();
            return ports.map((p: any) => ({
                path: p.path,
                manufacturer: p.manufacturer,
                friendlyName: p.friendlyName,
                vendorId: p.vendorId,
                productId: p.productId
            }));
        } catch (e) {
            return [];
        }
    }

    // ----------------------------------------------------------------
    // 打开串口 (Open Port)
    // 建立连接并配置波特率、校验位等参数
    // ----------------------------------------------------------------
    public async open(config: SerialConfig): Promise<{ success: boolean; error?: string }> {
        // Helper to wait
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Close existing port first
        this.close();
        await wait(100); // Give OS time to release the handle

        let lastError;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                this.activeSerialPort = new SerialPort({
                    path: config.path,
                    baudRate: config.baudRate,
                    dataBits: config.dataBits,
                    stopBits: config.stopBits,
                    parity: config.parity,
                    autoOpen: false
                });

                this.activeSerialConfig = config;

                await new Promise<void>((resolve, reject) => {
                    this.activeSerialPort!.open((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Success
                this.emit('status', { connected: true, port: config.path });

                this.activeSerialPort.on('data', (data) => {
                    this.emit('data', data);
                });

                this.activeSerialPort.on('error', (err) => {
                    this.emit('error', err.message);
                });

                this.activeSerialPort.on('close', () => {
                    this.emit('status', { connected: false });
                    this.activeSerialConfig = null;
                });

                return { success: true };

            } catch (e: any) {
                lastError = e;
                console.log(`Serial open attempt ${attempt} failed: ${e.message}`);
                if (this.activeSerialPort && this.activeSerialPort.isOpen) {
                    this.activeSerialPort.close();
                }
                this.activeSerialPort = null;
                await wait(200); // Wait before retry
            }
        }

        return { success: false, error: lastError?.message };
    }

    public close() {
        if (this.activeSerialPort && this.activeSerialPort.isOpen) {
            this.activeSerialPort.close();
            this.activeSerialPort = null;
            this.activeSerialConfig = null;
        }
    }

    public getStatus() {
        return {
            connected: !!(this.activeSerialPort && this.activeSerialPort.isOpen),
            port: (this.activeSerialPort && this.activeSerialPort.isOpen) ? this.activeSerialConfig?.path : null
        };
    }

    public async send(data: string | Buffer | Uint8Array, options?: { encoding?: string }): Promise<{ success: boolean; error?: string }> {
        if (this.activeSerialPort && this.activeSerialPort.isOpen) {
            try {
                let bufferToSend: Buffer;

                // Debug Log
                console.log(`[SerialService] Send called. Data type: ${typeof data}, Encoding request: ${options?.encoding}`);

                if (Buffer.isBuffer(data)) {
                    bufferToSend = data;
                } else if (data instanceof Uint8Array) {
                    bufferToSend = Buffer.from(data);
                } else if (typeof data === 'string') {
                    if (options?.encoding && options.encoding.toLowerCase() === 'gbk') {
                        console.log(`[SerialService] Encoding to GBK with iconv-lite...`);
                        bufferToSend = iconv.encode(data, 'gbk');
                    } else {
                        bufferToSend = Buffer.from(data, 'utf-8');
                    }
                } else {
                    return { success: false, error: "Invalid data type" };
                }

                console.log(`[SerialService] Final Buffer to write:`, bufferToSend);

                await new Promise<void>((resolve, reject) => {
                    this.activeSerialPort?.write(bufferToSend, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                return { success: true };
            } catch (e: any) {
                console.error('[SerialService] Send Error:', e);
                return { success: false, error: e.message };
            }
        } else {
            console.warn('[SerialService] Send failed: Port not open');
            return { success: false, error: "Port not open" };
        }
    }
    public async setSignals(signals: { dtr?: boolean; rts?: boolean }): Promise<{ success: boolean; error?: string }> {
        if (this.activeSerialPort && this.activeSerialPort.isOpen) {
            try {
                await new Promise<void>((resolve, reject) => {
                    this.activeSerialPort!.set(signals, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        } else {
            return { success: false, error: "Port not open" };
        }
    }
}

export const serialService = new SerialService();
