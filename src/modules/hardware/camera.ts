// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

  registerBlock('camera_init', {
    init: function () {
      this.appendDummyInput()
        .appendField(Blockly.Msg.ARD_CAMERA_INIT);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip(Blockly.Msg.ARD_CAMERA_INIT_TOOLTIP);
    }
  }, (block: any) => {
    arduinoGenerator.addInclude('camera_lib', '#include "esp_camera.h"');
    arduinoGenerator.addVariable('camera_config', `camera_config_t config;`);
    arduinoGenerator.addVariable('camera_pin_config', `
// Camera Pins (AI Thinker Model)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
`);

    arduinoGenerator.functions_['camera_config_func'] = `
void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  if(psramFound()){
    config.frame_size = FRAMESIZE_UXGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }
  
  // camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    // Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
}`;

    arduinoGenerator.addSetup('camera_setup', `initCamera();`);
    return '';
  });

  registerBlock('camera_take_photo', {
    init: function () {
      this.appendDummyInput()
        .appendField(Blockly.Msg.ARD_CAMERA_TAKE);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip(Blockly.Msg.ARD_CAMERA_CAP_TOOLTIP);
    }
  }, (block: any) => {
    return `
    camera_fb_t * fb = esp_camera_fb_get();
    if(!fb) {
      // Serial.println("Camera capture failed");
    } else {
      // Process fb->buf, fb->len here if needed
      esp_camera_fb_return(fb); 
    }
\n`;
    // This block is a bit "empty" without logic to save or send.
    // Usually combined with SD Save or HTTP Send.
    // For now, it just exercises the driver.
  });
};

export const CameraModule: BlockModule = {
  id: 'hardware.camera',
  name: 'ESP32 Camera',
  category: 'Sensors',
  init
};
