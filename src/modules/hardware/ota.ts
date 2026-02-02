/**
 * ============================================================
 * OTA 无线更新模块 (Over-The-Air Update)
 * ============================================================
 * 
 * 提供 ESP32 无线固件更新积木:
 * - ota_setup: 初始化 OTA (设备名称)
 * - ota_handle: 处理 OTA 请求 (放在 loop 中)
 * 
 * 使用 ArduinoOTA.h 库。
 * 
 * @file src/modules/hardware/ota.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

    // 初始化 OTA (空中升级) 配置
    registerBlock('ota_setup', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTA_SETUP);
            this.appendValueInput("NAME")
                .setCheck("String")
                .appendField(Blockly.Msg.ARD_OTA_HOST);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_OTA_INIT_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const name = arduinoGenerator.valueToCode(block, 'NAME', Order.ATOMIC) || '"MyDevice"';

        // 包含 Arduino 官方 OTA 库
        arduinoGenerator.addInclude('ota_lib', '#include <ArduinoOTA.h>');

        // 在 setup 中配置主机名并启动 OTA 服务
        arduinoGenerator.addSetup('ota_config', `
  ArduinoOTA.setHostname(${name});
  // ArduinoOTA.setPassword("admin"); // 可选
  
  ArduinoOTA.onStart([]() {
    String type;
    if (ArduinoOTA.getCommand() == U_FLASH)
      type = "sketch";
    else // U_SPIFFS
      type = "filesystem";
    // 注意：若是更新 SPIFFS，需在此处卸载文件系统
  });
  
  ArduinoOTA.begin();`);

        return '';
    });

    // 处理 OTA 待命任务（必须放在主循环 loop 中执行）
    registerBlock('ota_handle', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_OTA_HANDLE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip(Blockly.Msg.ARD_OTA_LOOP_TOOLTIP);
        }
    }, (block: any) => {
        // ArduinoOTA.handle() 会检查是否有新的固件上传请求，并处理上传过程
        return `ArduinoOTA.handle();\n`;
    });

};

/**
 * 远程无线更新 (OTA) 模块
 * 允许通过 Wi-Fi 远程上传固件，无需连接 USB 线，适用于部署后的设备维护。
 */
export const OTAModule: BlockModule = {
    id: 'hardware.ota',
    name: 'Wireless Update (OTA)',
    init
};
