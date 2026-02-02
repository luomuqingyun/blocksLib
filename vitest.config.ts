/// <reference types="vitest" />
/**
 * ============================================================
 * Vitest 测试配置 (Vitest Configuration)
 * ============================================================
 * 
 * 配置项目的单元测试环境。
 * 
 * 核心配置:
 * - environment: jsdom (模拟浏览器 DOM 环境)
 * - globals: true (开启全局测试 API，如 describe, it)
 * - include: 定义测试文件的匹配模式
 * 
 * @file vitest.config.ts
 * @module EmbedBlocks/Testing/Config
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // 使用 jsdom 模拟浏览器环境，支持 window/document 等全局对象
        environment: 'jsdom',

        // 开启全局 API (describe, it, expect 等)，无需每个文件 import
        globals: true,

        // 测试运行前的初始化文件 (Mock 浏览器 API 等)
        setupFiles: ['./test/setup.ts'],

        // 匹配测试文件的 Glob 模式
        // 包括 test/ 目录下的测试文件和 src/ 目录下的同名测试文件
        include: [
            'test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
        ],
    },
});
