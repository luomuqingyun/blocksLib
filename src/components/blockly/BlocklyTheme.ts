/**
 * ============================================================
 * Blockly 主题定义 (Blockly Theme Definitions)
 * ============================================================
 * 
 * 定义 Blockly 工作区的视觉主题配置。
 * 
 * 主题:
 * - embed_dark: 深色主题 (默认)
 * - embed_light: 浅色主题
 * 
 * 配置项:
 * - 工作区背景色
 * - 工具箱颜色
 * - 飞出面板颜色
 * - 滚动条样式
 * - 字体配置
 * 
 * @file src/components/blockly/BlocklyTheme.ts
 * @module EmbedBlocks/Frontend/Components/Blockly
 */

import * as Blockly from 'blockly';
import { createUseStyles } from 'react-jss';

// ------------------------------------------------------------------
// 深色主题定义 (Dark Theme Definition)
// ------------------------------------------------------------------
export const DarkTheme = Blockly.Theme.defineTheme('embed_dark', {
    name: 'embed_dark',
    base: Blockly.Themes.Classic,
    componentStyles: {
        workspaceBackgroundColour: '#1e293b',    // 工作区背景色
        toolboxBackgroundColour: '#0f172a',       // 工具箱背景色
        toolboxForegroundColour: '#f8fafc',       // 工具箱前景色
        flyoutBackgroundColour: '#1e293b',        // 飞出面板背景色
        flyoutForegroundColour: '#f8fafc',        // 飞出面板前景色
        flyoutOpacity: 0.9,                       // 飞出面板透明度
        scrollbarColour: '#475569',               // 滚动条颜色
        insertionMarkerColour: '#3b82f6',         // 插入标记颜色
        insertionMarkerOpacity: 0.3,
        scrollbarOpacity: 0.4,
        cursorColour: '#d0d0d0',                  // 光标颜色
        // @ts-ignore
        gridColour: '#475569'                     // [NEW] 栅格颜色 (灰白色，保证可见度)
    },
    fontStyle: { family: 'Inter, sans-serif', weight: '500', size: 13 },
    startHats: true  // 启用帧头样式
});

// ------------------------------------------------------------------
// 浅色主题定义 (Light Theme Definition)
// ------------------------------------------------------------------

export const LightTheme = Blockly.Theme.defineTheme('embed_light', {
    name: 'embed_light',
    base: Blockly.Themes.Classic,
    componentStyles: {
        workspaceBackgroundColour: '#ffffff',
        toolboxBackgroundColour: '#f1f5f9',
        toolboxForegroundColour: '#334155',
        flyoutBackgroundColour: '#ffffff',
        flyoutForegroundColour: '#334155',
        flyoutOpacity: 0.9,
        scrollbarColour: '#cbd5e1',
        insertionMarkerColour: '#3b82f6',
        insertionMarkerOpacity: 0.3,
        scrollbarOpacity: 0.4,
        cursorColour: '#000000',
        // @ts-ignore
        gridColour: '#e2e8f0'
    },
    fontStyle: { family: 'Inter, sans-serif', weight: '500', size: 13 }
});

// ------------------------------------------------------------------
// 自定义插件样式 (Custom Plugin Styles)
// ------------------------------------------------------------------
export const useBlocklyStyles = createUseStyles({
    '@global': {
        // 分类行样式优化
        '.blocklyTreeRow': {
            lineHeight: '36px !important',
            height: '36px !important',
        },
        // 工具箱搜索框样式
        '.blocklyToolboxSearch': {
            display: 'block',
            marginBottom: '8px'
        },
        // 确保输入框文本为黑色
        'input.blocklyHtmlInput': {
            color: '#000000 !important',
        }
    }
});
