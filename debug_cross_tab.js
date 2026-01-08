const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (path) {
    if (path === 'blockly/core') {
        return {
            Blockly: {
                registry: {
                    register: () => { }
                }
            }
        };
    }
    return originalRequire.apply(this, arguments);
};

try {
    const plugin = require('./node_modules/@blockly/plugin-cross-tab-copy-paste/dist/index.js');
    console.log('Plugin keys:', Object.keys(plugin));

    if (plugin.CrossTabCopyPaste) {
        console.log('plugin.CrossTabCopyPaste exists');
        console.log('Type of plugin.CrossTabCopyPaste:', typeof plugin.CrossTabCopyPaste);
        console.log('KEYS of plugin.CrossTabCopyPaste:', Object.keys(plugin.CrossTabCopyPaste));

        // Check for init directly on the export
        if (plugin.CrossTabCopyPaste.init) {
            console.log('init found directly on CrossTabCopyPaste');
        }

        // Check prototype
        if (plugin.CrossTabCopyPaste.prototype) {
            console.log('plugin.CrossTabCopyPaste.prototype keys:', Object.keys(plugin.CrossTabCopyPaste.prototype));
            if (plugin.CrossTabCopyPaste.prototype.init) {
                console.log('init found on prototype');
            }
        }

    } else {
        console.log('plugin.CrossTabCopyPaste does not exist directly on exports');
        if (plugin.init) {
            console.log('init found directly on plugin exports');
        }
    }

} catch (e) {
    console.error(e);
}
