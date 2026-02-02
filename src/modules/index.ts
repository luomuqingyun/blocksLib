/**
 * ============================================================
 * 模块注册入口 (Module Registry Entry Point)
 * ============================================================
 * 
 * 积木块模块的统一注册和初始化入口。
 * 
 * 模块类型:
 * - Core: 变量、逻辑、循环、时间、系统等核心语言积木
 * - Hardware: ESP32、传感器、显示、电机等硬件模块
 * - Protocols: 串口、网络、蓝牙、MQTT 等通信协议
 * - Vendor: Seeed、DFRobot 等厂商特定模块
 * - Robots: mBot、Otto 等机器人套件
 * 
 * 支持自动发现 extensions/ 目录下的内部扩展。
 * 
 * @file src/modules/index.ts
 * @module EmbedBlocks/Frontend/Modules
 */

/**
 * =========================================================================
 * 模块自动注册与初始化核心逻辑 (Module Auto-Registration & Initialization)
 * =========================================================================
 */

// 1. 导出各子模块的所有自定义类型或常量（供外部渲染使用）
// -------------------------------------------------------------------------
export * from './core/variables';
export * from './core/logic_advanced';
export * from './core/loops_advanced';
export * from './core/time';
export * from './core/system';
export * from './core/text_enhanced';
export * from './core/standard';
export * from './hardware/esp32';
export * from './hardware/servo';
export * from './hardware/io';
export * from './protocols/serial';
export * from './protocols/serial_enhanced';
export * from './arduino/base';

import { ModuleRegistry } from '../registries/ModuleRegistry';

// 2. 导入具体的模块定义对象 (BlockModule)
// -------------------------------------------------------------------------
// 核心语言模块（变量、逻辑、字典等）
import { VariablesModule } from './core/variables';
import { LogicAdvancedModule } from './core/logic_advanced';
import { TinyMLModule } from './core/tinyml';
import { GameModule } from './core/game';
import { MenuModule } from './core/menu';
import { LoopsAdvancedModule } from './core/loops_advanced';
import { TimeModule } from './core/time';
import { TimerUtilsModule } from './core/timer';
import { SystemModule } from './core/system';
import { TextEnhancedModule } from './core/text_enhanced';
import { StandardModule } from './core/standard';
import { ListsAdvancedModule } from './core/lists_advanced';
import { DataFormatsModule } from './core/data_formats';
import { DictionaryModule } from './core/dictionary';
import { SystemControlModule } from './core/system_control';
import { RTOSModule } from './core/rtos';
import { ControlModule } from './core/control';
import { DataModule } from './core/data';
import { LoggingModule } from './core/logging';
import { MathStatsModule } from './core/math_stats';
import { DiagnosticsModule } from './core/diagnostics';
import { ESPUtilsModule } from './hardware/esp_utils';
import { SignalsModule } from './core/signals';
import { CryptoModule } from './core/crypto';

// 硬件外设模块（传感器、显示器、电机等）
import { ESP32Module } from './hardware/esp32';
import { ServoModule } from './hardware/servo';
import { IOModule } from './hardware/io';
import { SensorsModule } from './hardware/sensors';
import { AdvancedSensorsModule } from './hardware/advanced_sensors';
import { SensorsIIIModule } from './hardware/sensors_iii';
import { DisplaysModule } from './hardware/displays';
import { NextionModule } from './hardware/nextion';
import { IOExpanderModule } from './hardware/io_expander';
import { ShiftRegisterModule } from './hardware/shift_register';
import { NeoPixelModule } from './hardware/neopixel';
import { DisplayMatrixModule } from './hardware/display_matrix';
import { OLEDModule } from './hardware/display_oled';
import { MotorsModule } from './hardware/motors';
import { AdvancedMotorsModule } from './hardware/motors_adv';
import { AccelStepperModule } from './hardware/stepper_adv';
import { SharpIRModule } from './hardware/sharp_ir';
import { ChipInfoModule } from './hardware/chip_info';
import { DS18B20Module } from './hardware/ds18b20';
import { ActuatorsModule } from './hardware/actuators';
import { SpeechModule } from './hardware/speech';
import { AudioModule } from './hardware/audio';
import { MP3Module } from './hardware/mp3';
import { StorageModule } from './hardware/storage';
import { PreferencesModule } from './hardware/preferences';
import { OTAModule } from './hardware/ota';
import { DACModule } from './hardware/dac';
import { RTCModule } from './hardware/rtc';
import { CameraModule } from './hardware/camera';
import { QRModule } from './hardware/qrcode';
import { AudioInputModule } from './hardware/audio_input';
import { ServosAdvModule } from './hardware/servos_adv';
import { BarcodeModule } from './hardware/barcode';
import { InputsModule } from './hardware/inputs';
import { WiiModule } from './hardware/wii';
import { TouchModule } from './hardware/touch';
import { RFIDModule } from './hardware/rfid';
import { SpecialSensorsModule } from './hardware/special_sensors';
import { EthernetW5500Module } from './hardware/ethernet_w5500';

