/**
 * ============================================================
 * 芯片信息模块 (Chip Information - Cross-Platform)
 * ============================================================
 * 
 * 提供跨平台芯片信息获取积木:
 * - board_info_string: 获取 MAC/UID/架构名称
 * - board_info_number: 获取 CPU 频率/Flash 大小/堆空间
 * 
 * 自动适配 ESP32 / STM32 / AVR 架构。
 * 使用条件编译 (#if defined) 生成平台特定代码。
 * 
 * @file src/modules/hardware/chip_info.ts
 * @module EmbedBlocks/Frontend/Modules/Hardware
 */

import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


const init = () => {

  // 注入 C++ 辅助函数 (Helper Function Injection)
  // 根据宏定义 (#if defined) 自动适配不同硬件平台 (ESP32 / STM32 / AVR)
  // 使得同一个 Blockly 积木可以跨平台生成正确的底层代码
  const addBoardInfoHelper = () => {
    // 根据宏定义 (#if defined) 自动适配不同硬件平台 (ESP32 / STM32 / AVR)
    // 使得同一个 Blockly 积木可以跨平台生成正确的底层代码
    arduinoGenerator.addFunction('get_chip_info', `
String getChipInfoString(int type) {
  #if defined(ESP32)
    if (type == 0) { // 获取 ESP32 MAC 地址作为唯一识别 ID
        uint64_t chipid = ESP.getEfuseMac(); 
        char mac[18];
        sprintf(mac, "%02X:%02X:%02X:%02X:%02X:%02X", 
            (uint8_t)(chipid >> 40), (uint8_t)(chipid >> 32), (uint8_t)(chipid >> 24),
            (uint8_t)(chipid >> 16), (uint8_t)(chipid >> 8), (uint8_t)chipid);
        return String(mac);
    }
    if (type == 1) return "ESP32";
  #elif defined(ARDUINO_ARCH_STM32)
    if (type == 0) { // 获取 STM32 硬件唯一 ID (96-bit UID)
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
    if (type == 0) return "N/A (AVR)"; // 标准 AVR (如 Uno) 没有硬件唯一 ID
    if (type == 1) return "AVR";
  #endif
  return "Unknown";
}

// 获取芯片数值信息 (频率、容量等)
long getChipInfoNum(int type) {
  #if defined(ESP32)
    if (type == 0) return getCpuFreqMHz(); // 获取 CPU 主频 (MHz)
    if (type == 1) return ESP.getFlashChipSize(); // 获取 Flash 闪存容量 (Bytes)
    if (type == 2) return ESP.getFreeHeap(); // 获取当前空闲堆内存 (RAM)
  #elif defined(ARDUINO_ARCH_STM32)
    if (type == 0) return HAL_RCC_GetHCLKFreq() / 1000000; // 获取 HCLK 频率
    #if defined(FLASHSIZE_BASE)
       if (type == 1) return (*((uint16_t *)FLASHSIZE_BASE)) * 1024; // 从系统寄存器读取 Flash 大小
    #else
       if (type == 1) return 0;
    #endif
    if (type == 2) return 0; 
  #elif defined(ARDUINO_ARCH_AVR)
     if (type == 0) return F_CPU / 1000000; // 获取主频频率 (典型为 16MHz)
     if (type == 1) return 32768; // ATmega328P 固定的 Flash 大小 (32KB)
     if (type == 2) {
        // 计算 AVR 下的空闲 RAM (通过栈指针和堆边界估算)
        extern int __heap_start, *__brkval; 
        int v; 
        return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval); 
     }
  #endif
  return 0;
}
`);
  };

  // 积木: 获取芯片字符串信息 (唯一 ID、架构名称)
  registerBlock('board_info_string', {
    init: function () {
      this.appendDummyInput()
        .appendField(Blockly.Msg.ARD_CHIP_INFO_GET || "获取芯片信息")
        .appendField(new Blockly.FieldDropdown([
          ["硬件唯一 ID / MAC", "0"],
          ["系统架构检查", "1"]
        ]), "TYPE");
      this.setOutput(true, "String");
      this.setColour(230); // 信息/文本类颜色
      this.setTooltip("获取硬件唯一序列号或架构名称");
    }
  }, (block: any) => {
    addBoardInfoHelper();
    const type = block.getFieldValue('TYPE');
    return [`getChipInfoString(${type})`, Order.ATOMIC];
  });

  // 积木: 获取芯片数值统计 (频率、存储余量)
  registerBlock('board_info_number', {
    init: function () {
      this.appendDummyInput()
        .appendField(Blockly.Msg.ARD_CHIP_INFO_GET_NUM || "获取芯片运行状态")
        .appendField(new Blockly.FieldDropdown([
          ["CPU 主频 (MHz)", "0"],
          ["Flash 闪存容量 (Bytes)", "1"],
          ["当前空闲内存 (Bytes)", "2"]
        ]), "TYPE");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("获取 CPU 运行频率、闪存大小或剩余内存");
    }
  }, (block: any) => {
    addBoardInfoHelper();
    const type = block.getFieldValue('TYPE');
    return [`getChipInfoNum(${type})`, Order.ATOMIC];
  });

};

/**
 * 芯片信息模块
 * 提供跨平台的硬件识别和运行状态检测功能。
 */
export const ChipInfoModule: BlockModule = {
  id: 'hardware.chip_info',
  name: 'Chip Info',
  init
};

