import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Helper: Semver-lite comparison
function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}

export interface ExtensionManifest {
    id: string;
    version: string;
    name: string;
    description: string;
    categories?: string[];
    contributes: {
        boards?: string[];
        blocks?: string[];
        generators?: string[];
    };
}

export interface LoadedExtension {
    manifest: ExtensionManifest;
    path: string;
    hasBoards: boolean;
    hasBlocks: boolean;
    hasGenerators: boolean;
    hasLibraries: boolean;
    languages: string[]; // List of supported languages (e.g. ['zh', 'en'])
}

export class ExtensionService {
    private extensionsDir: string;
    private extensions: Map<string, LoadedExtension> = new Map();

    constructor() {
        this.extensionsDir = path.join(app.getPath('userData'), 'extensions');
        if (!fs.existsSync(this.extensionsDir)) {
            fs.mkdirSync(this.extensionsDir, { recursive: true });
        }
        this.scanExtensions();
    }

    public scanExtensions() {
        this.extensions.clear();
        try {
            if (fs.existsSync(this.extensionsDir)) {
                const entries = fs.readdirSync(this.extensionsDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        this.loadExtension(path.join(this.extensionsDir, entry.name));
                    }
                }
            }
        } catch (e) {
            console.error("Failed to scan extensions:", e);
        }
    }

    private loadExtension(dirPath: string) {
        try {
            let manifestPath = path.join(dirPath, 'manifest.json');
            if (!fs.existsSync(manifestPath)) {
                manifestPath = path.join(dirPath, 'extension.json');
            }
            if (!fs.existsSync(manifestPath)) return;

            const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
            const manifest: ExtensionManifest = JSON.parse(manifestContent);

            // Basic Validation
            if (!manifest.id || !manifest.version) {
                console.warn(`Skipping invalid extension at ${dirPath}: missing id or version`);
                return;
            }

            const libraryPath = path.join(dirPath, 'libraries');
            const hasLibraries = fs.existsSync(libraryPath) && fs.statSync(libraryPath).isDirectory();

            // Detect Locales
            const languages: string[] = [];
            const localesPath = path.join(dirPath, 'locales');
            if (fs.existsSync(localesPath) && fs.statSync(localesPath).isDirectory()) {
                const langFiles = fs.readdirSync(localesPath);
                for (const file of langFiles) {
                    if (file.endsWith('.json')) {
                        languages.push(file.replace('.json', ''));
                    }
                }
            }

            const loadedExt: LoadedExtension = {
                manifest,
                path: dirPath,
                hasBoards: !!(manifest.contributes?.boards?.length),
                hasBlocks: !!(manifest.contributes?.blocks?.length),
                hasGenerators: !!(manifest.contributes?.generators?.length),
                hasLibraries,
                languages
            };

            this.extensions.set(manifest.id, loadedExt);
            console.log(`Loaded extension: ${manifest.id} (${manifest.name})`);

        } catch (e) {
            console.error(`Error loading extension at ${dirPath}:`, e);
        }
    }

    public getExtensions(): LoadedExtension[] {
        return Array.from(this.extensions.values());
    }

    public getExtensionLibPaths(): string[] {
        const paths: string[] = [];
        this.extensions.forEach(ext => {
            if (ext.hasLibraries) {
                paths.push(path.join(ext.path, 'libraries'));
            }
        });
        return paths;
    }

    public async loadFileFromExtension(extId: string, relativePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string | null> {
        const ext = this.extensions.get(extId);
        if (!ext) return null;

        const fullPath = path.join(ext.path, relativePath);
        // Security check: ensure path is inside extension directory
        if (!fullPath.startsWith(ext.path)) {
            console.warn(`Security Warning: Attempted to access file outside extension: ${fullPath}`);
            return null;
        }

        try {
            if (fs.existsSync(fullPath)) {
                return fs.readFileSync(fullPath, encoding);
            }
        } catch (e) {
            console.error(`Failed to read extension file: ${fullPath}`, e);
        }
        return null;
    }

    public async importExtension(sourcePath: string, force: boolean = false): Promise<{ success: boolean, message: string, extensionId?: string, status?: 'ok' | 'downgrade' | 'error', currentVersion?: string, newVersion?: string, actualSourcePath?: string }> {
        try {
            if (!fs.existsSync(sourcePath)) {
                return { success: false, message: 'Source path does not exist' };
            }

            let manifestPath = path.join(sourcePath, 'manifest.json');
            if (!fs.existsSync(manifestPath)) {
                // Fallback to legacy name
                manifestPath = path.join(sourcePath, 'extension.json');
            }

            if (!fs.existsSync(manifestPath)) {
                // FALLBACK: Smart Folder Detection
                // Check if user selected a wrapper folder (e.g. 'download/my-plugin-v1/my-plugin/manifest.json')
                // We assume there is only one subdirectory inside.
                try {
                    const subEntries = await fs.promises.readdir(sourcePath, { withFileTypes: true });
                    const dirs = subEntries.filter(e => e.isDirectory() && !e.name.startsWith('.'));

                    if (dirs.length === 1) {
                        const nestedPath = path.join(sourcePath, dirs[0].name);
                        const nestedManifest = path.join(nestedPath, 'manifest.json');
                        if (fs.existsSync(nestedManifest)) {
                            console.log(`[Smart Import] Detected nested extension at: ${nestedPath}`);
                            sourcePath = nestedPath; // Rewrite source path
                            manifestPath = nestedManifest; // Rewrite manifest path
                        }
                    }
                } catch (e) {
                    console.log("[Smart Import] Scanning failed, ignoring fallback.");
                }
            }

            if (!fs.existsSync(manifestPath)) {
                return { success: false, message: 'Invalid extension: manifest.json missing (checked root and 1-level deep)' };
            }

            const manifestContent = await fs.promises.readFile(manifestPath, 'utf-8');
            let manifest: ExtensionManifest;
            try {
                manifest = JSON.parse(manifestContent);
            } catch (e) {
                return { success: false, message: 'Invalid manifest format' };
            }

            if (!manifest.id) {
                return { success: false, message: 'Extension manifest missing "id"' };
            }

            const targetDir = path.join(this.extensionsDir, manifest.id);
            if (fs.existsSync(targetDir)) {
                // Check version before overwriting
                const currentExt = this.extensions.get(manifest.id);
                if (currentExt && !force) {
                    const comparison = compareVersions(manifest.version, currentExt.manifest.version);
                    if (comparison < 0) {
                        return {
                            success: false,
                            status: 'downgrade',
                            message: `Downgrade detected: v${currentExt.manifest.version} -> v${manifest.version}`,
                            extensionId: manifest.id,
                            currentVersion: currentExt.manifest.version,
                            newVersion: manifest.version,
                            actualSourcePath: sourcePath // Return path so frontend can retry with force
                        };
                    }
                }

                // Determine update policy. For now, overwrite.
                await fs.promises.rm(targetDir, { recursive: true, force: true });
            }

            // Async copy
            // Note: fs.promises.cp is available in Node 16.7+
            if (fs.promises.cp) {
                await fs.promises.cp(sourcePath, targetDir, { recursive: true });
            } else {
                // Fallback for older Node if necessary, though Electron usually has recent Node
                // Using Sync for fallback or manual recursion would be complex.
                // Assuming fs.cpSync existed (as per previous code), so fs.promises.cp likely exists.
                // If not, use fs.promises.copyFile recursively? No, let's assume cp exists or use a robust pattern.
                // For safety in this environment, we can use cp via binding if types are missing, or verify.
                // Given previous code used fs.cpSync (node 16.7+), fs.promises.cp is safe.
                await (fs.promises as any).cp(sourcePath, targetDir, { recursive: true });
            }

            this.scanExtensions();
            this.scanExtensions();
            return { success: true, status: 'ok', message: `Extension ${manifest.name} imported successfully!`, extensionId: manifest.id };

        } catch (e: any) {
            return { success: false, message: `Import failed: ${e.message}` };
        }
    }

    public async uninstallExtension(extId: string): Promise<{ success: boolean, message: string, extensionId?: string }> {
        const ext = this.extensions.get(extId);
        if (!ext) {
            return { success: false, message: 'Extension not found' };
        }

        try {
            // Security check: Ensure we are only deleting inside the extensions folder
            if (!ext.path.startsWith(this.extensionsDir)) {
                return { success: false, message: 'Cannot delete built-in or external extension' };
            }

            await fs.promises.rm(ext.path, { recursive: true, force: true });
            this.extensions.delete(extId);
            this.scanExtensions(); // Refresh internal state
            return { success: true, message: `Extension ${ext.manifest.name} uninstalled.` };
        } catch (e: any) {
            console.error(`Uninstall failed for ${extId}:`, e);
            return { success: false, message: `Uninstall failed: ${e.message}` };
        }
    }
}

export const extensionService = new ExtensionService();
