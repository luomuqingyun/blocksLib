/**
 * ============================================================
 * 自定义背包组件 (Custom Backpack Component)
 * ============================================================
 * 
 * Blockly 积木背包功能，允许用户保存和复用积木块组合。
 * 
 * 功能:
 * - 拖拽积木到背包图标进行保存
 * - 右键菜单 "复制到背包" 选项
 * - 支持保存连锁积木 (block chain)
 * - 本地存储持久化 (localStorage)
 * - 点击背包项添加到工作区
 * 
 * 技术实现:
 * - 使用 Blockly DragTarget API 实现拖放
 * - 注册右键菜单项
 * - 序列化/反序列化积木块
 * 
 * @file src/components/blockly/CustomBackpack.tsx
 * @module EmbedBlocks/Frontend/Components/Blockly
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
// @ts-ignore
import * as Blockly from 'blockly';
import './CustomBackpack.css';

/** 本地存储的键名 */
const BACKPACK_STORAGE_KEY = 'embedblocks_backpack';

/** 背包项接口 */
interface BackpackItem {
    /** 唯一标识符 */
    id: string;
    /** 序列化的积木块 JSON 数据 */
    blockJson: any;
    /** 积木块预览文本 */
    preview: string;
    /** 积木块类型 */
    blockType: string;
    /** 添加时间戳 */
    timestamp: number;
    /** 连接的积木块数量 */
    blockCount: number;
}

/** 背包组件属性 */
interface CustomBackpackProps {
    /** Blockly 工作区实例 */
    workspace: any;
}

/**
 * 计算积木块链的总数量
 * 从当前块开始，沿着 nextConnection 遍历所有连接的块
 * 
 * @param block 起始积木块
 * @returns 链中积木块总数
 */
function countBlocksInChain(block: any): number {
    let count = 1;
    // 沿着 nextConnection 向下遍历
    let next = block.nextConnection?.targetBlock();
    while (next) {
        count++;
        next = next.nextConnection?.targetBlock();
    }
    return count;
}

/**
 * 获取积木块链的预览文本
 * 最多显示前 3 个块的文本，超出部分用 ... 表示
 * 
 * @param block 起始积木块
 * @returns 用 → 连接的预览字符串
 */
function getChainPreview(block: any): string {
    const texts: string[] = [];
    let current = block;
    // 最多收集 3 个块的文本
    while (current && texts.length < 3) {
        texts.push(current.toString());
        current = current.nextConnection?.targetBlock();
    }
    // 还有更多块时添加省略号
    if (current) {
        texts.push('...');
    }
    return texts.join(' → ');
}

/** 背包图标 SVG - 80x80px 尺寸与 Blockly 系统图标一致 */
const BackpackIcon = () => (
    <svg viewBox="0 0 24 24" width="80" height="80" style={{ width: 80, height: 80 }} fill="currentColor">
        <path d="M13.97,5.34C13.98,5.23,14,5.12,14,5c0-1.1-0.9-2-2-2s-2,0.9-2,2c0,0.12,0.02,0.23,0.03,0.34C7.69,6.15,6,8.38,6,11v8 c0,1.1,0.9,2,2,2h8c1.1,0,2-0.9,2-2v-8C18,8.38,16.31,6.15,13.97,5.34z M11,5c0-0.55,0.45-1,1-1s1,0.45,1,1 c0,0.03-0.01,0.06-0.02,0.09C12.66,5.03,12.34,5,12,5s-0.66,0.03-0.98,0.09C11.01,5.06,11,5.03,11,5z M16,13v1v0.5 c0,0.28-0.22,0.5-0.5,0.5S15,14.78,15,14.5V14v-1H8v-1h7h1V13z" />
    </svg>
);