// 通信协议模块 (MQTT, HTTP, BLE 等)
import { NetworkModule } from './protocols/network';
import { RadioModule } from './protocols/radio';
import { BlynkModule } from './protocols/blynk';
import { NRF24Module } from './protocols/nrf24';
import { LoRaModule } from './protocols/lora';
import { I2CModule } from './protocols/i2c';
import { SPIModule } from './protocols/spi';
import { SerialModule } from './protocols/serial';
import { SerialEnhancedModule } from './protocols/serial_enhanced';
import { MQTTModule } from './protocols/mqtt';
import { BluetoothModule } from './protocols/bluetooth';
import { IRRemoteModule } from './protocols/ir_remote';
import { WebServerModule } from './protocols/web_server';
import { BleHidModule } from './protocols/ble_hid';
import { EspNowModule } from './protocols/esp_now';
import { WebSocketModule } from './protocols/websocket';
import { AutomationModule } from './protocols/automation';
import { TelegramModule } from './protocols/telegram';
import { OpenAIModule } from './protocols/openai';
import { FirebaseModule } from './protocols/firebase';
import { HTTPClientModule } from './protocols/http_client';
import { USBHidModule } from './protocols/usb_hid';

// 厂商/机器人套件
import { SeeedModule } from './vendor/seeed';
import { DFRobotModule } from './vendor/dfrobot';
import { mBotModule } from './robots/mbot';
import { OttoModule } from './robots/otto';
import { PS2ControllerModule } from './vendor/ps2';

// 芯片特定功能（STM32）
import { STM32CANModule } from './stm32/can';
import { STM32USBModule } from './stm32/usb';
import { STM32NetworkModule } from './stm32/network';

// 基础移植模块
import { ArduinoBaseModule } from './arduino/base';

// 示例模块
import { ExampleLedModule, ExampleSensorModule, ComplexModule } from './examples';

/**
 * 初始化并注册所有软件模块
 * 此函数在应用启动加载 Blockly 工作区前调用。
 */
