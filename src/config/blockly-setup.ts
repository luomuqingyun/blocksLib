/**
 * ============================================================
 * Blockly 初始化配置 (Blockly Setup)
 * ============================================================
 * 
 * Blockly 库的初始化配置和兼容性 Polyfill。
 * 
 * 包含:
 * - 初始加载时设置默认语言 (英文)
 * - 注入已弃用 API 的 Polyfill (如 getAllVariables)
 * 
 * 这些 Polyfill 确保使用旧版 API 的代码仍能正常工作。
 * 
 * @file src/config/blockly-setup.ts
 * @module EmbedBlocks/Config/Blockly
 */

import * as Blockly from 'blockly';
import { setBlocklyLocale } from '../locales/setupBlocklyLocales';

// 初始化语言设置 (默认英文)
setBlocklyLocale('en').catch(console.error);

export const initBlocklyPolyfills = () => {
    // Polyfill for deprecated getAllVariables to silence warning
    // @ts-ignore
    if (Blockly.Workspace.prototype.getAllVariables && !Blockly.Workspace.prototype.getAllVariables.isPolyfill) {
        // @ts-ignore
        Blockly.Workspace.prototype.getAllVariables = function () {
            return this.getVariableMap().getAllVariables();
        };
        // @ts-ignore
        Blockly.Workspace.prototype.getAllVariables.isPolyfill = true;
    }

    // @ts-ignore
    if (Blockly.Workspace.prototype.getVariableById && !Blockly.Workspace.prototype.getVariableById.isPolyfill) {
        // @ts-ignore
        Blockly.Workspace.prototype.getVariableById = function (id: string) {
            return this.getVariableMap().getVariableById(id);
        };
        // @ts-ignore
        Blockly.Workspace.prototype.getVariableById.isPolyfill = true;
    }

    // @ts-ignore
    if (Blockly.Workspace.prototype.getVariable && !Blockly.Workspace.prototype.getVariable.isPolyfill) {
        // @ts-ignore
        Blockly.Workspace.prototype.getVariable = function (name: string) {
            return this.getVariableMap().getVariable(name);
        };
        // @ts-ignore
        Blockly.Workspace.prototype.getVariable.isPolyfill = true;
    }
};
