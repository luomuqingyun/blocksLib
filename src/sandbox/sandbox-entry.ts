import * as Blockly from 'blockly';
import { arduinoGenerator } from '../generators/arduino-base';
import * as En from 'blockly/msg/en';
import * as Zh from 'blockly/msg/zh-hans';

const isZh = navigator.language && navigator.language.toLowerCase().startsWith('zh');
if (isZh) {
    Blockly.setLocale(Zh as any);
} else {
    Blockly.setLocale(En as any);
}

// Mock global Blockly for extensions
// We create a mutable object that inherits from the immutable module namespace
// This allows extensions to add properties like Blockly.Arduino
const MockBlockly: any = { ...Blockly };
(window as any).Blockly = MockBlockly;

// Expose Arduino generator for extensions to register definitions
(window as any).Blockly.Arduino = arduinoGenerator;

console.log('[Sandbox] Initialized');

window.addEventListener('message', async (event) => {
    const data = event.data;
    if (!data) return;

    try {
        if (data.type === 'load-script') {
            console.log(`[Sandbox] Loading script for ${data.id}`);
            // Security: We are inside a sandboxed iframe. 
            // We use Function constructor to run the code in global scope (of the iframe).
            const runScript = new Function(data.content);
            runScript();
        } else if (data.type === 'load-definitions') {
            console.log(`[Sandbox] Loading JSON definitions for ${data.id}`);
            Blockly.defineBlocksWithJsonArray(data.definitions);
        } else if (data.type === 'generate-code') {
            const stateText = data.xml; // Field kept as 'xml' but might be JSON
            const workspace = new Blockly.Workspace();

            try {
                let loaded = false;
                // Try JSON deserialization
                if (typeof stateText === 'string' && stateText.trim().startsWith('{')) {
                    try {
                        const state = JSON.parse(stateText);
                        Blockly.serialization.workspaces.load(state, workspace);
                        loaded = true;
                    } catch (e) {
                        console.warn('[Sandbox] JSON parse failed, falling back to XML', e);
                    }
                }

                // Fallback to XML
                if (!loaded) {
                    const dom = Blockly.utils.xml.textToDom(stateText);
                    Blockly.Xml.domToWorkspace(dom, workspace);
                }

                // Initialize Arduino generator
                arduinoGenerator.init(workspace);
                // Generate C++ code
                const code = arduinoGenerator.workspaceToCode(workspace);

                event.source?.postMessage({
                    type: 'code-generated',
                    requestId: data.requestId,
                    code: code,
                    success: true
                }, { targetOrigin: '*' });

            } catch (err: any) {
                console.error('[Sandbox] Generation failed', err);
                event.source?.postMessage({
                    type: 'code-generated',
                    requestId: data.requestId,
                    error: err.message,
                    success: false
                }, { targetOrigin: '*' });
            } finally {
                workspace.dispose();
            }
        }
    } catch (e) {
        console.error('[Sandbox] Error processing message', e);
    }
});
