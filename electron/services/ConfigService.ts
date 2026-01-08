import { app, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface AppConfig {
    general: {
        workDir: string;
        language: string;
        autoCleanNoMatchRecent?: boolean;
        projectHistoryLimit?: number;
        recentProjects: string[]; // Moved
    };
    serialSettings: {
        baudRate: number;
        dataBits: number;
        stopBits: number;
        parity: string;
        hexDisplay: boolean;
        hexSend: boolean;
        lineEnding?: string;
        enterSends?: boolean;
        clearInputOnSend?: boolean;
        mergeIncomplete?: boolean;
        historyDeduplication?: boolean;
        inputSpellCheck?: boolean;
        lastPort?: string;
        serialHistory: string[]; // Moved
        historyLimit: number;    // Moved
    };
    toolbox?: {
        hiddenCategories: string[];
    };
}


export class ConfigService {
    private configPath: string;
    private config: AppConfig;

    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        this.config = this.loadConfig();
    }

    private loadConfig(): AppConfig {
        if (!fs.existsSync(this.configPath)) {
            return this.loadDefaults();
        }
        try {
            const data = fs.readFileSync(this.configPath, 'utf8');
            let userConfig = JSON.parse(data);

            // --- Migrations ---

            // 1. Move projectHistoryLimit to general
            if ('projectHistoryLimit' in userConfig) {
                if (!userConfig.general) userConfig.general = {};
                userConfig.general.projectHistoryLimit = userConfig.projectHistoryLimit;
                delete userConfig.projectHistoryLimit;
            }
            // 2. Rename autoCleanInvalidRecent -> autoCleanNoMatchRecent
            if (userConfig.general && 'autoCleanInvalidRecent' in userConfig.general) {
                userConfig.general.autoCleanNoMatchRecent = userConfig.general.autoCleanInvalidRecent;
                delete userConfig.general.autoCleanInvalidRecent;
            }

            // 3. Move recentProjects to general
            if ('recentProjects' in userConfig) {
                if (!userConfig.general) userConfig.general = {};
                userConfig.general.recentProjects = userConfig.recentProjects;
                delete userConfig.recentProjects;
            }

            // 4. Move serialHistory and historyLimit to serialSettings
            if (!userConfig.serialSettings) userConfig.serialSettings = {};

            if ('serialHistory' in userConfig) {
                userConfig.serialSettings.serialHistory = userConfig.serialHistory;
                delete userConfig.serialHistory;
            }
            if ('historyLimit' in userConfig) {
                userConfig.serialSettings.historyLimit = userConfig.historyLimit;
                delete userConfig.historyLimit;
            }

            // 5. Cleanup legacy sendNewline
            if (userConfig.serialSettings && 'sendNewline' in userConfig.serialSettings) {
                // Determine lineEnding if not set? 
                // If lineEnding is already set (likely 'none' or 'lf'), we just trust it.
                // If not set, we could migrate: false -> 'none', true -> 'lf'.
                // But simplified: just delete legacy key, let lineEnding default take over if missing.
                delete userConfig.serialSettings.sendNewline;
            }

            // Explicitly delete legacy root keys if they somehow persist or are empty
            delete userConfig.serialHistory;
            delete userConfig.historyLimit;
            delete userConfig.recentProjects;
            delete userConfig.settings; // Remove unused settings object

            // Merge with defaults
            const defaults = this.loadDefaults();

            // Deep merge will overwrite defaults with userConfig
            // Since defaults doesn't have legacy keys, and userConfig has them deleted, output will be clean.
            const result = this.deepMerge(defaults, userConfig);

            // Final safety cleanup on result
            delete (result as any).recentProjects;
            delete (result as any).serialHistory;
            delete (result as any).historyLimit;
            delete (result as any).settings;

            return result;
        } catch (e) {
            console.error('Failed to load config:', e);
            return this.loadDefaults();
        }
    }

    private loadDefaults(): any {
        const defaults: any = {
            general: {
                language: 'system',
                workDir: app.getPath('documents'),
                autoCleanNoMatchRecent: false,
                projectHistoryLimit: 10,
                recentProjects: []
            },
            serialSettings: {
                baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none',
                hexDisplay: false, hexSend: false,
                enterSends: true, lastPort: '',
                historyLimit: 100,
                mergeIncomplete: true, // Default Enabled
                serialHistory: []      // Placed last for readability
            },
            advanced: {
                clearHistoryOnRestore: false
            },
            toolbox: {
                hiddenCategories: []
            }
        };
        return defaults;
    }

    private deepMerge(target: any, source: any): any {
        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) Object.assign(output, { [key]: source[key] });
                    else output[key] = this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    private isObject(item: any) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    private saveConfig(config: AppConfig = this.config) {
        try {
            // Reorder serialSettings to ensure serialHistory is last for readability
            if (config.serialSettings && config.serialSettings.serialHistory) {
                const { serialHistory, ...rest } = config.serialSettings;
                // Reassign in specific order: Rest of settings -> serialHistory
                config.serialSettings = {
                    ...rest,
                    serialHistory
                } as any;
            }
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        } catch (e) {
            console.error("Config save failed:", e);
        }
    }

    public get(key?: string): any {
        if (!key) return this.config;
        if (key.includes('.')) {
            const keys = key.split('.');
            let result: any = this.config;
            for (const k of keys) {
                if (result) result = result[k];
            }
            return result;
        }
        return (this.config as any)[key];
    }

    public set(key: string, value: any): void {
        if (key === 'serialSettings') {
            // Special handling to prevent overwriting history when frontend saves partial settings
            const existing = this.config.serialSettings || {};
            const incoming = value || {};
            this.config.serialSettings = {
                ...existing,
                ...incoming,
                // Explicitly preserve history/limit if missing from incoming (but allow overwrite if provided)
                serialHistory: incoming.serialHistory !== undefined ? incoming.serialHistory : (existing.serialHistory || []),
                historyLimit: incoming.historyLimit !== undefined ? incoming.historyLimit : (existing.historyLimit || 100)
            };
        } else if (key.includes('.')) {
            const keys = key.split('.');
            let target: any = this.config;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!target[keys[i]]) target[keys[i]] = {}; // Auto-create if missing
                target = target[keys[i]];
            }
            target[keys[keys.length - 1]] = value;
            target[keys[keys.length - 1]] = value;
        } else {
            (this.config as any)[key] = value;
        }
        this.saveConfig();
    }

    public updateSerialHistory(history: string[]): string[] {
        const limit = this.config.serialSettings.historyLimit || 100;
        this.config.serialSettings.serialHistory = history.slice(-limit);
        this.saveConfig();
        return this.config.serialSettings.serialHistory;
    }

    public addRecentProject(projectPath: string): string[] {
        const limit = this.config.general.projectHistoryLimit || 10;
        let recent = this.config.general.recentProjects || [];
        // Remove existing to push to top
        recent = recent.filter((p: string) => p !== projectPath);
        recent.unshift(projectPath);
        this.config.general.recentProjects = recent.slice(0, limit);
        this.saveConfig();
        return this.config.general.recentProjects;
    }

    public getRecentProjects(): string[] {
        return this.config.general.recentProjects || [];
    }

    public restoreDefaults(section?: string, clearHistory: boolean = false): AppConfig {
        const defaults = this.loadDefaults();
        if (section && section in defaults) {
            (this.config as any)[section] = JSON.parse(JSON.stringify(defaults[section]));
        } else {
            if (clearHistory) {
                this.config = JSON.parse(JSON.stringify(defaults));
            } else {
                // Preserve History
                // Now deeper: serialSettings.serialHistory, general.recentProjects
                const serialHistory = this.config.serialSettings.serialHistory;
                const recentProjects = this.config.general.recentProjects;

                this.config = JSON.parse(JSON.stringify(defaults));

                if (this.config.serialSettings) this.config.serialSettings.serialHistory = serialHistory;
                if (this.config.general) this.config.general.recentProjects = recentProjects;
            }
        }
        this.saveConfig();
        return this.config;
    }

    public openConfigDir(): void {
        shell.showItemInFolder(this.configPath);
    }

    public getConfig(): AppConfig {
        return this.config;
    }
    public validateRecentProjects(): void {
        if (!this.config.general.autoCleanNoMatchRecent) return;

        const current = this.config.general.recentProjects || [];
        const valid = current.filter(p => fs.existsSync(p));

        if (valid.length !== current.length) {
            this.config.general.recentProjects = valid;
            this.saveConfig();
        }
    }

    // New helper to remove a specific path
    public removeRecentProject(pathToRemove: string): void {
        const current = this.config.general.recentProjects || [];
        this.config.general.recentProjects = current.filter(p => p !== pathToRemove);
        this.saveConfig();
        // Notify frontend? The frontend usually polls or refreshes on menu action. 
        // We'll rely on buildMenu() being called if this is invoked via IPC.
    }
}

export const configService = new ConfigService();
