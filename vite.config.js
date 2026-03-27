const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react').default;
const electron = require('vite-plugin-electron').default;
const renderer = require('vite-plugin-electron-renderer').default;
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default;

/**
 * ============================================================
 * EmbedBlocks Studio 主应用构建配置 (Vite)
 * ============================================================
 */
module.exports = defineConfig(({ command }) => {
    const isBuild = command === 'build';

    const electronPluginOptions = [
        {
            // Electron 主进程配置 (Main Process)
            entry: 'electron/main.ts',
            vite: {
                build: {
                    rollupOptions: {
                        // 排除不需要打包进 bundle 的原生模块
                        external: ['serialport', 'electron', 'jsdom'],
                    },
                },
                plugins: [] // 主进程构建时禁用渲染进程专用的昂贵插件
            },
        },
        {
            // Electron 预加载脚本配置 (Preload Script)
            entry: 'electron/preload.ts',
            onstart(options) {
                // 当预加载脚本代码变动时，自动刷新窗口
                options.reload()
            },
        },
    ];

    // [性能优化]: 仅在生产构建或明确开启测试标志时，才把庞大的测试与AI核心编译为主进程模块
    // 这避免了日常 npm run dev 时将其附带的 1600+ 前端模块全部塞入后端而导致的 30s 严重启动延迟
    if (isBuild || process.env.BUILD_TESTS === 'true') {
        electronPluginOptions.push({
            entry: 'electron/testRunner.ts',
            vite: {
                build: { rollupOptions: { external: ['serialport', 'electron', 'jsdom'] } }
            }
        });
        electronPluginOptions.push({
            entry: 'electron/aiRunner.ts',
            vite: {
                build: { rollupOptions: { external: ['serialport', 'electron'] } }
            }
        });
    }

    return {
        // 1. 开发服务器配置
        server: {
            port: 5173,
            strictPort: false, // 如果端口被占用，自动尝试下一个
        },
        plugins: [
            // 2. React 支持插件
            react(),

            // 3. Electron 集成插件 - 负责主进程和预加载脚本的构建与热重启
            electron(electronPluginOptions),

        // 4. Electron 渲染进程支持 (Renderer Process)
        renderer(),

        // 5. Monaco 编辑器插件 (代码编辑器配置)
        monacoEditorPlugin({
            // 只打包必要的语言 Worker，减小体积
            languageWorkers: ['editorWorkerService', 'typescript', 'json'],
            // 启用的功能模块
            features: [
                'coreCommands', 'find', 'format', 'codeAction', 'rename',
                'hover', 'bracketMatching', 'wordHighlighter', 'suggest',
                'indentation', 'selectionClipboard'
            ],
            // 语法高亮支持的语言
            languages: ['cpp', 'json', 'html', 'css', 'typescript', 'javascript', 'markdown']
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                // 6. 代码拆分优化 (Manual Chunks)
                // 将大文件夹拆分为独立的 JS 文件，利用缓存并提升首次加载速度
                manualChunks: {
                    'vendor-monaco': ['monaco-editor'],
                    'vendor-blockly': ['blockly'],
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-icons': ['lucide-react'],
                },
            },
        },
    },
    };
});
