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
 * 获取所有已注册开发板列表并订阅更新的 Hook。
 * 
 * 适用于需要显示板卡列表的组件（如“新建项目”或“板卡选择器”）。
 * 当通过扩展加载了新的板卡定义时，此 Hook 会自动触发组件重新渲染。
 */
export function useBoards() {
    // 初始状态从注册表同步获取
    const [boards, setBoards] = useState<BoardConfig[]>(BoardRegistry.getAll());

    useEffect(() => {
        // 订阅注册表的变更事件（例如通过插件注册了新板卡时）
        const unsubscribe = BoardRegistry.subscribe(() => {
            setBoards(BoardRegistry.getAll());
        });

        // 挂载时再次强制同步一次，确保数据最新
        setBoards(BoardRegistry.getAll());

        // 生命周期结束时取消订阅，防止内存泄漏
        return unsubscribe;
    }, []);

    return boards;
}
