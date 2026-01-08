import React, { useState, useEffect, useCallback, useRef } from 'react';
// @ts-ignore
import * as Blockly from 'blockly';
import './CustomBackpack.css';

// Storage key for localStorage
const BACKPACK_STORAGE_KEY = 'embedblocks_backpack';

// Backpack item interface
interface BackpackItem {
    id: string;
    blockJson: any;
    preview: string;
    blockType: string;
    timestamp: number;
    blockCount: number; // Number of blocks in chain
}

interface CustomBackpackProps {
    workspace: any;
}

// Count blocks in chain
function countBlocksInChain(block: any): number {
    let count = 1;
    let next = block.nextConnection?.targetBlock();
    while (next) {
        count++;
        next = next.nextConnection?.targetBlock();
    }
    return count;
}

// Get preview text for block chain
function getChainPreview(block: any): string {
    const texts: string[] = [];
    let current = block;
    while (current && texts.length < 3) {
        texts.push(current.toString());
        current = current.nextConnection?.targetBlock();
    }
    if (current) {
        texts.push('...');
    }
    return texts.join(' → ');
}

// Backpack icon SVG - 80x80px to match Blockly system icons
const BackpackIcon = () => (
    <svg viewBox="0 0 24 24" width="80" height="80" style={{ width: 80, height: 80 }} fill="currentColor">
        <path d="M13.97,5.34C13.98,5.23,14,5.12,14,5c0-1.1-0.9-2-2-2s-2,0.9-2,2c0,0.12,0.02,0.23,0.03,0.34C7.69,6.15,6,8.38,6,11v8 c0,1.1,0.9,2,2,2h8c1.1,0,2-0.9,2-2v-8C18,8.38,16.31,6.15,13.97,5.34z M11,5c0-0.55,0.45-1,1-1s1,0.45,1,1 c0,0.03-0.01,0.06-0.02,0.09C12.66,5.03,12.34,5,12,5s-0.66,0.03-0.98,0.09C11.01,5.06,11,5.03,11,5z M16,13v1v0.5 c0,0.28-0.22,0.5-0.5,0.5S15,14.78,15,14.5V14v-1H8v-1h7h1V13z" />
    </svg>
);

export const CustomBackpack: React.FC<CustomBackpackProps> = ({ workspace }) => {
    const [items, setItems] = useState<BackpackItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const backpackBtnRef = useRef<HTMLButtonElement>(null);
    const dragTargetRef = useRef<any>(null);
    const itemsRef = useRef(items); // Track items for duplicate check

    // Keep itemsRef in sync
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    // Stable addBlock function
    const addBlockToBackpack = useCallback((block: any) => {
        try {
            // Save block with all connected children
            const blockJson = Blockly.serialization.blocks.save(block);
            if (!blockJson) return;

            // Check for duplicates
            const jsonStr = JSON.stringify(blockJson);
            const exists = itemsRef.current.some(item =>
                JSON.stringify(item.blockJson) === jsonStr
            );
            if (exists) {
                return;
            }

            const blockCount = countBlocksInChain(block);
            const preview = blockCount > 1 ? getChainPreview(block) : block.toString();

            const newItem: BackpackItem = {
                id: `bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                blockJson,
                preview,
                blockType: block.type,
                timestamp: Date.now(),
                blockCount
            };

            setItems(prev => [newItem, ...prev]);
        } catch (e) {
            console.error('Failed to add block to backpack:', e);
        }
    }, []);

    // Load items from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(BACKPACK_STORAGE_KEY);
            if (saved) {
                setItems(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load backpack:', e);
        }
    }, []);

    // Save items to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(BACKPACK_STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            console.error('Failed to save backpack:', e);
        }
    }, [items]);

    // Register DragTarget for drag-drop support
    useEffect(() => {
        if (!workspace || !backpackBtnRef.current) return;

        const addFn = addBlockToBackpack;
        const btnRef = backpackBtnRef;

        // Create DragTarget for the backpack
        class BackpackDragTarget {
            id = 'custom-backpack-drag-target';

            getClientRect() {
                if (btnRef.current) {
                    const rect = btnRef.current.getBoundingClientRect();
                    return new Blockly.utils.Rect(
                        rect.top - 15,
                        rect.bottom + 15,
                        rect.left - 15,
                        rect.right + 15
                    );
                }
                return null;
            }

            onDragEnter(_dragElement: any) {
                setIsDragOver(true);
            }

            onDragOver(_dragElement: any) {
                // Keep drag over state
            }

            onDragExit(_dragElement: any) {
                setIsDragOver(false);
            }

            onDrop(dragElement: any) {
                setIsDragOver(false);
                // Check if it's a block
                if (dragElement && dragElement.type) {
                    addFn(dragElement);
                }
            }

            // CRITICAL: Return true to prevent block from moving to drop location
            // This makes the block return to its original position
            shouldPreventMove(dragElement: any) {
                // Prevent move for blocks - they should stay in place
                return dragElement instanceof Blockly.BlockSvg;
            }
        }

        const dragTarget = new BackpackDragTarget();
        dragTargetRef.current = dragTarget;

        // Register with workspace component manager
        try {
            workspace.getComponentManager().addComponent({
                component: dragTarget,
                weight: 1,
                capabilities: [Blockly.ComponentManager.Capability.DRAG_TARGET]
            });
        } catch (e) {
            console.error('Failed to register drag target:', e);
        }

        return () => {
            try {
                if (dragTargetRef.current) {
                    workspace.getComponentManager().removeComponent('custom-backpack-drag-target');
                }
            } catch (e) { }
        };
    }, [workspace, addBlockToBackpack]);

    // Register context menu items
    useEffect(() => {
        if (!workspace) return;

        const copyToBackpackId = 'copy_to_custom_backpack';
        if (!Blockly.ContextMenuRegistry.registry.getItem(copyToBackpackId)) {
            Blockly.ContextMenuRegistry.registry.register({
                id: copyToBackpackId,
                displayText: (scope: any) => {
                    if (!scope.block) return '📦 复制到背包';
                    const count = countBlocksInChain(scope.block);
                    return count > 1 ? `📦 复制 ${count} 个积木到背包` : '📦 复制到背包';
                },
                scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
                weight: 200,
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

    // Add block from backpack to workspace
    const addToWorkspace = useCallback((item: BackpackItem) => {
        if (!workspace) return;

        try {
            const block = Blockly.serialization.blocks.append(
                item.blockJson,
                workspace,
                { recordUndo: true }
            );
            if (block) {
                const metrics = workspace.getMetrics();
                const x = metrics.viewLeft + metrics.viewWidth / 2 - 50;
                const y = metrics.viewTop + 50;
                block.moveBy(x / workspace.scale, y / workspace.scale);
                (block as any).select?.();
            }
        } catch (e) {
            console.error('Failed to add block from backpack:', e);
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

    // Remove item from backpack
    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    }, []);

    // Clear all items
    const clearAll = useCallback(() => {
        if (window.confirm('确定清空背包？')) {
            setItems([]);
        }
    }, []);

    // Close panel when clicking outside
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
