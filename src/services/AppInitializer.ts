/**
 * ============================================================
 * 应用初始化服务 (App Initializer Service)
 * ============================================================
 * 
 * 负责应用程序启动时的全局初始化工作，包括:
 * - Blockly 模块加载
 * - 插件注册 (CrossTabCopyPaste 等)
 * - Polyfills 注入
 * 
 * 旨在将副作用从 UI 组件 (BlocklyWrapper) 中分离出来。
 * 
 * @file src/services/AppInitializer.ts
 */

import * as Blockly from 'blockly';
import { CrossTabCopyPaste } from '@blockly/plugin-cross-tab-copy-paste';
import { initAllModules } from '../modules/index';
import { initBlocklyPolyfills } from '../config/blockly-setup';

class AppInitializerService {
    private initialized = false;

    /**
     * 执行所有初始化步骤
     * 保证只执行一次 (Idempotent)
     */
    public initialize() {
        if (this.initialized) {
            return;
        }

        console.log('[AppInitializer] Starting application initialization...');

        // 1. 初始化 Blockly 填充/降级方案
        this.initPolyfills();

        // 2. 初始化所有功能模块 (Hardware, Core, etc.)
        this.initModules();

        // 3. 初始化全局插件
        this.initPlugins();

        this.initialized = true;
        console.log('[AppInitializer] Initialization complete.');
    }

    private initModules() {
        try {
            initAllModules();
        } catch (e) {
            console.error('[AppInitializer] Failed to initialize modules:', e);
        }
    }

    private initPolyfills() {
        try {
            initBlocklyPolyfills();
        } catch (e) {
            console.error('[AppInitializer] Failed to initialize polyfills:', e);
        }
    }

    private initPlugins() {
        try {
            // CrossTabCopyPaste Plugin
            // 只有在未注册时才初始化
            if (!Blockly.ContextMenuRegistry.registry.getItem('blockCopyToStorage')) {
                const copyPastePlugin = new CrossTabCopyPaste();
                copyPastePlugin.init({ contextMenu: true, shortcut: true });
                console.log('[AppInitializer] CrossTabCopyPaste plugin registered.');
            }
        } catch (e) {
            console.warn('[AppInitializer] Plugin initialization warning:', e);
        }
    }
}

export const AppInitializer = new AppInitializerService();
