const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react').default;

module.exports = defineConfig({
    plugins: [react()],
    base: './',
    build: {
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
            input: {
                sandbox: 'src/sandbox/sandbox.html',
            },
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                },
            },
        },
    },
});