export const initAllModules = () => {
    // 1. 注册核心基础模块 (具有最高优先级，通常出现在工具箱最上方)
    ModuleRegistry.register(VariablesModule);
    ModuleRegistry.register(LogicAdvancedModule);
    ModuleRegistry.register(TinyMLModule);
    ModuleRegistry.register(GameModule);
    ModuleRegistry.register(MenuModule);
    ModuleRegistry.register(LoopsAdvancedModule);
    ModuleRegistry.register(TimeModule);
    ModuleRegistry.register(TimerUtilsModule);
    ModuleRegistry.register(SystemModule);
    ModuleRegistry.register(TextEnhancedModule);
    ModuleRegistry.register(StandardModule);
    ModuleRegistry.register(ListsAdvancedModule);
    ModuleRegistry.register(DataFormatsModule);
    ModuleRegistry.register(DictionaryModule);
    ModuleRegistry.register(SystemControlModule);
    ModuleRegistry.register(RTOSModule);
    ModuleRegistry.register(ControlModule);
    ModuleRegistry.register(DataModule);
    ModuleRegistry.register(SignalsModule);
    ModuleRegistry.register(CryptoModule);
    ModuleRegistry.register(MathStatsModule);
    ModuleRegistry.register(LoggingModule);
    ModuleRegistry.register(DiagnosticsModule);
    ModuleRegistry.register(ESPUtilsModule);

    // 2. 注册硬件外设模块
    ModuleRegistry.register(ESP32Module);
    ModuleRegistry.register(ServoModule);
    ModuleRegistry.register(IOModule);
    ModuleRegistry.register(I2CModule);
    ModuleRegistry.register(SPIModule);
    ModuleRegistry.register(STM32CANModule);
    ModuleRegistry.register(STM32USBModule);
    ModuleRegistry.register(STM32NetworkModule);
    ModuleRegistry.register(SensorsModule);
    ModuleRegistry.register(AdvancedSensorsModule);
    ModuleRegistry.register(SensorsIIIModule);
    ModuleRegistry.register(DisplaysModule);
    ModuleRegistry.register(NextionModule);
    ModuleRegistry.register(IOExpanderModule);
    ModuleRegistry.register(ShiftRegisterModule);
    ModuleRegistry.register(NeoPixelModule);
    ModuleRegistry.register(DisplayMatrixModule);
    ModuleRegistry.register(OLEDModule);
    ModuleRegistry.register(ChipInfoModule);
    ModuleRegistry.register(MotorsModule);
    ModuleRegistry.register(AdvancedMotorsModule);
    ModuleRegistry.register(AccelStepperModule);
    ModuleRegistry.register(SharpIRModule);
    ModuleRegistry.register(DS18B20Module);
    ModuleRegistry.register(ActuatorsModule);
    ModuleRegistry.register(ServosAdvModule);
    ModuleRegistry.register(AudioInputModule);
    ModuleRegistry.register(SpeechModule);
    ModuleRegistry.register(AudioModule);
    ModuleRegistry.register(MP3Module);
    ModuleRegistry.register(StorageModule);
    ModuleRegistry.register(PreferencesModule);
    ModuleRegistry.register(OTAModule);
    ModuleRegistry.register(DACModule);
    ModuleRegistry.register(RTCModule);
    ModuleRegistry.register(CameraModule);
    ModuleRegistry.register(QRModule);
    ModuleRegistry.register(BarcodeModule);
    ModuleRegistry.register(InputsModule);
    ModuleRegistry.register(SeeedModule);
    ModuleRegistry.register(DFRobotModule);
    ModuleRegistry.register(mBotModule);
    ModuleRegistry.register(OttoModule);
    ModuleRegistry.register(WiiModule);
    ModuleRegistry.register(PS2ControllerModule);
    ModuleRegistry.register(TouchModule);
    ModuleRegistry.register(RFIDModule);

    // 3. 注册通信协议模块
    ModuleRegistry.register(NetworkModule);
    ModuleRegistry.register(RadioModule);
    ModuleRegistry.register(BlynkModule);
    ModuleRegistry.register(NRF24Module);
    ModuleRegistry.register(LoRaModule);
    ModuleRegistry.register(SpecialSensorsModule);
    ModuleRegistry.register(SerialModule);
    ModuleRegistry.register(SerialEnhancedModule);
    ModuleRegistry.register(MQTTModule);
    ModuleRegistry.register(BluetoothModule);
    ModuleRegistry.register(IRRemoteModule);
    ModuleRegistry.register(WebServerModule);
    ModuleRegistry.register(BleHidModule);
    ModuleRegistry.register(EspNowModule);
    ModuleRegistry.register(WebSocketModule);
    ModuleRegistry.register(AutomationModule);
    ModuleRegistry.register(TelegramModule);
    ModuleRegistry.register(USBHidModule);
    ModuleRegistry.register(HTTPClientModule);
    ModuleRegistry.register(EthernetW5500Module);
    ModuleRegistry.register(OpenAIModule);
    ModuleRegistry.register(FirebaseModule);

    // 4. 注册移植模块
    ModuleRegistry.register(ArduinoBaseModule);

    // 4.1 注册示例模块 (可选启用)
    ModuleRegistry.register(ExampleLedModule);
    ModuleRegistry.register(ExampleSensorModule);
    ModuleRegistry.register(ComplexModule);

    // 5. 自动发现内部扩展 (Autodiscovery)
    // 利用 Vite 的 import.meta.glob 扫描 extensions 目录下的所有模块索引文件。
    // 这允许开发者只需在 extensions 目录下创建文件夹即可完成积木模块的“热插拔”。
    const extensions = import.meta.glob(['./extensions/*/index.ts'], { eager: true });
    for (const path in extensions) {
        const mod = extensions[path] as any;
        for (const key in mod) {
            const item = mod[key];
            // 简单的鸭子类型检查，确认对象符合 BlockModule 接口要求
            if (item && item.id && item.init && typeof item.init === 'function') {
                ModuleRegistry.register(item);
            }
        }
    }

    // 执行所有已注册模块的积木定义初始化（Blockly.Blocks & Generator 注入）
    ModuleRegistry.initAll();
};

/**
 * 刷新所有积木定义
 * 当开发板切换或语言变更、导致积木配置需要重生成时调用。
 */
export const refreshBlockDefinitions = () => {
    ModuleRegistry.reinitializeAll();
};
