import { useEffect } from 'react';
import { BlocklyWrapperHandle } from '../../components/BlocklyWrapper';

interface AutoBackupProps {
    isDirty: boolean;
    currentFilePath: string | null;
    workspaceVersion: number;
    code: string;
    projectMetadata: any;
    blocklyRef: React.RefObject<BlocklyWrapperHandle>;
}

export const useAutoBackup = (props: AutoBackupProps) => {
    const { isDirty, currentFilePath, workspaceVersion, code, projectMetadata, blocklyRef } = props;

    // 1. Auto-Backup Mechanism (Debounced)
    useEffect(() => {
        if (!isDirty || !currentFilePath || !window.electronAPI) return;

        const timer = setTimeout(async () => {
            const state = blocklyRef.current?.getXml();
            if (!state) return;

            console.log(`[AutoBackup] Triggering Backup (Ver: ${workspaceVersion})`);
            await window.electronAPI.backupProject(currentFilePath, {
                blocklyState: state,
                code: code,
                boardId: projectMetadata?.boardId || '',
                buildConfig: projectMetadata?.buildConfig
            });
        }, 3000); // 3s debounce

        return () => clearTimeout(timer);
    }, [isDirty, workspaceVersion, currentFilePath, code, projectMetadata, blocklyRef]);

    // 2. Force backup on window exit/refresh
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isDirty && currentFilePath && window.electronAPI && blocklyRef.current) {
                const state = blocklyRef.current.getXml();
                if (state) {
                    window.electronAPI.backupProject(currentFilePath, {
                        blocklyState: state,
                        code: code,
                        boardId: projectMetadata?.boardId || '',
                        buildConfig: projectMetadata?.buildConfig
                    });
                }
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, currentFilePath, code, projectMetadata, blocklyRef]);
};
