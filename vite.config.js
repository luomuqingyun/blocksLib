const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react').default;
const electron = require('vite-plugin-electron').default;
const renderer = require('vite-plugin-electron-renderer').default;
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default;

module.exports = defineConfig({
    server: {
        port: 5173, // Vite 默认端口
        strictPort: false, // 允许自动尝试下一个可用端口
    },
    plugins: [
        react(),
        electron([
            {
                entry: 'electron/main.ts',
                vite: {
                    build: {
                        rollupOptions: {
                            external: ['serialport'],
                        },
                    },
                },
            },
            {
                entry: 'electron/preload.ts',
                onstart(options) {
                    options.reload()
                },
            },
        ]),
        renderer(),
        monacoEditorPlugin({
            // Optimize Bundle: Only load necessary languages
            // Originally loaded all languages (causing 3MB+ bundle)
            languageWorkers: ['editorWorkerService', 'typescript', 'json'],
            features: ['coreCommands', 'find', 'format', 'codeAction', 'rename', 'hover', 'bracketMatching', 'wordHighlighter', 'suggest', 'indentation', 'selectionClipboard'], // Optional: Limit features if needed
            languages: ['cpp', 'json', 'html', 'css', 'typescript', 'javascript', 'markdown']
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-monaco': ['monaco-editor'],
                    'vendor-blockly': ['blockly'],
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-icons': ['lucide-react'],
                },
            },
        },
    },
});
