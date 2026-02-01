/**
 * ============================================================
 * 日志工具类 (Logger Utility)
 * ============================================================
 * 
 * 提供分级日志输出功能，支持开发/生产模式区分。
 * 
 * 日志级别:
 * - debug(): 仅在开发模式下输出
 * - info(): 始终输出，但可被过滤
 * - warn(): 始终输出警告信息
 * - error(): 始终输出错误信息
 * 
 * 使用方式:
 * ```typescript
 * const logger = new Logger('MyModule');
 * logger.debug('This only shows in DEV mode');
 * logger.info('General information');
 * ```
 * 
 * @file src/utils/Logger.ts
 * @module EmbedBlocks/Frontend/Utils
 */

/**
 * 日志工具类
 * 可选择性地输出调试信息，仅在开发模式 (import.meta.env.DEV) 下显示 debug 日志
 */
export class Logger {
    private tag: string;

    constructor(tag: string) {
        this.tag = tag;
    }

    private formatMessage(message: string): string {
        return `[${this.tag}] ${message}`;
    }

    /**
     * Log a debug message. Only visible in DEV mode.
     */
    debug(message: string, ...args: any[]) {
        if (import.meta.env.DEV) {
            console.debug(this.formatMessage(message), ...args);
        }
    }

    /**
     * Log an info message. Visible in all modes, but can be filtered.
     */
    info(message: string, ...args: any[]) {
        console.info(this.formatMessage(message), ...args);
    }

    /**
     * Log a warning message. Always visible.
     */
    warn(message: string, ...args: any[]) {
        console.warn(this.formatMessage(message), ...args);
    }

    /**
     * Log an error message. Always visible.
     */
    error(message: string, ...args: any[]) {
        console.error(this.formatMessage(message), ...args);
    }
}
