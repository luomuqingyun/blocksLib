/**
 * ============================================================
 * Sharp 红外测距传感器模块 (Sharp IR Distance Sensor)
 * ============================================================
 * 
 * 提供 Sharp 红外测距积木:
 * - sharp_ir_init: 初始化 (引脚/型号)
 * - sharp_ir_read: 读取距离 (cm)
 * 
 * 使用 SharpIR.h 库。支持 GP2Y0A21 (10-80cm) 等型号。
 * 
 * @file src/modules/hardware/sharp_ir.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock, reservePin } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // =========================================================================
    // Sharp IR (Analog Read + Formula or Library)
    // =========================================================================
    // Clean room strategy: Generic analog read wrapper or SharpIR library.
    // SharpIR library is standard for accurate cm conversion.

    registerBlock('sharp_ir_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHARP_INIT);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHARP_PIN_ANALOG)
                .appendField(new Blockly.FieldTextInput("A0"), "PIN");
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHARP_MODEL)
                .appendField(new Blockly.FieldDropdown([
                    ["10-80cm (2Y0A21)", "1080"],
                    ["4-30cm (2Y0A41)", "430"],
                    ["100-500cm (2Y0A02)", "100500"]
                ]), "MODEL");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_SHARP_IR_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const model = block.getFieldValue('MODEL');

        reservePin(block, pin, 'INPUT');

        arduinoGenerator.addInclude('sharp_ir_lib', '#include <SharpIR.h>');
        // Note: SharpIR construct arguments vary by library version. 
        // Commonly: SharpIR sensor(model, pin); Or defines.
        // We assume generic usage: SharpIR sensor(SharpIR::GP2Y0A21YK0F, A0);
        // Mapping codes to library constants:
        let modelCode = "SharpIR::GP2Y0A21YK0F"; // 1080 default
        if (model === "430") modelCode = "SharpIR::GP2Y0A41SK0F";
        if (model === "100500") modelCode = "SharpIR::GP2Y0A02YK0F";

        arduinoGenerator.addVariable(`sharp_${pin}`, `SharpIR sharp_${pin}(${modelCode}, ${pin});`);

        return '';
    });

    registerBlock('sharp_ir_read', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SHARP_READ);
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_SENSOR_PIN)
                .appendField(new Blockly.FieldTextInput("A0"), "PIN");
            this.setOutput(true, "Number");
            this.setColour(280);
            this.setTooltip(Blockly.Msg.ARD_SHARP_IR_READ_TOOLTIP);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        return [`sharp_${pin}.getDistance()`, Order.ATOMIC];
    });

};

export const SharpIRModule: BlockModule = {
    id: 'hardware.sharp_ir',
    name: 'Sharp IR',
    category: 'Sharp IR',
    init
};
