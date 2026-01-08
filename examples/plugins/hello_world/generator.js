// Define the generator for the hello_world_print block
Blockly.Arduino['hello_world_print'] = function (block) {
    var text = Blockly.Arduino.valueToCode(block, 'TEXT', Blockly.Arduino.ORDER_ATOMIC) || '"World"';

    // 1. Ensure Serial is started in setup()
    // Using the helper 'addSetup' from our updated sandbox engine
    Blockly.Arduino.addSetup('serial_begin', 'Serial.begin(115200);');

    // 2. Return the code to run in loop()
    var code = 'Serial.print("Hello ");\n' +
        'Serial.println(' + text + ');\n';
    return code;
};
