/**
 * ============================================================
 * 串口通信服务 (Serial Service)
 * ============================================================
 * 
 * 负责与物理串口设备进行通信的底层服务。
 * 继承自 EventEmitter 以广播 data, status, error 事件。
 * 
 * 主要功能:
 * - listPorts: 列出可用串口
 * - open: 打开串口连接
 * - close: 关闭串口连接
 * - send: 发送数据 (支持 UTF-8/GBK 编码)
 * - setSignals: 设置 DTR/RTS 信号 (用于复位等)
 * 
 * @file electron/services/SerialService.ts
 * @module EmbedBlocks/Electron/Services/SerialService
 */

import { SerialPort } from 'serialport';
import { EventEmitter } from 'events';
import iconv from 'iconv-lite';

/** 串口配置接口 */
export interface SerialConfig {
    path: string;                                    // 串口路径 (如 COM3, /dev/ttyUSB0)
    baudRate: number;                                // 波特率
    dataBits: 5 | 6 | 7 | 8;                        // 数据位
    stopBits: 1 | 1.5 | 2;                          // 停止位
    parity: 'none' | 'even' | 'mark' | 'odd' | 'space'; // 校验位
}

/**
 * 串口服务类
 * 继承 EventEmitter 以支持事件广播
 */
export class SerialService extends EventEmitter {
    /** 当前活动的串口实例 */
    private activeSerialPort: SerialPort | null = null;
    /** 当前活动的串口配置 */
    private activeSerialConfig: SerialConfig | null = null;

    constructor() {
        super();
    }

    /**
     * 列出系统可用的串口
     * @returns 串口信息数组 (包含路径、厂商、VID/PID等)
     */
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

    /**
     * 打开串口连接
     * 支持三次重试以处理端口被占用的情况
     * @param config 串口配置
     * @returns 打开结果
     */
    public async open(config: SerialConfig): Promise<{ success: boolean; error?: string }> {
        // 延时辅助函数
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // 先关闭已存在的连接
        this.close();
        await wait(100); // 给操作系统时间释放句柄

        let lastError;
        // 尝试三次打开
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                // 创建串口实例
                this.activeSerialPort = new SerialPort({
                    path: config.path,
                    baudRate: config.baudRate,
                    dataBits: config.dataBits,
                    stopBits: config.stopBits,
                    parity: config.parity,
                    autoOpen: false // 手动打开
                });

                this.activeSerialConfig = config;

                // 异步打开端口
                await new Promise<void>((resolve, reject) => {
                    this.activeSerialPort!.open((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // 打开成功，广播状态
                this.emit('status', { connected: true, port: config.path });

                // 设置数据接收事件
                this.activeSerialPort.on('data', (data) => {
                    this.emit('data', data);
                });

                // 设置错误事件
                this.activeSerialPort.on('error', (err) => {
                    this.emit('error', err.message);
                });

                // 设置关闭事件
                this.activeSerialPort.on('close', () => {
                    this.emit('status', { connected: false });
                    this.activeSerialConfig = null;
                });

                return { success: true };

            } catch (e: any) {
                lastError = e;
                console.log(`Serial open attempt ${attempt} failed: ${e.message}`);
                // 清理失败的连接
                if (this.activeSerialPort && this.activeSerialPort.isOpen) {
                    this.activeSerialPort.close();
                }
                this.activeSerialPort = null;
                await wait(200); // 等待后重试
            }
        }

        return { success: false, error: lastError?.message };
    }

    /** 关闭串口连接 */
    public close() {
        if (this.activeSerialPort && this.activeSerialPort.isOpen) {
            this.activeSerialPort.close();
            this.activeSerialPort = null;
            this.activeSerialConfig = null;
        }
    }

    /** 获取当前连接状态 */
    public getStatus() {
        return {
            connected: !!(this.activeSerialPort && this.activeSerialPort.isOpen),
            port: (this.activeSerialPort && this.activeSerialPort.isOpen) ? this.activeSerialConfig?.path : null
        };
    }

    /**
     * 发送数据到串口
     * @param data 要发送的数据 (字符串/Buffer/Uint8Array)
     * @param options 发送选项，包含 encoding (支持 'gbk' 或默认 utf-8)
     * @returns 发送结果
     */
    public async send(data: string | Buffer | Uint8Array, options?: { encoding?: string }): Promise<{ success: boolean; error?: string }> {
        if (this.activeSerialPort && this.activeSerialPort.isOpen) {
            try {
                let bufferToSend: Buffer;

                console.log(`[SerialService] Send called. Data type: ${typeof data}, Encoding request: ${options?.encoding}`);

                // 根据数据类型处理
                if (Buffer.isBuffer(data)) {
                    bufferToSend = data;
                } else if (data instanceof Uint8Array) {
                    bufferToSend = Buffer.from(data);
                } else if (typeof data === 'string') {
                    // 支持 GBK 编码 (用于中文显示)
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

                // 异步写入数据
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

    /**
     * 设置 DTR/RTS 信号
     * 用于控制开发板复位或进入编程模式
     * @param signals 信号设置 (包含 dtr 和 rts 布尔值)
     * @returns 设置结果
     */
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

/** 导出单例服务实例 */
export const serialService = new SerialService();
