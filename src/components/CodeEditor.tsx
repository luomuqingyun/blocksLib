/**
 * ============================================================
 * 代码编辑器组件 (Code Editor Component)
 * ============================================================
 * 
 * 基于 Monaco Editor 的代码显示/编辑组件。
 * 主要用于:
 * - 右侧面板代码预览 (只读模式)
 * - 设置模态框 JSON 编辑 (可编辑模式)
 * 
 * 支持 C++、JSON 等语言高亮。
 * 
 * @file src/components/CodeEditor.tsx
 * @module EmbedBlocks/Frontend/Components/CodeEditor
 */

import React from 'react';
import Editor, { OnMount, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

loader.config({ monaco });

/** 代码编辑器属性 */
interface CodeEditorProps {
    /** 要显示或编辑的代码内容 */
    code: string;
    /** 代码发生变化时的回调函数 */
    onChange?: (value: string | undefined) => void;
    /** 是否处于只读模式，默认为 true */
    readOnly?: boolean;
    /** 代码语言类型 (如 'cpp', 'json')，默认为 'cpp' */
    language?: string;
}


export const CodeEditor: React.FC<CodeEditorProps> = ({
    code,
    onChange,
    readOnly = true,
    language = 'cpp'
}) => {

    /** 
     * 编辑器挂载完成后的回调
     * 可用于进一步配置 Monaco 实例
     */
    const handleEditorDidMount: OnMount = (editor, monaco) => {
        // 如果需要，可以在这里进行额外的编辑器设置
    };

    return (
        <div className="h-full w-full overflow-hidden">
            {/* 使用 Monaco Editor 组件 */}
            <Editor
                height="100%"
                width="100%"
                language={language}
                value={code}
                theme="vs-dark" // 使用深色主题
                onChange={onChange}
                onMount={handleEditorDidMount}
                options={{
                    readOnly: readOnly,          // 只读状态
                    minimap: { enabled: false }, // 禁用小地图以节省空间
                    scrollBeyondLastLine: false, // 禁用最后一行之后的额外滚动
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace", // 优雅的等宽字体
                    automaticLayout: true,       // 自动适应容器大小变化
                    padding: { top: 16, bottom: 16 },
                    renderWhitespace: 'none',    // 不显示空白字符
                }}
            />
        </div>
    );
};
