import { PlatformIOTemplate, ProjectBuildConfig } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';
import { configService } from './ConfigService';

import { generateIniConfig } from '../config/templates';

export interface ProjectMetadata {
    version: string;
    name: string;
    boardId: string;
    createdAt: number;
    lastModified: number;
    buildConfig?: any; // Allow relaxed type for storage
}

// ... (keep existing interfaces)
export interface ProjectFileContent {
    metadata: ProjectMetadata;
    blocks: any;
}

export interface ProjectData {
    metadata: ProjectMetadata;
    xml: string;
    code: string;
}

class ProjectService {

    async createProject(parentDir: string, name: string, boardId: string, buildConfig: any): Promise<{ success: boolean; path?: string; error?: string }> {
        try {
            const projectPath = path.join(parentDir, name);
            const ebprojPath = path.join(projectPath, `${name}.ebproj`);

            if (fs.existsSync(projectPath)) {
                return { success: false, error: 'Project directory already exists' };
            }

            await fs.promises.mkdir(projectPath, { recursive: true });
            await fs.promises.mkdir(path.join(projectPath, 'src'), { recursive: true });

            // Create main.cpp
            const mainCppContent = `#include <Arduino.h>\n\nvoid setup() {\n  // put your setup code here, to run once:\n}\n\nvoid loop() {\n  // put your main code here, to run repeatedly:\n}\n`;
            await fs.promises.writeFile(path.join(projectPath, 'src', 'main.cpp'), mainCppContent);

            // Create initial metadata
            const metadata: ProjectMetadata = {
                version: '1.0.0',
                name: name,
                boardId: boardId,
                createdAt: Date.now(),
                lastModified: Date.now(),
                buildConfig: buildConfig
            };

            const initialData: ProjectFileContent = {
                metadata: metadata,
                blocks: { languageVersion: 0, blocks: [] }
            };

            await fs.promises.writeFile(ebprojPath, JSON.stringify(initialData, null, 2));

            // Generate platformio.ini
            try {
                const iniContent = generateIniConfig(buildConfig);
                await fs.promises.writeFile(path.join(projectPath, 'platformio.ini'), iniContent);
            } catch (e) {
                console.warn('[ProjectService] Failed to generate initial platformio.ini', e);
            }

            // Update WorkDir
            configService.set('general.workDir', parentDir);

            return { success: true, path: ebprojPath };

        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    // --- Copy Project (Save As) ---
    async copyProject(srcPath: string, parentDir: string, newName: string): Promise<{ success: boolean; newPath?: string; error?: string }> {
        try {
            if (!fs.existsSync(srcPath)) return { success: false, error: 'Source project not found' };

            const newProjectPath = path.join(parentDir, newName);
            const newEbprojPath = path.join(newProjectPath, `${newName}.ebproj`);

            if (fs.existsSync(newProjectPath)) {
                return { success: false, error: 'Target directory already exists' };
            }

            // 1. Create Directory
            await fs.promises.mkdir(newProjectPath, { recursive: true });

            // 2. recursive copy helper
            const copyRecursive = async (src: string, dest: string) => {
                const stats = await fs.promises.stat(src);
                if (stats.isDirectory()) {
                    await fs.promises.mkdir(dest, { recursive: true });
                    const entries = await fs.promises.readdir(src);
                    for (const entry of entries) {
                        // Skip .pio, .git, .history
                        if (entry === '.pio' || entry === '.git' || entry === '.history' || entry === 'build') continue;
                        await copyRecursive(path.join(src, entry), path.join(dest, entry));
                    }
                } else {
                    // Copy file
                    await fs.promises.copyFile(src, dest);
                }
            };

            // 3. Copy content (excluding build artifacts)
            await copyRecursive(srcPath, newProjectPath);

            // 4. Rename .ebproj
            const oldEbprojName = path.basename(srcPath) + '.ebproj';
            const oldEbprojPath = path.join(newProjectPath, oldEbprojName);

            // If we copied blindly, the old .ebproj is there. Rename it or create new?
            // Creating new is safer to ensure metadata Name matches.
            // But we might want to keep the blocks inside.
            // Let's assume the frontend will SAVE over this immediately, so the content of .ebproj here matters less than the structure.
            // However, it's cleaner to rename the copied one if it exists.
            if (fs.existsSync(oldEbprojPath)) {
                await fs.promises.rename(oldEbprojPath, newEbprojPath);

                // Update Metadata Name in the file
                try {
                    const content = JSON.parse(await fs.promises.readFile(newEbprojPath, 'utf-8'));
                    if (content.metadata) {
                        content.metadata.name = newName;
                        content.metadata.lastModified = Date.now();
                        await fs.promises.writeFile(newEbprojPath, JSON.stringify(content, null, 2));
                    }
                } catch (e) { console.warn('Failed to update metadata in copied project', e); }
            }

            return { success: true, newPath: newEbprojPath };

        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    // --- Save Project ---
    async saveProject(ebprojPath: string, data: { blocklyState: string, code: string, boardId?: string, buildConfig?: ProjectBuildConfig }): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('[ProjectService] Saving project to:', ebprojPath);
            // ...

            // 1. Read existing
            if (!fs.existsSync(ebprojPath)) {
                return { success: false, error: 'Project file not found' };
            }

            const contentRaw = await fs.promises.readFile(ebprojPath, 'utf-8');
            let projectContent: ProjectFileContent;
            try {
                projectContent = JSON.parse(contentRaw);
            } catch (e) {
                return { success: false, error: 'Project file corrupted' };
            }

            // 2. Update Content
            projectContent.metadata.lastModified = Date.now();
            if (data.boardId) projectContent.metadata.boardId = data.boardId;
            if (data.buildConfig) projectContent.metadata.buildConfig = data.buildConfig; // [NEW] Save config

            // ... (rest of logic same)
            try {
                projectContent.blocks = JSON.parse(data.blocklyState);
            } catch (e) {
                console.error("Failed to parse blockly state", e);
            }

            await fs.promises.writeFile(ebprojPath, JSON.stringify(projectContent, null, 2));

            // [NEW] Regenerate platformio.ini if buildConfig is provided and valid
            if (data.buildConfig && Object.keys(data.buildConfig).length > 0) {
                try {
                    // We need to merge with base template info (platform, board, etc.)
                    // Current data.buildConfig might only have 'project' specific fields if not careful,
                    // but in FileSystemContext we store the FULL buildConfig including board, platform etc?
                    // Let's verify: Metadata stores `buildConfig`.
                    // If Metadata.buildConfig is complete (as it should be from createProject), we can use it.

                    // We need to ensure we have the base fields (platform, board, framework)
                    // If the user only updated 'upload_protocol', we might miss the others if we just pass `data.buildConfig` assuming it's a full Template.
                    // However, `updateProjectConfig` in FrontEnd merges updates into the existing full object.
                    // So `projectMetadata.buildConfig` should be the complete object.

                    // Cast to PlatformIOTemplate (intersection of ProjectBuildConfig and board info)
                    // Just strictly, we should ensure 'platform', 'board', 'framework' exist.
                    // They are mandatory in 'createProject', so they should be in metadata.

                    const pioTemplate = data.buildConfig as any;
                    if (pioTemplate.platform && pioTemplate.board && pioTemplate.framework) {
                        const iniContent = generateIniConfig(pioTemplate);
                        await fs.promises.writeFile(path.join(path.dirname(ebprojPath), 'platformio.ini'), iniContent);
                    }
                } catch (e) {
                    console.warn('[ProjectService] Failed to regenerate platformio.ini on save', e);
                }
            }

            // 3. Save .cpp Code
            const projectDir = path.dirname(ebprojPath);
            const cppPath = path.join(projectDir, 'src', 'main.cpp');
            if (!fs.existsSync(path.dirname(cppPath))) await fs.promises.mkdir(path.dirname(cppPath), { recursive: true });
            await fs.promises.writeFile(cppPath, data.code);

            // ...

            // 4. Remove legacy .json if exists (Cleanup)
            const legacyJsonPath = path.join(projectDir, `${path.basename(ebprojPath, '.ebproj')}.json`);
            if (fs.existsSync(legacyJsonPath)) {
                try { await fs.promises.unlink(legacyJsonPath); } catch (e) { /* ignore */ }
            }

            // [NEW] Remove Backup (.swp) on successful save
            this.discardBackup(ebprojPath);

            return { success: true };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // --- Backup Mechanism ---
    // Backup Path Generator: .<projectName>.ebproj.swp
    private getBackupPath(ebprojPath: string): string {
        const dir = path.dirname(ebprojPath);
        const name = path.basename(ebprojPath, '.ebproj');
        return path.join(dir, `.${name}.ebproj.swp`);
    }

    async backupProject(ebprojPath: string, data: { blocklyState: string, code: string, boardId: string, buildConfig?: ProjectBuildConfig }): Promise<{ success: boolean; error?: string }> {
        try {
            if (!ebprojPath) return { success: false, error: 'No path' };
            const backupPath = this.getBackupPath(ebprojPath);
            const content = {
                timestamp: Date.now(),
                ...data
            };
            fs.writeFileSync(backupPath, JSON.stringify(content));
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    async checkBackup(ebprojPath: string): Promise<{ hasBackup: boolean; timestamp?: number }> {
        try {
            const backupPath = this.getBackupPath(ebprojPath);
            if (fs.existsSync(backupPath)) {
                // Determine if backup is newer than file?
                // The filesystem timestamp of the swp vs the ebproj.
                // Or we trust existence means "unsaved work".
                // Simple logic: If swp exists, it means previous session exited without "Save" (which deletes swp).
                // So it is likely valid unsaved work. We return true.
                const stat = fs.statSync(backupPath);
                return { hasBackup: true, timestamp: stat.mtimeMs };
            }
            return { hasBackup: false };
        } catch (e) {
            return { hasBackup: false };
        }
    }

    async restoreBackup(ebprojPath: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const backupPath = this.getBackupPath(ebprojPath);
            if (!fs.existsSync(backupPath)) return { success: false, error: 'Backup not found' };

            const raw = fs.readFileSync(backupPath, 'utf-8');
            const data = JSON.parse(raw);
            return { success: true, data };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    async discardBackup(ebprojPath: string): Promise<void> {
        try {
            const backupPath = this.getBackupPath(ebprojPath);
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
        } catch (e) { /* ignore */ }
    }

    // --- Open Project ---
    async openProjectDialog(): Promise<{ cancelled: boolean; projectPath?: string; data?: ProjectData; error?: string }> {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Open EmbedBlocks Project',
            defaultPath: configService.get('general.workDir'),
            filters: [{ name: 'EmbedBlocks Project', extensions: ['ebproj'] }],
            properties: ['openFile']
        });

        if (canceled || filePaths.length === 0) return { cancelled: true };

        const ebprojPath = filePaths[0];
        return await this.openProject(ebprojPath);
    }

    async openProject(ebprojPath: string): Promise<{ cancelled: boolean; error?: string; projectPath?: string; data?: ProjectData }> {
        try {
            // Check existence
            if (!fs.existsSync(ebprojPath)) return { cancelled: false, error: 'Project file not found' };

            // 1. Read .ebproj
            const contentRaw = fs.readFileSync(ebprojPath, 'utf-8');
            const rawJson = JSON.parse(contentRaw);
            console.log('[ProjectService] Opened project:', ebprojPath);
            console.log('[ProjectService] Raw JSON keys:', Object.keys(rawJson));

            let metadata: ProjectMetadata;
            let blocks: any;

            // Handle migration: Check if it's old format (only metadata) or new format (metadata + blocks)
            if (rawJson.metadata && rawJson.blocks) {
                // New Format
                metadata = rawJson.metadata;
                blocks = rawJson.blocks;
                // Removed aggressive migration to prevent data loss of top-level properties (viewState)
            } else {
                // Old Format (Migration Logic)
                metadata = rawJson as ProjectMetadata;

                // Try find legacy json
                const projectDir = path.dirname(ebprojPath);
                const legacyJsonPath = path.join(projectDir, `${metadata.name}.json`);
                if (fs.existsSync(legacyJsonPath)) {
                    const legacyContent = fs.readFileSync(legacyJsonPath, 'utf-8');
                    blocks = JSON.parse(legacyContent);
                } else {
                    blocks = { blocks: { languageVersion: 0, blocks: [] } };
                }
            }

            const projectDir = path.dirname(ebprojPath);

            // 3. Read Code
            const cppPath = path.join(projectDir, 'src', 'main.cpp');
            let code = '';
            if (fs.existsSync(cppPath)) {
                code = fs.readFileSync(cppPath, 'utf-8');
            }

            // Update WorkDir
            configService.set('general.workDir', path.dirname(projectDir));

            return {
                cancelled: false,
                projectPath: ebprojPath,
                data: {
                    metadata,
                    xml: JSON.stringify(blocks), // Protocol expects string
                    code
                }
            };
        } catch (error: any) {
            return { cancelled: false, error: `Failed to load project: ${error.message}` };
        }
    }

    // Helper alias for internal calls if needed check names
    async loadProject(ebprojPath: string) { return this.openProject(ebprojPath); }
}

export const projectService = new ProjectService();
