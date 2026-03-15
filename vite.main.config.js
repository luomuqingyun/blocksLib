const { defineConfig } = require('vite');
const electron = require('vite-plugin-electron').default;

module.exports = defineConfig({
    plugins: [
        electron([
            {
                entry: 'electron/main.ts',
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['serialport', 'electron', 'jsdom'],
                        },
                    },
                },
            },
            {
                entry: 'electron/preload.ts',
                vite: {
                    build: {
                        outDir: 'dist-electron',
                    },
                },
            },
        ]),
    ],
    build: {
        emptyOutDir: false, // 不要清空，因为 vite-plugin-electron 会自己处理
    }
});
