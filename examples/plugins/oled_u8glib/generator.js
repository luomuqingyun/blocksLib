/**
 * OLED (U8glib-HAL) Generator
 */
(function () {
    // 1. 初始化积木生成器
    Blockly.Arduino['u8g2_init_12864'] = function (block) {
        const sda = block.getFieldValue('SDA');
        const scl = block.getFieldValue('SCL');

        // 添加头文件引用
        Blockly.Arduino.addInclude('u8g2_header', '#include <U8g2lib.h>\n#include <Wire.h>');

        // 添加全局变量声明
        Blockly.Arduino.addDeclaration('u8g2_instance', `U8G2_SSD1306_128X64_NONAME_F_SW_I2C u8g2(U8G2_R0, ${scl}, ${sda}, U8X8_PIN_NONE);`);

        // 在 setup() 中添加初始化逻辑
        const setupCode = 'u8g2.begin();';
        Blockly.Arduino.addSetup('u8g2_init', setupCode);

        return '';
    };

    // 2. 绘制文本积木生成器
    Blockly.Arduino['u8g2_draw_str'] = function (block) {
        const font = block.getFieldValue('FONT');
        const x = block.getFieldValue('X');
        const y = block.getFieldValue('Y');
        const text = Blockly.Arduino.valueToCode(block, 'TEXT', Blockly.Arduino.ORDER_ATOMIC) || '" "';

        // 渲染逻辑
        const code = `u8g2.clearBuffer();\nu8g2.setFont(${font});\nu8g2.drawStr(${x}, ${y}, ${text}.c_str());\nu8g2.sendBuffer();\n`;
        return code;
    };
})();
