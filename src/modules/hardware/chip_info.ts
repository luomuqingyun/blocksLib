
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

  // 注入 C++ 辅助函数 (Helper Function Injection)
  // 根据宏定义 (#if defined) 自动适配不同硬件平台 (ESP32 / STM32 / AVR)
  // 使得同一个 Blockly 积木可以跨平台生成正确的底层代码
  const addBoardInfoHelper = () => {
    arduinoGenerator.addFunction('get_chip_info', `
String getChipInfoString(int type) {
  #if defined(ESP32)
    if (type == 0) { // MAC 地址获取
        // WiFi.macAddress() requires WiFi, but we can read base mac efuse directly
        uint64_t chipid = ESP.getEfuseMac(); 
        char mac[18];
        sprintf(mac, "%02X:%02X:%02X:%02X:%02X:%02X", 
            (uint8_t)(chipid >> 40), (uint8_t)(chipid >> 32), (uint8_t)(chipid >> 24),
            (uint8_t)(chipid >> 16), (uint8_t)(chipid >> 8), (uint8_t)chipid);
        return String(mac);
    }
    if (type == 1) return "ESP32";
  #elif defined(ARDUINO_ARCH_STM32)
    if (type == 0) { // UID
        uint32_t uid[3];
        uid[0] = HAL_GetUIDw0();
        uid[1] = HAL_GetUIDw1();
        uid[2] = HAL_GetUIDw2();
        char buf[25];
        sprintf(buf, "%08lX%08lX%08lX", uid[0], uid[1], uid[2]);
        return String(buf);
    }
    if (type == 1) return "STM32";
  #elif defined(ARDUINO_ARCH_AVR)
    if (type == 0) return "N/A (AVR)"; // AVR has no unique ID
    if (type == 1) return "AVR";
  #else
    if (type == 0) return "Unknown";
    if (type == 1) return "Unknown";
  #endif
  return "";
}

long getChipInfoNum(int type) {
  #if defined(ESP32)
    if (type == 0) return getCpuFreqMHz();
    if (type == 1) return ESP.getFlashChipSize();
    if (type == 2) return ESP.getFreeHeap();
  #elif defined(ARDUINO_ARCH_STM32)
    if (type == 0) return HAL_RCC_GetHCLKFreq() / 1000000;
    // Flash size register base depends on series, usually 0x1FFFF7E0 for F103
    // But Arduino Core has FLASH_SIZE macro often.
    #if defined(FLASHSIZE_BASE)
       if (type == 1) return (*((uint16_t *)FLASHSIZE_BASE)) * 1024;
    #else
       if (type == 1) return 0;
    #endif
    // Heap is harder on STM32 generic
    if (type == 2) return 0; 
  #elif defined(ARDUINO_ARCH_AVR)
     if (type == 0) return F_CPU / 1000000;
     if (type == 1) return 32768; // Hardcoded for Uno/Nano mostly
     if (type == 2) {
        // AVR Free Ram
        extern int __heap_start, *__brkval; 
        int v; 
        return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval); 
     }
  #endif
  return 0;
}
`);
  };

  // Block: Get Chip String Info (MAC, Model)
  registerBlock('board_info_string', {
    init: function () {
      this.appendDummyInput()
        .appendField(Blockly.Msg.ARD_CHIP_INFO_GET || "Get Chip Info")
        .appendField(new Blockly.FieldDropdown([
          ["Unique ID / MAC", "0"],
          ["Architecture Check", "1"]
        ]), "TYPE");
      this.setOutput(true, "String");
      this.setColour(230); // Info / Text color
      this.setTooltip("Get hardware unique ID or Architecture name");
    }
  }, (block: any) => {
    addBoardInfoHelper();
    const type = block.getFieldValue('TYPE');
    return [`getChipInfoString(${type})`, Order.ATOMIC];
  });

  // Block: Get Chip Numeric Info (Freq, Flash, Heap)
  registerBlock('board_info_number', {
    init: function () {
      this.appendDummyInput()
        .appendField(Blockly.Msg.ARD_CHIP_INFO_GET_NUM || "Get Chip Stat")
        .appendField(new Blockly.FieldDropdown([
          ["CPU Freq (MHz)", "0"],
          ["Flash Size (Bytes)", "1"],
          ["Free Heap (Bytes)", "2"]
        ]), "TYPE");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("Get CPU Frequency, Flash Size or Free Heap");
    }
  }, (block: any) => {
    addBoardInfoHelper();
    const type = block.getFieldValue('TYPE');
    return [`getChipInfoNum(${type})`, Order.ATOMIC];
  });

};

export const ChipInfoModule: BlockModule = {
  id: 'hardware.chip_info',
  name: 'Chip Info',
  category: 'Board Info',
  init
};
