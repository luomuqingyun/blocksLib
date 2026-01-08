import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { extensionService } from './ExtensionService';
import { configService } from './ConfigService';

export interface MarketplaceExtension {
    id: string;
    version: string;
    name: string;
    description: string;
    icon?: string;
    downloadUrl: string;
    author?: string;
}

export interface MarketplaceManifest {
    extensions: MarketplaceExtension[];
}

export class MarketplaceService {
    private tempDir: string;

    constructor() {
        this.tempDir = path.join(app.getPath('temp'), 'embedblocks-marketplace');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    private fetchJson(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to fetch JSON: status code ${res.statusCode}`));
                    return;
                }

                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse JSON response'));
                    }
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    private normalizeUrl(url: string): string {
        let cleanUrl = url.trim();
        // Handle GitHub links: convert to raw content if pointing to repo
        if (cleanUrl.includes('github.com') && !cleanUrl.includes('raw.githubusercontent.com')) {
            // Check if it's already a full file link or just repo link
            if (!cleanUrl.endsWith('.json')) {
                // Assume marketplace.json in main branch
                cleanUrl = cleanUrl.replace('github.com', 'raw.githubusercontent.com')
                    .replace(/\/$/, '') // remove trailing slash
                    + '/main/marketplace.json';
            } else {
                // Convert blob link to raw link if necessary
                cleanUrl = cleanUrl.replace('github.com', 'raw.githubusercontent.com')
                    .replace('/blob/', '/');
            }
        }
        return cleanUrl;
    }

    public async fetchMarketplace(url: string): Promise<MarketplaceExtension[]> {
        const targetUrl = this.normalizeUrl(url);
        try {
            const manifest = await this.fetchJson(targetUrl) as MarketplaceManifest;
            if (manifest && Array.isArray(manifest.extensions)) {
                return manifest.extensions;
            }
            return [];
        } catch (e) {
            console.error(`Failed to fetch marketplace from ${targetUrl}:`, e);
            throw e;
        }
    }

    public async installExtension(ext: MarketplaceExtension): Promise<{ success: boolean, message: string }> {
        const downloadUrl = ext.downloadUrl;
        const targetZip = path.join(this.tempDir, `${ext.id}.zip`);
        const targetExtractDir = path.join(this.tempDir, ext.id);

        try {
            // 1. Download ZIP
            await this.downloadFile(downloadUrl, targetZip);

            // 2. Extract ZIP (Using specialized extraction if needed, but for now we might need a lib)
            // Simplified: If it's a folder, we can just copy. But marketplace usually provides ZIPs.
            // Since we don't have adm-zip or similar in dependencies, we might need to use a system tool or simple node logic if possible.
            // Wait, I should check if there's any zip handling in the project.

            // If we don't have unzip utility in Node, we might need 'extract-zip' or 'adm-zip'.
            // I'll check if any such deps exist. 
            // I saw 'rimraf', 'jimp', etc. but no zip lib.

            // Alternative: Use powershell on windows to unzip.
            if (process.platform === 'win32') {
                // powershell Expand-Archive
                const { execSync } = require('child_process');
                if (fs.existsSync(targetExtractDir)) fs.rmSync(targetExtractDir, { recursive: true, force: true });
                fs.mkdirSync(targetExtractDir, { recursive: true });
                execSync(`powershell -command "Expand-Archive -Path '${targetZip}' -DestinationPath '${targetExtractDir}' -Force"`);
            } else {
                // unzip on linux/mac
                const { execSync } = require('child_process');
                if (fs.existsSync(targetExtractDir)) fs.rmSync(targetExtractDir, { recursive: true, force: true });
                fs.mkdirSync(targetExtractDir, { recursive: true });
                execSync(`unzip -o "${targetZip}" -d "${targetExtractDir}"`);
            }

            // 3. Move to extensions folder via ExtensionService
            // Note: ZIP might contain a subfolder or directly files. 
            // We need to find the one containing manifest.json.
            const sourcePath = await this.findExtensionRoot(targetExtractDir);
            if (!sourcePath) {
                return { success: false, message: 'Invalid extension ZIP: manifest.json not found' };
            }

            const result = await extensionService.importExtension(sourcePath);

            // Cleanup temp
            fs.rmSync(targetZip, { force: true });
            fs.rmSync(targetExtractDir, { recursive: true, force: true });

            return result;
        } catch (e: any) {
            return { success: false, message: `Installation failed: ${e.message}` };
        }
    }

    private downloadFile(url: string, targetPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(targetPath);
            const request = https.get(url, (response) => {
                if (response.statusCode !== 200 && response.statusCode !== 302 && response.statusCode !== 301) {
                    reject(new Error(`Failed to download file: status code ${response.statusCode}`));
                    return;
                }

                // Handle 302/301 Redirects (Common with GitHub)
                if (response.statusCode === 302 || response.statusCode === 301) {
                    const nextUrl = response.headers.location;
                    if (nextUrl) {
                        this.downloadFile(nextUrl, targetPath).then(resolve).catch(reject);
                        return;
                    }
                }

                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(targetPath, () => { });
                reject(err);
            });
        });
    }

    private async findExtensionRoot(dir: string): Promise<string | null> {
        const files = fs.readdirSync(dir);
        if (files.includes('manifest.json') || files.includes('extension.json')) {
            return dir;
        }
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                const found = await this.findExtensionRoot(fullPath);
                if (found) return found;
            }
        }
        return null;
    }
}

export const marketplaceService = new MarketplaceService();
