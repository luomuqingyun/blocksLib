const { execFile, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const cmdPath = path.join(__dirname, 'test space space', 'test.cmd');
fs.mkdirSync(path.dirname(cmdPath), { recursive: true });
fs.writeFileSync(cmdPath, '@echo off\necho arg1: %1\necho arg2: %2');

// Test 1: execFile with spaces in path
execFile(cmdPath, ['hello', 'world \n with newline'], (err, stdout, stderr) => {
    console.log('--- Test 1 (execFile directly) ---');
    if (err) console.error('Error:', err.message);
    else console.log('Stdout:', stdout.trim());

    // Test 2: execFile with shell: true
    execFile(`"${cmdPath}"`, ['hello', '"world \n with newline"'], { shell: true }, (err2, stdout2) => {
        console.log('\n--- Test 2 (execFile with shell) ---');
        if (err2) console.error('Error:', err2.message);
        else console.log('Stdout:', stdout2.trim());

        // Test 3: bypass cmd completely by running Node manually?
    });
});
