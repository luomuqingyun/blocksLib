import * as Blockly from 'blockly';
import { BoardConfig } from '../types/board';
import { BoardRegistry } from './BoardRegistry';
import i18n from '../i18n';

export interface ExtensionManifest {
    id: string;
    version: string;
    name: string;
    description: string;
    categories?: string[];
    icon?: string;
    compatibility?: {
        families?: string[]; // e.g. ['arduino', 'esp32']
        boards?: string[];   // e.g. ['uno', 'nano']
    };
    contributes: {
        boards?: string[];
        blocks?: string[];
        generators?: string[];
    };
}

export interface LoadedExtension {
    manifest: ExtensionManifest;
    path: string;
    icon?: string;
    hasBoards: boolean;
    hasBlocks: boolean;
    hasGenerators: boolean;
    hasLibraries: boolean;
    languages: string[];
    originalManifest?: ExtensionManifest;
}

class ExtensionRegistryService {
    private extensions: LoadedExtension[] = [];
    private sandboxInfo: { iframe: HTMLIFrameElement; loaded: boolean } | null = null;
    private pendingMessages: any[] = [];
    private codeGenRequests: Map<string, { resolve: (code: string) => void; reject: (err: any) => void }> = new Map();
    private initPromise: Promise<void> | null = null;

    constructor() {
        // Defer initialization - will be triggered lazily when needed
        // This avoids the anti-pattern of calling async in constructor
    }

    /**
     * Ensures the registry is initialized. Safe to call multiple times.
     * Uses cached promise to avoid duplicate initialization.
     */
    public ensureInitialized(): Promise<void> {
        if (!this.initPromise) {
            this.initPromise = this.init();
        }
        return this.initPromise;
    }

    private async init(): Promise<void> {
        // Create Sandbox Iframe
        const iframe = document.createElement('iframe');
        // In Dev: Vite serves files directly from src
        // In Prod: sandbox.html is built to dist/ root (see vite.sandbox.config.ts)
        iframe.src = import.meta.env.DEV ? '/src/sandbox/sandbox.html' : './sandbox.html';
        iframe.style.display = 'none';

        // In Dev, we need allow-same-origin for Vite HMR and script loading from localhost
        // In Prod, we strictly isolate with allow-scripts only
        const sandboxAttr = import.meta.env.DEV ? 'allow-scripts allow-same-origin' : 'allow-scripts';
        iframe.setAttribute('sandbox', sandboxAttr);

        document.body.appendChild(iframe);

        iframe.onload = () => {
            console.log('[ExtensionRegistry] Sandbox Iframe Loaded');
            if (this.sandboxInfo) this.sandboxInfo.loaded = true;
            this.flushPendingMessages();
        };

        this.sandboxInfo = { iframe, loaded: false };
        window.addEventListener('message', this.handleMessage.bind(this));

        if (window.electronAPI) {
            try {
                this.extensions = await window.electronAPI.extensionsList();
                console.log('Extensions loaded:', this.extensions);
                await this.loadResources();

                // Re-load resources when language changes to update localized strings
                i18n.on('languageChanged', async () => {
                    console.log('[ExtensionRegistry] Language changed, refreshing resources...');
                    await this.loadResources();
                });
            } catch (e) {
                console.error("Failed to load extensions list", e);
            }
        }
    }

    private handleMessage(event: MessageEvent) {
        const data = event.data;
        if (!data) return;

        if (data.type === 'code-generated') {
            const request = this.codeGenRequests.get(data.requestId);
            if (request) {
                if (data.success) request.resolve(data.code);
                else request.reject(new Error(data.error));
                this.codeGenRequests.delete(data.requestId);
            }
        }
    }

    private sendMessage(msg: any) {
        if (this.sandboxInfo && this.sandboxInfo.loaded && this.sandboxInfo.iframe.contentWindow) {
            this.sandboxInfo.iframe.contentWindow.postMessage(msg, '*');
        } else {
            this.pendingMessages.push(msg);
        }
    }

