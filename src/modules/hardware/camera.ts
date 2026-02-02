/**
 * ============================================================
 * ESP32 摄像头模块 (ESP32 Camera Module)
 * ============================================================
 * 
 * 提供 ESP32-CAM 摄像头积木 (esp_camera.h):
 * - camera_init: 初始化 (AI-Thinker 引脚配置)
 * - camera_take_photo: 拍照并获取帧缓冲区
 * 
 * 适用于 ESP32-CAM 开发板。
 * 
 * @file src/modules/hardware/camera.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

  // ESP32 摄像头初始化 (AI-Thinker 引脚配置)
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
    // 包含 esp_camera 核心头文件
    arduinoGenerator.addInclude('camera_lib', '#include "esp_camera.h"');
    // 定义摄像头配置结构体
    arduinoGenerator.addVariable('camera_config', `camera_config_t config;`);
    // 定义适用于大多数 ESP32-CAM (如安信可 AI-Thinker) 的引脚映射宏
    arduinoGenerator.addVariable('camera_pin_config', `
// 摄像头引脚定义 (安信可 AI-Thinker 模型)
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

    // 定义详细的初始化函数：处理时钟、引脚分配、分辨率及 PSRAM 检测
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
  
  // 如果找到 PSRAM，则支持更高分辨率和更高质量
  if(psramFound()){
    config.frame_size = FRAMESIZE_UXGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }
  
  // 核心初始化调用，若失败则通常会停留在 while 循环或打印错误
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    return;
  }
}`;

    // 在 setup 中调用初始化
    arduinoGenerator.addSetup('camera_setup', `initCamera();`);
    return '';
  });

  // 执行拍照动作
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
    // 获取帧缓冲区快照并立即释放（示例性逻辑，后续可对接 SD 卡或网络发送）
    return `
    camera_fb_t * fb = esp_camera_fb_get();
    if(!fb) {
      // 捕获失败处理逻辑
    } else {
      // 成功获取图像数据 fb->buf，大小为 fb->len
      esp_camera_fb_return(fb); // 获取后必须释放缓冲区
    }
\n`;
  });
};

export const CameraModule: BlockModule = {
  id: 'hardware.camera',
  name: 'ESP32 Camera',
  init
};