export const CustomBackpack: React.FC<CustomBackpackProps> = ({ workspace }) => {
    // ========== 状态管理 ==========
    const [items, setItems] = useState<BackpackItem[]>([]);  // 背包中的积木块列表
    const [isOpen, setIsOpen] = useState(false);              // 背包面板是否展开
    const [isDragOver, setIsDragOver] = useState(false);      // 是否有积木块正在拖入

    // ========== Refs ==========
    const panelRef = useRef<HTMLDivElement>(null);            // 背包面板 DOM 引用
    const backpackBtnRef = useRef<HTMLButtonElement>(null);   // 背包按钮 DOM 引用
    const dragTargetRef = useRef<any>(null);                  // 拖放目标实例
    const itemsRef = useRef(items);                           // items 的 ref 副本，用于闭包中访问最新值

    // 保持 itemsRef 与 items 同步
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    /**
     * 将积木块添加到背包
     * - 序列化积木块 (包含所有连接的子块)
     * - 检查重复，避免重复添加
     * - 生成预览文本和元数据
     */
    const addBlockToBackpack = useCallback((block: any) => {
        try {
            // 使用 Blockly 序列化 API 保存积木块 (包含所有连接的子块)
            const blockJson = Blockly.serialization.blocks.save(block);
            if (!blockJson) return;

            // 检查是否已存在相同的积木块
            const jsonStr = JSON.stringify(blockJson);
            const exists = itemsRef.current.some(item =>
                JSON.stringify(item.blockJson) === jsonStr
            );
            if (exists) {
                return; // 已存在，不重复添加
            }

            // 计算积木块链数量并生成预览文本
            const blockCount = countBlocksInChain(block);
            const preview = blockCount > 1 ? getChainPreview(block) : block.toString();

            // 创建新的背包项
            const newItem: BackpackItem = {
                id: `bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                blockJson,
                preview,
                blockType: block.type,
                timestamp: Date.now(),
                blockCount
            };

            // 添加到列表开头 (最新的在前面)
            setItems(prev => [newItem, ...prev]);
        } catch (e) {
            console.error('添加积木块到背包失败:', e);
        }
    }, []);

    // 从 localStorage 加载背包数据 (组件挂载时)
    useEffect(() => {
        try {
            const saved = localStorage.getItem(BACKPACK_STORAGE_KEY);
            if (saved) {
                setItems(JSON.parse(saved));
            }
        } catch (e) {
            console.error('加载背包数据失败:', e);
        }
    }, []);

    // 将背包数据保存到 localStorage (items 变化时)
    useEffect(() => {
        try {
            localStorage.setItem(BACKPACK_STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            console.error('保存背包数据失败:', e);
        }
    }, [items]);

    /**
     * 注册 Blockly DragTarget 实现拖放支持
     * 允许用户直接拖动积木块到背包图标上添加
     */
    useEffect(() => {
        if (!workspace || !backpackBtnRef.current) return;

        const addFn = addBlockToBackpack;
        const btnRef = backpackBtnRef;

        // 创建背包拖放目标类
        class BackpackDragTarget {
            id = 'custom-backpack-drag-target';

            /** 获取背包按钮的绘制区域 (稍微扩大便于拖放) */
            getClientRect() {
                if (btnRef.current) {
                    const rect = btnRef.current.getBoundingClientRect();
                    // 向外扩展 15px 便于拖放
                    return new Blockly.utils.Rect(
                        rect.top - 15,
                        rect.bottom + 15,
                        rect.left - 15,
                        rect.right + 15
                    );
                }
                return null;
            }

            /** 积木块进入背包区域 */
            onDragEnter(_dragElement: any) {
                setIsDragOver(true);
            }

            /** 积木块在背包区域内拖动 */
            onDragOver(_dragElement: any) {
                // 保持拖入状态
            }

            /** 积木块离开背包区域 */
            onDragExit(_dragElement: any) {
                setIsDragOver(false);
            }

            /** 积木块放下时添加到背包 */
            onDrop(dragElement: any) {
                setIsDragOver(false);
                // 确认是积木块类型
                if (dragElement && dragElement.type) {
                    addFn(dragElement);
                }
            }

            /** 
             * 阻止积木块移动到放下位置
             * 返回 true 让积木块回到原位置
             */
            shouldPreventMove(dragElement: any) {
                return dragElement instanceof Blockly.BlockSvg;
            }
        }

        const dragTarget = new BackpackDragTarget();
        dragTargetRef.current = dragTarget;

        // 注册到工作区组件管理器
        try {
            workspace.getComponentManager().addComponent({
                component: dragTarget,
                weight: 1,
                capabilities: [Blockly.ComponentManager.Capability.DRAG_TARGET]
            });
        } catch (e) {
            console.error('注册拖放目标失败:', e);
        }

        // 清理函数: 组件卸载时移除拖放目标
        return () => {
            try {
                if (dragTargetRef.current) {
                    workspace.getComponentManager().removeComponent('custom-backpack-drag-target');
                }
            } catch (e) { }
        };
    }, [workspace, addBlockToBackpack]);

    /**
     * 注册右键菜单项 "复制到背包"
     * 允许用户通过右键菜单将积木块添加到背包
     */
    useEffect(() => {
        if (!workspace) return;

        const copyToBackpackId = 'copy_to_custom_backpack';
        // 检查是否已注册，避免重复注册
        if (!Blockly.ContextMenuRegistry.registry.getItem(copyToBackpackId)) {
            Blockly.ContextMenuRegistry.registry.register({
                id: copyToBackpackId,
                // 动态显示文本，根据积木块链数量调整
                displayText: (scope: any) => {
                    if (!scope.block) return '📦 复制到背包';
                    const count = countBlocksInChain(scope.block);
                    return count > 1 ? `📦 复制 ${count} 个积木到背包` : '📦 复制到背包';
                },
                scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
                weight: 200,
                // 前置条件: 只在工作区积木块上显示 (排除 flyout)
                preconditionFn: (scope: any) => {
                    if (!scope.block) return 'hidden';
                    if (scope.block.workspace.isFlyout) return 'hidden';
                    return 'enabled';
                },
                callback: (scope: any) => {
                    if (scope.block) {
                        addBlockToBackpack(scope.block);
                    }
                }
            });
        }
    }, [workspace, addBlockToBackpack]);

    /**
     * 从背包中添加积木块到工作区
     * 反序列化并将积木块放置在视口中心位置
     */
    const addToWorkspace = useCallback((item: BackpackItem) => {
        if (!workspace) return;

        try {
            // 使用 Blockly 反序列化 API 添加积木块
            const block = Blockly.serialization.blocks.append(
                item.blockJson,
                workspace,
                { recordUndo: true }  // 记录撤销历史
            );
            if (block) {
                // 计算视口中心位置
                const metrics = workspace.getMetrics();
                const x = metrics.viewLeft + metrics.viewWidth / 2 - 50;
                const y = metrics.viewTop + 50;
                // 移动积木块到视口中心
                block.moveBy(x / workspace.scale, y / workspace.scale);
                // 选中新添加的积木块
                (block as any).select?.();
            }
        } catch (e) {
            console.error('从背包添加积木块失败:', e);
            // 回退方案: 创建空白积木块
            try {
                const block = workspace.newBlock(item.blockType);
                block.initSvg();
                block.render();
                const metrics = workspace.getMetrics();
                block.moveBy(
                    (metrics.viewLeft + metrics.viewWidth / 2 - 50) / workspace.scale,
                    (metrics.viewTop + 50) / workspace.scale
                );
            } catch (e2) {
                alert('无法添加此积木到工作区');
            }
        }
    }, [workspace]);

    /** 从背包中删除指定项 */
    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    }, []);

    /** 清空所有背包项 */
    const clearAll = useCallback(() => {
        if (window.confirm('确定清空背包？')) {
            setItems([]);
        }
    }, []);

    // 点击背包面板外部时关闭面板
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="custom-backpack" ref={panelRef}>
            <button
                ref={backpackBtnRef}
                className={`custom-backpack-btn ${isOpen ? 'active' : ''} ${items.length > 0 ? 'has-items' : ''} ${isDragOver ? 'drag-over' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title={`背包 (${items.length}) - 拖拽积木到此添加`}
                style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }}
            >
                <BackpackIcon />
                {items.length > 0 && (
                    <span className="custom-backpack-badge">{items.length}</span>
                )}
            </button>

            {isOpen && (
                <div className="custom-backpack-panel">
                    <div className="custom-backpack-header">
                        <span>📦 我的背包</span>
                        <span className="custom-backpack-count">{items.length} 个</span>
                        {items.length > 0 && (
                            <button
                                className="custom-backpack-clear"
                                onClick={clearAll}
                                title="清空背包"
                            >
                                🗑️
                            </button>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="custom-backpack-empty">
                            背包是空的<br />
                            <small>拖拽积木到背包图标<br />或右键 → "复制到背包"</small>
                        </div>
                    ) : (
                        <ul className="custom-backpack-list">
                            {items.map(item => (
                                <li key={item.id} className="custom-backpack-item">
                                    <div
                                        className="custom-backpack-item-content"
                                        onClick={() => addToWorkspace(item)}
                                        title="点击添加到工作区"
                                    >
                                        <span className="custom-backpack-item-preview">
                                            {item.blockCount > 1 && <span className="chain-badge">{item.blockCount}</span>}
                                            {item.preview || item.blockType}
                                        </span>
                                        <span className="custom-backpack-item-type">
                                            {item.blockType}
                                        </span>
                                    </div>
                                    <button
                                        className="custom-backpack-item-remove"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeItem(item.id);
                                        }}
                                        title="从背包移除"
                                    >
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomBackpack;
