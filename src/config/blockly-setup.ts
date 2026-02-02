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

// 初始化语言设置 (默认英文，后续会根据浏览器或配置动态切换)
setBlocklyLocale('en').catch(console.error);

/**
 * 初始化 Blockly 的 Polyfills (兼容性填充)
 * 为已弃用的 API 提供兼容性实现，防止旧代码报错并消除警告
 */
export const initBlocklyPolyfills = () => {
    // 为已弃用的 getAllVariables 提供 Polyfill
    // @ts-ignore
    if (Blockly.Workspace.prototype.getAllVariables && !Blockly.Workspace.prototype.getAllVariables.isPolyfill) {
        // @ts-ignore
        Blockly.Workspace.prototype.getAllVariables = function () {
            // 重定向到新的 VariableMap 系统
            return this.getVariableMap().getAllVariables();
        };
        // @ts-ignore
        Blockly.Workspace.prototype.getAllVariables.isPolyfill = true;
    }

    // 为已弃用的 getVariableById 提供 Polyfill
    // @ts-ignore
    if (Blockly.Workspace.prototype.getVariableById && !Blockly.Workspace.prototype.getVariableById.isPolyfill) {
        // @ts-ignore
        Blockly.Workspace.prototype.getVariableById = function (id: string) {
            // 重定向到 VariableMap 进行根据 ID 查找
            return this.getVariableMap().getVariableById(id);
        };
        // @ts-ignore
        Blockly.Workspace.prototype.getVariableById.isPolyfill = true;
    }

    // 为已弃用的 getVariable 提供 Polyfill
    // @ts-ignore
    if (Blockly.Workspace.prototype.getVariable && !Blockly.Workspace.prototype.getVariable.isPolyfill) {
        // @ts-ignore
        Blockly.Workspace.prototype.getVariable = function (name: string) {
            // 重定向到 VariableMap 进行根据名称查找
            return this.getVariableMap().getVariable(name);
        };
        // @ts-ignore
        Blockly.Workspace.prototype.getVariable.isPolyfill = true;
    }
};
