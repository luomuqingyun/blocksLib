/**
 * ============================================================
 * 串口通信类型定义 (Serial Communication Type Definitions)
 * ============================================================
 * 
 * 本文件定义了串口监视器功能所需的 TypeScript 类型。
 * 包括串口设备信息和通信日志条目的数据结构。
 * 
 * @file src/types/serial.ts
 * @module EmbedBlocks/Types/Serial
 */

/**
 * 串口设备信息接口
 * 描述系统检测到的串口设备的详细信息
 */
export interface SerialPortInfo {
    /** 串口路径 (如 "COM3" 或 "/dev/ttyUSB0") */
    path: string;
    /** 设备制造商名称 (可选) */
    manufacturer?: string;
    /** Windows 系统下的完整设备名称 (可选) */
    friendlyName?: string;
    /** USB 厂商 ID，十六进制字符串 (如 "1234") */
    vendorId?: string;
    /** USB 产品 ID，十六进制字符串 (如 "5678") */
    productId?: string;
}

/**
 * 串口日志条目接口
 * 描述串口监视器中的单条通信记录
 */
export interface LogEntry {
    /** 唯一标识符，用于 React 列表渲染的 key */
    id: string;
    /** 时间戳字符串 (可选) */
    timestamp?: string;
    /** 日志文本内容 */
    text: string;
    /** 日志类型: 'rx' 表示接收，'tx' 表示发送 */
    type: 'rx' | 'tx';
    /** 是否不自动添加换行符 (可选) */
    noNewline?: boolean;
    /** 行结束符类型: none/lf/cr/crlf/mixed (可选) */
    lineEndingType?: 'none' | 'lf' | 'cr' | 'crlf' | 'mixed';
    /** 是否以十六进制格式显示 (可选) */
    isHex?: boolean;
}
