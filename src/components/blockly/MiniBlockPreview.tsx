/**
 * ============================================================
 * 微缩积木块预览组件 (Mini Block Preview Component)
 * ============================================================
 *
 * 该组件用于在自定义背包中渲染真实的 Blockly 积木图形。
 * 它通过注入一个极其精简、只读的“无头(headless)”工作区来实现图形化预览。
 * 
 * 技术实现:
 * - 使用 Blockly.inject 创建隐藏工具链的只读工作区
 * - 动态解析并加载 blockJson
 * - 使用 zoomToFit 和 centerOnBlock 自动缩放和居中积木图形
 * - 禁用所有用户交互 (滚动、拖拽、点击)
 */

import React, { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';

/** 微缩预览组件的属性定义 */
interface MiniBlockPreviewProps {
    /** 积木块序列化后的 JSON 数据，包含类型、字段和嵌套子块 */
    blockJson: any;
}

export const MiniBlockPreview: React.FC<MiniBlockPreviewProps> = ({ blockJson }) => {
    // 渲染微型工作区的 DOM 容器引用
    const containerRef = useRef<HTMLDivElement>(null);
    // 保存 Blockly 实例的引用，便于在组件卸载时清理
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // 初始化一个只读、无控件的工作区环境用于渲染 SVG
        const workspace = Blockly.inject(containerRef.current, {
            readOnly: true,         // 禁止修改
            scrollbars: false,      // 隐藏滚动条
            trashcan: false,        // 隐藏垃圾桶
            zoom: {
                controls: false,    // 隐藏放大缩小按钮
                wheel: false,       // 禁用滚轮缩放
                startScale: 0.6,    // 初始缩放比例 (稍后会动态调整)
                maxScale: 1,
                minScale: 0.3,
                scaleSpeed: 1.2
            },
            theme: Blockly.Themes.Classic, // 使用经典主题确保颜色一致
            move: {
                scrollbars: false,  // 彻底关闭画布移动支持
                drag: true,         // 【修复】允许内部拖拽以支持程序化 move/centerOnBlock，CSS已屏蔽真实用户事件
                wheel: false        // 禁止滚轮移动画布
            }
        });

        workspaceRef.current = workspace;

        try {
            // 清理可能残留的状态，然后将积木反序列化（绘制）到工作区
            workspace.clear();
            const newBlock = Blockly.serialization.blocks.append(blockJson, workspace);

            // 延迟执行以等待 Blockly 内部的 SVG 布局和渲染周期完成
            setTimeout(() => {
                if (workspace && newBlock) {
                    // 尝试将积木自动缩放以适合视口大小
                    workspace.zoomToFit();

                    // 获取自适应后的缩放比例，并略微往回缩一点 (0.8x)
                    // 这是为了确保积木边缘不会过于贴紧容器边缘，留出“呼吸感”内边距
                    const currentScale = workspace.scale;
                    workspace.setScale(currentScale * 0.8);

                    // 将指定的积木移动到视野中心
                    workspace.centerOnBlock(newBlock.id);
                }
            }, 10);

        } catch (e) {
            console.error("渲染微缩预览积木图形失败:", e);
        }

        // 组件卸载时的清理逻辑，防止内存泄漏 
        return () => {
            if (workspaceRef.current) {
                workspaceRef.current.dispose();
                workspaceRef.current = null;
            }
        };
    }, [blockJson]); // 仅当被传入的积木数据发生变化时才重新渲染

    return (
        <div
            ref={containerRef}
            className="mini-block-preview"
            style={{
                width: '100%',
                height: '80px',
                pointerEvents: 'none',   // CSS层面彻底阻断所有鼠标事件，防止干扰外层的列表项点击
                overflow: 'hidden',      // 隐藏任何绘制越界的 SVG 元素
                borderRadius: '6px',     // 给预览加上轻微圆角
                background: 'rgba(0,0,0,0.02)' // 背景填充一层极淡的灰黑色作为底色分离
            }}
        />
    );
};
