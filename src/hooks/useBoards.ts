/**
 * ============================================================
 * 板卡列表 Hook (Boards Hook)
 * ============================================================
 * 
 * 获取所有已注册的开发板列表并订阅更新。
 * 当扩展插件注册新板卡时，自动更新组件状态。
 * 
 * @file src/hooks/useBoards.ts
 * @module EmbedBlocks/Frontend/Hooks
 */

import { useState, useEffect } from 'react';
import { BoardRegistry } from '../registries/BoardRegistry';
import { BoardConfig } from '../types/board';

/**
 * Hook to get all registered boards and subscribe to changes.
 * Useful for components that need to display a board list that can be updated by extensions.
 */

export function useBoards() {
    const [boards, setBoards] = useState<BoardConfig[]>(BoardRegistry.getAll());

    useEffect(() => {
        const unsubscribe = BoardRegistry.subscribe(() => {
            setBoards(BoardRegistry.getAll());
        });

        // Initial sync
        setBoards(BoardRegistry.getAll());

        return unsubscribe;
    }, []);

    return boards;
}
