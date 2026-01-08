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
