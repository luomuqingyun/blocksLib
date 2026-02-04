const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react').default;

/**
 * ============================================================
 * 扩展沙箱 (Extension Sandbox) 专属构建配置
 * ============================================================
 * 
 * 职责:
 * 1. 独立构建用于运行第三方插件代码的 sandbox.html 及其入口。
 * 2. 保证沙箱代码与主应用代码环境隔离，安全性更高。
 */
module.exports = defineConfig({
    plugins: [react()],
    // 使用相对路径，确保在 Electron 生产环境下文件引用正确
    base: './',
    build: {
        // 输出到主项目的 dist 目录，方便主进程统一加载
        outDir: 'dist',
        // 重要：禁止清空整个 dist 目录，因为主应用构建产物也存放在这里
        emptyOutDir: false,
        rollupOptions: {
            input: {
                // 定义入口点：沙箱的页面文件
                sandbox: 'src/sandbox/sandbox.html',
            },
            output: {
                // 启用 React 库的代码拆分，以便与主应用共享缓存
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                },
            },
        },
    },
});