    private flushPendingMessages() {
        if (!this.sandboxInfo || !this.sandboxInfo.loaded || !this.sandboxInfo.iframe.contentWindow) return;
        while (this.pendingMessages.length > 0) {
            const msg = this.pendingMessages.shift();
            this.sandboxInfo.iframe.contentWindow.postMessage(msg, '*');
        }
    }

    public getExtensions(): LoadedExtension[] {
        return this.extensions;
    }

    public async reload() {
        if (window.electronAPI) {
            try {
                this.extensions = await window.electronAPI.extensionsList();
                console.log('Extensions reloaded:', this.extensions);
                await this.loadResources();
            } catch (e) {
                console.error("Failed to reload extensions", e);
            }
        }
    }

    private async loadResources() {
        for (const ext of this.extensions) {
            // Restore original manifest if exists (to avoid double translation on language switch)
            if (ext.originalManifest) {
                ext.manifest = JSON.parse(JSON.stringify(ext.originalManifest));
            } else {
                // First load: Backup original manifest
                ext.originalManifest = JSON.parse(JSON.stringify(ext.manifest));
            }

            // 0. Clear previous resources for this extension to prevent duplicates/leftovers
            BoardRegistry.unregisterExtension(ext.manifest.id);

            // 0.1 Load Translations
            let translations: Record<string, string> = {};
            if (ext.languages && ext.languages.length > 0) {
                const currentLang = i18n.language.split('-')[0]; // Simple match (en-US -> en)
                const targetLang = ext.languages.includes(currentLang) ? currentLang :
                    (ext.languages.includes('en') ? 'en' : ext.languages[0]);

                try {
                    const langContent = await window.electronAPI.extensionReadFile(ext.manifest.id, `locales/${targetLang}.json`);
                    if (langContent) {
                        translations = JSON.parse(langContent);
                        // Merge into i18next for general UI strings
                        i18n.addResourceBundle(targetLang, 'translation', translations, true, true);
                        // Also merge into Blockly for block specific strings
                        Object.assign(Blockly.Msg, translations);

                        // Translate Manifest fields if they are keys
                        const translateFieldHelper = (val: string) => {
                            if (val && val.startsWith('%{') && val.endsWith('}')) {
                                const key = val.substring(2, val.length - 1);
                                return translations[key] || val;
                            }
                            return val;
                        };
                        ext.manifest.name = translateFieldHelper(ext.manifest.name);
                        ext.manifest.description = translateFieldHelper(ext.manifest.description);

                        console.log(`[Extension] Loaded translations for ${ext.manifest.id} (${targetLang})`);
                    }
                } catch (e) {
                    console.error(`[Extension] Failed to load translations for ${ext.manifest.id}`, e);
                }
            }

            // Define helper locally for boards and blocks
            const translateField = (val: any) => {
                if (typeof val === 'object' && val !== null) {
                    const targetLang = i18n.language || 'en';
                    // Support direct objects like { "zh": "...", "en": "..." }
                    return val[targetLang] || val['en'] || Object.values(val)[0] || '';
                }
                if (typeof val === 'string' && val.startsWith('%{') && val.endsWith('}')) {
                    let key = val.substring(2, val.length - 1);
                    // Support Blockly style BKY_ prefix
                    if (key.startsWith('BKY_')) {
                        key = key.substring(4);
                    }
                    // Try Global Blockly Msgs (System) -> Plugin Shared Locales -> Key as fallback
                    return (Blockly.Msg as any)[key] || translations[key] || val;
                }
                return val;
            };

            // 1. Load Custom Boards (Trusted JSON, handled in Main/Renderer)
            if (ext.hasBoards && ext.manifest.contributes.boards) {
                for (const boardFile of ext.manifest.contributes.boards) {
                    try {
                        const content = await window.electronAPI.extensionReadFile(ext.manifest.id, boardFile);
                        if (content) {
                            const boardConfig: BoardConfig = JSON.parse(content);
                            // Ensure ID is unique/namespaced to avoid collisions
                            boardConfig.id = `${ext.manifest.id}:${boardConfig.id}`;

                            // Translate board name if it's a key
                            const displayName = translateField(boardConfig.name);
                            boardConfig.name = `${displayName} (Ext)`;

                            // Deep translate pins labels
                            if (boardConfig.pins) {
                                Object.keys(boardConfig.pins).forEach(group => {
                                    const pins = (boardConfig.pins as any)[group];
                                    if (Array.isArray(pins)) {
                                        pins.forEach(pin => {
                                            if (pin.label) {
                                                pin.label = translateField(pin.label);
                                            }
                                        });
                                    }
                                });
                            }

                            BoardRegistry.register(boardConfig);
                            console.log(`Registered extension board: ${boardConfig.id}`);
                        }
                    } catch (e) {
                        console.error(`Failed to load board ${boardFile} from ${ext.manifest.id}`, e);
                    }
                }
            }

            // 2. Load Blocks and Generators
            const blockFiles = ext.manifest.contributes.blocks || [];
            const generatorFiles = ext.manifest.contributes.generators || [];

            // 2.1 Process Block Definitions (JSON -> UI & Sandbox)
            for (const blockFile of blockFiles) {
                try {
                    const content = await window.electronAPI.extensionReadFile(ext.manifest.id, blockFile);
                    if (content) {
                        try {
                            // If JSON, it's a UI definition
                            if (blockFile.endsWith('.json')) {
                                const definitions = JSON.parse(content);
                                // Register in Main Window (for Editor UI)
                                Blockly.defineBlocksWithJsonArray(definitions);
                                console.log(`[Extension] Registered ${definitions.length} blocks from ${blockFile}`);

                                // Generate Toolbox Category
                                if (definitions.length > 0) {
                                    const contents = definitions.map((def: any) => ({
                                        kind: 'block',
                                        type: def.type
                                    }));

                                    const category = {
                                        kind: 'category',
                                        name: ext.manifest.name,
                                        colour: '#2ecc71', // Standard Green for Extensions
                                        contents: contents
                                    };

                                    BoardRegistry.registerExtensionCategory(ext.manifest.id, category, ext.manifest.compatibility);
                                }

                                // Sync to Sandbox (for Headless Workspace)
                                this.sendMessage({
                                    type: 'load-definitions',
                                    id: ext.manifest.id,
                                    definitions: definitions
                                });
                            } else {
                                // If JS, it might be legacy definition or logic. 
                                // Send to Sandbox.
                                this.sendMessage({
                                    type: 'load-script',
                                    id: ext.manifest.id,
                                    content: content
                                });
                            }
                        } catch (parseErr) {
                            console.error(`Failed to parse/load block file ${blockFile}`, parseErr);
                        }
                    }
                } catch (e) {
                    console.error(`Failed to read block file ${blockFile} from ${ext.manifest.id}`, e);
                }
            }

            // 2.2 Process Generators (JS -> Sandbox only)
            for (const scriptFile of generatorFiles) {
                try {
                    const content = await window.electronAPI.extensionReadFile(ext.manifest.id, scriptFile);
                    if (content) {
                        this.sendMessage({
                            type: 'load-script',
                            id: ext.manifest.id,
                            content: content
                        });
                    }
                } catch (e) {
                    console.error(`Failed to load generator ${scriptFile} from ${ext.manifest.id}`, e);
                }
            }
        }
    }

    // Public API for Code Generation
    public generateCode(xml: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).substring(7);
            this.codeGenRequests.set(requestId, { resolve, reject });
            this.sendMessage({ type: 'generate-code', xml, requestId });

            // Timeout
            setTimeout(() => {
                if (this.codeGenRequests.has(requestId)) {
                    this.codeGenRequests.get(requestId)?.reject(new Error('Timeout'));
                    this.codeGenRequests.delete(requestId);
                }
            }, 5000);
        });
    }
}

export const ExtensionRegistry = new ExtensionRegistryService();
