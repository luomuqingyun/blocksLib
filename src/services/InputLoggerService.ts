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
    private eventCount = 0;
    private saveThreshold = 5; // 每 5 次交互自动保存一次以保证实时性

    /**
     * 初始化全局监听器
     */
    public init() {
        if (this.initialized) return;

        console.log('[InputLogger] Diagnostic Logger started.');

        // --------------------------------------------------------
        // 键盘监听 (Keyboard Listening)
        // 使用 capture=true (获取阶段) 确保记录早于应用逻辑拦截
        // --------------------------------------------------------
        window.addEventListener('keydown', (e) => {
            // [调试捷径] 全局快捷键 Ctrl + Shift + L 强制导出并保存当前交互轨迹
            if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'L') {
                e.preventDefault();
                e.stopPropagation();
                // 静默保存并自动弹出文件夹，提升调试效率
                this.exportDiagnosticDirectly();
                return;
            }
            this.recordKeyboardEvent(e);
            this.incrementEvent();
        }, true);

        // --------------------------------------------------------
        // 鼠标监听 (Mouse Listening)
        // 锁定 MOUSE_DOWN 以捕捉点击瞬间的焦点竞争
        // --------------------------------------------------------
        window.addEventListener('mousedown', (e) => {
            this.recordMouseEvent('MOUSE_DOWN', e);
            this.incrementEvent();
        }, true);
        window.addEventListener('click', (e) => {
            this.recordMouseEvent('CLICK', e);
            // 点击通常是关键决策点，触发即时存盘
            this.savePersistentLog();
        }, true);

        // --------------------------------------------------------
        // 焦点监听 (Focus/Blur Listening)
        // 这是诊断“为什么打不了字”的核心：追踪谁抢走了焦点
        // --------------------------------------------------------
        window.addEventListener('focus', (e) => {
            this.recordFocusEvent('FOCUS', e);
            // 焦点切换极其重要，必须立存防止意外崩溃导致丢失
            this.savePersistentLog();
        }, true);
        window.addEventListener('blur', (e) => this.recordFocusEvent('BLUR', e), true);

        // [NEW] 启动时尝试同步一次
        setTimeout(() => this.savePersistentLog(), 1000);

        // 定时自动保存 (保持原有心跳)
        setInterval(() => this.savePersistentLog(), 5 * 60 * 1000);

        this.initialized = true;
    }

    /**
     * 计数并检查是否需要保存
     */
    private incrementEvent() {
        this.eventCount++;
        if (this.eventCount >= this.saveThreshold) {
            this.eventCount = 0;
            this.savePersistentLog();
        }
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

        let extra = '';
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLButtonElement) {
            if (el.disabled) extra += '[DISABLED]';
            if ((el as any).readOnly) extra += '[READONLY]';
        }
        if (el instanceof HTMLElement) {
            extra += `[Tab:${el.tabIndex}]`;
        }

        return `${el.tagName}${id}${classes}${extra}`;
    }

    private recordKeyboardEvent(e: KeyboardEvent) {
        const detail = `Key: ${e.key} | Code: ${e.code} | Ctrl: ${e.ctrlKey} | Shift: ${e.shiftKey} | Alt: ${e.altKey} | Active: ${this.getElementIdentifier(document.activeElement)}`;
        this.log('KBD', e.key, this.getElementIdentifier(e.target), detail, e.defaultPrevented);
    }

    private recordMouseEvent(action: string, e: MouseEvent) {
        const detail = `Coord: (${e.clientX}, ${e.clientY}) | Button: ${e.button} | Active: ${this.getElementIdentifier(document.activeElement)}`;
        this.log('MOUSE', action, this.getElementIdentifier(e.target), detail, e.defaultPrevented);
    }

    private recordFocusEvent(action: string, e: FocusEvent) {
        const detail = `Focus transition | From: ${this.getElementIdentifier(e.relatedTarget)} | To: ${this.getElementIdentifier(e.target)} | Current Active: ${this.getElementIdentifier(document.activeElement)}`;
        this.log('SYS', action, this.getElementIdentifier(e.target), detail);
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
     * [Phase 3] 直接导出诊断日志到 logs 目录并自动打开位置
     * 废除原本的浏览器下载弹窗，实现全自动化流程
     */
    public async exportDiagnosticDirectly() {
        if (!window.electronAPI) return;

        try {
            const workDir = await window.electronAPI.getWorkDir();
            if (!workDir) {
                console.error('[InputLogger] Cannot export: Workspace directory not set.');
                return;
            }

            const timestamp = new Date().getTime();

            // 为了解决嵌套 test/test 目录的问题，直接使用更上一级的路径或者专门的诊断目录
            // 由于用户期望在 test/logs 目录下，我们向上跳出具体的项目文件夹
            // workDir 通常是形如: C:\...\embedblocks-studio\test\MyProject
            let baseDir = workDir;
            if (baseDir.replace(/\\/g, '/').includes('/test/')) {
                baseDir = baseDir.substring(0, baseDir.replace(/\\/g, '/').lastIndexOf('/test/') + 5);
            }

            const logDir = `${baseDir}/logs`;
            const logPath = `${logDir}/embedblocks-diag-${timestamp}.md`;
            const content = this.getMarkdownLogs();

            // 1. 静默保存物理文件
            const saveRes = await window.electronAPI.saveFileContent(content, logPath);

            if (saveRes.success) {
                console.log(`[InputLogger] Diagnostic log exported to: ${logPath}`);
                // 2. 自动唤起文件管理器并聚焦到该文件
                await window.electronAPI.openPath(logDir);
            } else {
                console.error('[InputLogger] Export failed:', saveRes.error);
            }
        } catch (err) {
            console.error('[InputLogger] Fatal error during export:', err);
        }
    }

    /**
     * 触发下载日志文件 (保留作为后备方案)
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
        console.log('[InputLogger] Diagnostic log exported via browser download.');
    }
}

export const InputLogger = new InputLoggerService();
