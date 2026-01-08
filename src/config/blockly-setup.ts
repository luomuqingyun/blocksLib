import * as Blockly from 'blockly';
import { setBlocklyLocale } from '../locales/setupBlocklyLocales';

// Initial Locale Setup (Default EN)
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
