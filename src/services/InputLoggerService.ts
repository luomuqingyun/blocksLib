/**
 * ============================================================
 * 全过程交互诊断记录器 (Interaction Diagnostic Logger)
 * ============================================================
 * 
 * 自动记录应用程序中的所有关键交互事件 (键盘, 鼠标, 焦点)，
 * 用于诊断 intermittent focus loss 或 input unresponsiveness 等问题。
 * 
 * @file src/services/InputLoggerService.ts
 */

export interface InteractionLogEntry {
    time: string;
    type: 'KBD' | 'MOUSE' | 'SYS' | 'LOG';
    action: string;
    target: string;
    detail: string;
    isPrevented?: boolean;
    isStopped?: boolean;
}

class InputLoggerService {
    private logs: InteractionLogEntry[] = [];
    private initialized = false;
    private maxLogs = 5000; // 限制日志数量防止内存溢出

    /**
     * 初始化全局监听器
     */
    public init() {
        if (this.initialized) return;

        console.log('[InputLogger] Diagnostic Logger started.');

        // 键盘监听 (使用捕获阶段确保记录所有事件)
        window.addEventListener('keydown', (e) => {
            // [NEW] 全局快捷键 Ctrl + Shift + L 强制导出并保存
            if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'L') {
                e.preventDefault();
                e.stopPropagation();
                this.savePersistentLog();
                this.downloadLog();
                return;
            }
            this.recordKeyboardEvent(e);
        }, true);

        // 鼠标监听
        window.addEventListener('mousedown', (e) => this.recordMouseEvent('MOUSE_DOWN', e), true);
        window.addEventListener('click', (e) => this.recordMouseEvent('CLICK', e), true);

        // 焦点监听 (针对组件和输入框的内部焦点的切换)
        window.addEventListener('focus', (e) => this.recordFocusEvent('FOCUS', e), true);
        window.addEventListener('blur', (e) => this.recordFocusEvent('BLUR', e), true);

        // [NEW] 启动时尝试同步一次 (清空旧日志或初始化文件)
        setTimeout(() => this.savePersistentLog(), 2000);

        // [NEW] 定时自动保存 (每 5 分钟)
        setInterval(() => this.savePersistentLog(), 5 * 60 * 1000);

        // 暴露全局导出接口
        (window as any).exportEmbedBlocksLogs = () => {
            this.savePersistentLog();
            this.downloadLog();
        };

        this.initialized = true;
    }

    /**
     * [NEW] 持久化保存日志到本地项目 logs 目录
     */
    public async savePersistentLog() {
        if (!window.electronAPI) return;

        try {
            const workDir = await window.electronAPI.getWorkDir();
            if (!workDir) return;

            const logPath = `${workDir}/logs/interaction_diag.md`;
            const content = this.getMarkdownLogs();

            await window.electronAPI.saveFileContent(content, logPath);
            console.log(`[InputLogger] Log persisted to: ${logPath}`);
        } catch (err) {
            console.warn('[InputLogger] Failed to persist log:', err);
        }
    }

    private log(type: 'KBD' | 'MOUSE' | 'SYS' | 'LOG', action: string, target: string, detail: string, isPrevented = false, isStopped = false) {
        const entry: InteractionLogEntry = {
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '.' + new Date().getMilliseconds().toString().padStart(3, '0'),
            type,
            action,
            target,
            detail,
            isPrevented,
            isStopped
        };

        this.logs.unshift(entry); // 最新的在前
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }
    }

    private getElementIdentifier(el: EventTarget | null): string {
        if (!(el instanceof HTMLElement || el instanceof SVGElement)) return 'N/A';
        const id = el.id ? `#${el.id}` : '';
        const classes = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').join('.')}` : '';
        return `${el.tagName}${id}${classes}`;
    }

    private recordKeyboardEvent(e: KeyboardEvent) {
        const detail = `Key: ${e.key} | Code: ${e.code} | Ctrl: ${e.ctrlKey} | Shift: ${e.shiftKey} | Alt: ${e.altKey}`;
        this.log('KBD', e.key, this.getElementIdentifier(e.target), detail, e.defaultPrevented);
    }

    private recordMouseEvent(action: string, e: MouseEvent) {
        const detail = `Coord: (${e.clientX}, ${e.clientY}) | Button: ${e.button}`;
        this.log('MOUSE', action, this.getElementIdentifier(e.target), detail, e.defaultPrevented);
    }

    private recordFocusEvent(action: string, e: FocusEvent) {
        this.log('SYS', action, this.getElementIdentifier(e.target), 'Focus transition');
    }

    /**
     * 生成 Markdown 格式的日志
     */
    public getMarkdownLogs(): string {
        let md = `# EmbedBlocks Interaction Diagnostic Record (${new Date().toLocaleString()})\n\n`;
        md += `| Time | Type | Action | Target Element | Detail | Status |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

        const typeMap = { KBD: '⌨️ KBD', MOUSE: '🖱️ MOUSE', SYS: '⚙️ SYS', LOG: '📝 LOG' };

        // 为了查看方便，倒序输出 (即按时间顺序)
        [...this.logs].reverse().forEach(l => {
            const status = (l.isPrevented ? '[Prevented] ' : '') + (l.isStopped ? '[Stopped]' : '');
            md += `| ${l.time} | ${typeMap[l.type]} | **${l.action}** | \`${l.target}\` | ${l.detail} | ${status} |\n`;
        });

        return md;
    }

    /**
     * 触发下载日志文件
     */
    public downloadLog() {
        const content = this.getMarkdownLogs();
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `embedblocks-diag-${new Date().getTime()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('[InputLogger] Diagnostic log exported.');
    }
}

export const InputLogger = new InputLoggerService();
