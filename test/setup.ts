/**
 * ============================================================
 * 测试环境初始化 (Test Setup Provider)
 * ============================================================
 * 
 * 负责在测试运行前配置全局模拟对象 (Mocks) 和环境 polyfill。
 * 主要用于模拟 Vitest JSDOM 环境中缺失的浏览器 API。
 * 
 * 核心功能:
 * - Mock matchMedia: 解决 UI 组件测试中的媒体查询报错
 * - Mock Blockly: (如有需) 模拟 Blockly 引擎行为
 * 
 * @file test/setup.ts
 * @module EmbedBlocks/Testing/Setup
 */

import { vi } from 'vitest';

// ------------------------------------------------------------------
// Polyfill: window.matchMedia
// ------------------------------------------------------------------
// JSDOM 不支持 matchMedia，但很多 UI 库 (如 Monaco Editor, Material UI) 
// 依赖此 API 来检测响应式布局或主题设置。
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // 已废弃但在旧库中仍使用
        removeListener: vi.fn(), // 已废弃但在旧库中仍使用
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// ------------------------------------------------------------------
// Global Mock Strategy
// ------------------------------------------------------------------
// 目前主要依赖 jsdom 提供的基础浏览器环境。
// 对于 Blockly 等大型外部依赖，建议在各个 test 文件中按需进行局部 Mock，
// 而不是在这里进行全局 Mock，以避免污染全局命名空间或增加测试启动开销。
