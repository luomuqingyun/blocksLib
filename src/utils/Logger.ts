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

    /**
     * 初始化日志工具
     * @param tag - 模块标识标签，通常为类名或文件名
     */
    constructor(tag: string) {
        this.tag = tag;
    }

    /**
     * 内部辅助：格式化日志消息，带上模块标签
     */
    private formatMessage(message: string): string {
        return `[${this.tag}] ${message}`;
    }

    /**
     * 输出调试信息 (Debug)
     * 仅在开发环境 (import.meta.env.DEV 为 true) 下生效，生产环境将静默。
     */
    debug(message: string, ...args: any[]) {
        if (import.meta.env.DEV) {
            console.debug(this.formatMessage(message), ...args);
        }
    }

    /**
     * 输出提示性信息 (Info)
     * 在所有环境下均会输出。
     */
    info(message: string, ...args: any[]) {
        console.info(this.formatMessage(message), ...args);
    }

    /**
     * 输出警告信息 (Warn)
     */
    warn(message: string, ...args: any[]) {
        console.warn(this.formatMessage(message), ...args);
    }

    /**
     * 输出错误信息 (Error)
     */
    error(message: string, ...args: any[]) {
        console.error(this.formatMessage(message), ...args);
    }
}
