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
    code: string;
    onChange?: (value: string | undefined) => void;
    readOnly?: boolean;
    language?: string;
}


export const CodeEditor: React.FC<CodeEditorProps> = ({
    code,
    onChange,
    readOnly = true,
    language = 'cpp'
}) => {

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        // Optional: Configure editor further here if needed
        // editor.focus();
    };

    return (
        <div className="h-full w-full overflow-hidden">
            <Editor
                height="100%"
                width="100%"
                language={language}
                value={code}
                theme="vs-dark"
                onChange={onChange}
                onMount={handleEditorDidMount}
                options={{
                    readOnly: readOnly,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    renderWhitespace: 'none',
                }}
            />
        </div>
    );
};
