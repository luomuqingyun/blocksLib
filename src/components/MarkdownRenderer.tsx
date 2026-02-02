/**
 * ============================================================
 * Markdown 渲染组件 (Markdown Renderer Component)
 * ============================================================
 * 
 * 使用 react-markdown 和 remark-gfm 渲染 Markdown 内容。
 * 支持 GitHub Flavored Markdown (GFM) 扩展语法。
 * 
 * GFM 扩展:
 * - 表格 (tables)
 * - 删除线 (strikethrough)
 * - 任务列表 (task lists)
 * - 自动链接 (autolinks)
 * 
 * @file src/components/MarkdownRenderer.tsx
 * @module EmbedBlocks/Frontend/Components/MarkdownRenderer
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Markdown 渲染组件属性 */
interface MarkdownRendererProps {
    /** 要渲染的 Markdown 内容 */
    content: string;
    /** 可选的 CSS 类名 */
    className?: string;
}

/**
 * Markdown 渲染组件
 * 使用 remark-gfm 插件支持 GitHub 风格的 Markdown 语法
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
    return (
        // markdown-body 类提供标准的 Markdown 样式
        <div className={`markdown-body ${className || ''}`}>
            {/* ReactMarkdown 组件渲染 Markdown 内容 */}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
