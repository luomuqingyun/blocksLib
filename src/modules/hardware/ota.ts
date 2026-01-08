// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

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

        arduinoGenerator.addInclude('ota_lib', '#include <ArduinoOTA.h>');

        arduinoGenerator.addSetup('ota_config', `
  ArduinoOTA.setHostname(${name});
  // ArduinoOTA.setPassword("admin"); // Optional
  
  ArduinoOTA.onStart([]() {
    String type;
    if (ArduinoOTA.getCommand() == U_FLASH)
      type = "sketch";
    else // U_SPIFFS
      type = "filesystem";
    // NOTE: if updating SPIFFS this would be the place to unmount SPIFFS using SPIFFS.end()
  });
  
  ArduinoOTA.begin();`);

        return '';
    });

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
        return `ArduinoOTA.handle();\n`;
    });

};

export const OTAModule: BlockModule = {
    id: 'hardware.ota',
    name: 'Wireless Update (OTA)',
    category: 'ESP32',
    init
};
