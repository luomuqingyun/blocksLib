import { BrowserWindow } from 'electron';
import { pioService } from './PioService';
import { serialService } from './SerialService';
import { extensionService } from './ExtensionService';

export class BuildWorkflowService {
    private buildCounter = 0;

    /**
     * Executes the specific build or upload workflow using PlatformIO.
     * Handles coordination between Serial Port and PIO (e.g., closing port before upload).
     */
    public async runOrchestration(
        mainWindow: BrowserWindow | null,
        code: string,
        buildConfig: any,
        operation: 'build' | 'upload',
        port?: string,
        projectPath?: string
    ) {
        // Generate unique build ID to prevent log mixing
        const buildId = `${Date.now()}-${++this.buildCounter}`;

        const sendLog = (msg: string) => mainWindow?.webContents.send('build-log', { buildId, message: msg });

        // Notify frontend that a new build session started
        mainWindow?.webContents.send('build-start', { buildId, operation });

        // 0. Determine Target Port
        // Priority: buildConfig.upload_port (project settings) > Monitor Port (passed from UI)
        const targetUploadPort = (operation === 'upload' && buildConfig?.upload_port) ? buildConfig.upload_port : port;

        // 1. Close Serial Port if necessary
        // Logic: Only force close if "Upload Port" is the SAME as "Monitoring Port".
        const status = serialService.getStatus();
        const wasConnected = status.connected;
        const previousPort = status.port;

        // Check collision: if we are uploading to the SAME port that is currently open
        // If targetUploadPort is undefined (auto search), we conservatively close to be safe.
        // If targetUploadPort is defined and equals previousPort, we close.
        const isPortCollision = wasConnected && (!targetUploadPort || targetUploadPort === previousPort);

        if (isPortCollision) {
            serialService.close();
            mainWindow?.webContents.send('monitor-status', { connected: false });
        } else if (wasConnected && operation === 'upload') {
            // If not colliding (Dual Port Mode), log it
            sendLog(`Dual Port Mode: Monitoring ${previousPort}, Uploading to ${targetUploadPort || 'Auto'}`);
        }

        // 2. Get Extension Libraries
        const extLibPaths = extensionService.getExtensionLibPaths();

        // 3. Execute PIO Operation
        let result;
        if (operation === 'build') {
            result = await pioService.build(code, buildConfig, extLibPaths, sendLog, projectPath);
        } else {
            // Pre-flight Check: Verify Port Exists
            if (targetUploadPort) {
                const ports = await serialService.listPorts();
                const portExists = ports.some(p => p.path === targetUploadPort);
                if (!portExists) {
                    sendLog(`Error: Target Upload Port [${targetUploadPort}] not found!`);
                    sendLog(`Hint: Check connection, or clear 'Upload Port' in settings to use Monitor Port.`);
                    return;
                }
            }

            // Note: targetUploadPort might be undefined/empty, in which case PIO auto-detects
            result = await pioService.upload(code, buildConfig, targetUploadPort, extLibPaths, sendLog, projectPath);
        }

        // 4. Restore Serial Port
        // Only prompt to reconnect if we forced it closed
        if (isPortCollision && wasConnected && previousPort && result.success) {
            sendLog("Note: Please manually reconnect Serial Monitor if needed.");
        }
    }
}

export const buildWorkflowService = new BuildWorkflowService();
