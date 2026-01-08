import * as Blockly from 'blockly';
import { createUseStyles } from 'react-jss';

// ------------------------------------------------------------------
// 主题定义 (Theme Definitions)
// ------------------------------------------------------------------
export const DarkTheme = Blockly.Theme.defineTheme('embed_dark', {
    name: 'embed_dark',
    base: Blockly.Themes.Classic,
    componentStyles: {
        workspaceBackgroundColour: '#1e293b',
        toolboxBackgroundColour: '#0f172a',
        toolboxForegroundColour: '#f8fafc',
        flyoutBackgroundColour: '#1e293b',
        flyoutForegroundColour: '#f8fafc',
        flyoutOpacity: 0.9,
        scrollbarColour: '#475569',
        insertionMarkerColour: '#3b82f6',
        insertionMarkerOpacity: 0.3,
        scrollbarOpacity: 0.4,
        cursorColour: '#d0d0d0'
    },
    fontStyle: { family: 'Inter, sans-serif', weight: '500', size: 13 },
    startHats: true
});

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
        cursorColour: '#000000'
    },
    fontStyle: { family: 'Inter, sans-serif', weight: '500', size: 13 }
});

// Custom styles for plugins
export const useBlocklyStyles = createUseStyles({
    '@global': {    // Make custom categories look better
        '.blocklyTreeRow': {
            lineHeight: '36px !important',
            height: '36px !important',
        },
        // Toolbox Search Input (ensure it's not hidden by themes)
        '.blocklyToolboxSearch': {
            display: 'block',
            marginBottom: '8px'
        },
        // Ensure all text is black in inputs
        'input.blocklyHtmlInput': {
            color: '#000000 !important',
        }
    }
});
