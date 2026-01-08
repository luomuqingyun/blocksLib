/**
 * Logger utility for selective debug output.
 * Only logs to console when in Development mode (import.meta.env.DEV).
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
