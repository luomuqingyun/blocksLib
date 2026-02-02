/**
 * ============================================================
 * 工作区布局组件 (Workspace Layout Component)
 * ============================================================
 * 
 * 负责主工作区的两栏布局：
 * - 左侧: Blockly 编辑器区域 (自适应宽度)
 * - 右侧: 代码预览和终端面板 (可拖拽调整宽度)
 * 
 * 功能:
 * - 支持通过拖拽分隔条调整左右面板比例
 * - 限制最小宽度为 200px，防止面板过小
 * - 拖拽时显示视觉反馈
 * 
 * @file src/components/Layout/WorkspaceLayout.tsx
 * @module EmbedBlocks/Frontend/Components/Layout
 */

import React, { useState } from 'react';

/** 工作区布局组件属性 */
interface WorkspaceLayoutProps {
    /** 左侧面板内容 (Blockly 编辑器) */
    leftPanel: React.ReactNode;
    /** 右侧面板内容 (代码预览 + 终端) */
    rightPanel: React.ReactNode;

    // 右侧面板宽度状态 (由父组件 App.tsx 管理，便于保持状态)
    /** 右侧面板当前宽度 (像素) */
    rightPanelWidth: number;
    /** 设置右侧面板宽度的回调 */
    setRightPanelWidth: (width: number) => void;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
    leftPanel,
    rightPanel,
    rightPanelWidth,
    setRightPanelWidth
}) => {
    // 拖拽状态
    const [isDragging, setIsDragging] = useState(false);

    /**
     * 开始拖拽调整宽度
     * 添加全局鼠标事件监听
     */
    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
    };

    /**
     * 处理鼠标移动，计算新宽度
     * 限制最小宽度为 200px
     */
    const handleMouseMove = (e: MouseEvent) => {
        const newWidth = window.innerWidth - e.clientX;
        // 限制宽度范围：最小 200px，最大为窗口宽度 - 200px
        if (newWidth > 200 && newWidth < window.innerWidth - 200) {
            setRightPanelWidth(newWidth);
        }
    };

    /** 停止拖拽，移除事件监听 */
    const stopResizing = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* 左侧面板 - 自适应宽度 */}
            <div className="flex-1 relative">
                {leftPanel}
            </div>

            {/* 拖拽分隔条 */}
            <div
                className={`w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-20 flex items-center justify-center ${isDragging ? 'bg-blue-600' : 'bg-slate-300'}`}
                onMouseDown={startResizing}
            >
                <div className="h-8 w-0.5 bg-slate-400 rounded-full"></div>
            </div>

            {/* 右侧面板 - 固定宽度 */}
            {rightPanel}
        </div>
    );
};
