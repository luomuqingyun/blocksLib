import * as Blockly from 'blockly/core';

/**
 * 积木初始化函数
 * 该文件作为模块扩展机制的演示示例。
 */
export const initBlocks = () => {

    // =========================================================================
    // 开发调试日志积木 (Test Dev Log)
    // 演示如何创建一个带有字符串输入的简单顺序执行积木。
    // =========================================================================
    Blockly.Blocks['test_dev_log'] = {
        init: function () {
            this.appendValueInput("MESSAGE")
                .setCheck("String")
                .appendField(Blockly.Msg.BLOCK_DEV_LOG); // 输出开发日志
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip("Log message from internal block");
            this.setHelpUrl("");
        }
    };
};
