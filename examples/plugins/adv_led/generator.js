// 1. Initialization Block
Blockly.Arduino['adv_led_init'] = function (block) {
    var pin = block.getFieldValue('PIN');

    // Use addSetup to configure pin mode strictly once
    Blockly.Arduino.addSetup('led_' + pin, 'pinMode(' + pin + ', OUTPUT);');

    return ''; // Init blocks usually don't generate code in loop
};

// 2. Blink Block
Blockly.Arduino['adv_led_blink'] = function (block) {
    var pin = block.getFieldValue('PIN');
    var delayTime = Blockly.Arduino.valueToCode(block, 'DELAY', Blockly.Arduino.ORDER_ATOMIC) || '1000';

    // Ensure setup is present even if user forgot the init block (Robustness)
    Blockly.Arduino.addSetup('led_' + pin, 'pinMode(' + pin + ', OUTPUT);');

    var code = 'digitalWrite(' + pin + ', HIGH);\n' +
        'delay(' + delayTime + ');\n' +
        'digitalWrite(' + pin + ', LOW);\n' +
        'delay(' + delayTime + ');\n';
    return code;
};
