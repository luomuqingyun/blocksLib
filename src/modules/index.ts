// Core Modules
export * from './core/variables';
export * from './core/logic_advanced';
export * from './core/loops_advanced';
export * from './core/time';
export * from './core/system';
export * from './core/text_enhanced';
export * from './core/standard';

// Hardware Modules
export * from './hardware/esp32';
export * from './hardware/servo';
export * from './hardware/io';

// Protocol Modules
export * from './protocols/serial';
export * from './protocols/serial_enhanced';

// Ported Modules
export * from './arduino/base';

import { ModuleRegistry } from '../registries/ModuleRegistry';

// Refactored Core Modules
import { VariablesModule } from './core/variables';
import { LogicAdvancedModule } from './core/logic_advanced';
import { TinyMLModule } from './core/tinyml'; // New
import { GameModule } from './core/game'; // New
import { MenuModule } from './core/menu';
import { LoopsAdvancedModule } from './core/loops_advanced';
import { TimeModule } from './core/time';
import { TimerUtilsModule } from './core/timer'; // New
import { SystemModule } from './core/system';
import { TextEnhancedModule } from './core/text_enhanced';
import { StandardModule } from './core/standard';
import { ListsAdvancedModule } from './core/lists_advanced'; // New
import { DataFormatsModule } from './core/data_formats'; // New
import { DictionaryModule } from './core/dictionary'; // New
import { SystemControlModule } from './core/system_control';
import { RTOSModule } from './core/rtos';
import { ControlModule } from './core/control';
import { DataModule } from './core/data';
import { LoggingModule } from './core/logging';
import { MathStatsModule } from './core/math_stats'; // New
import { DiagnosticsModule } from './core/diagnostics';
import { ESPUtilsModule } from './hardware/esp_utils';

// Refactored Hardware/Protocol Modules
import { SignalsModule } from './core/signals';
import { CryptoModule } from './core/crypto'; // New
import { ESP32Module } from './hardware/esp32';
import { ServoModule } from './hardware/servo';
import { IOModule } from './hardware/io';
import { SensorsModule } from './hardware/sensors';
import { AdvancedSensorsModule } from './hardware/advanced_sensors';
import { SensorsIIIModule } from './hardware/sensors_iii'; // New
import { DisplaysModule } from './hardware/displays';
import { NextionModule } from './hardware/nextion';
import { IOExpanderModule } from './hardware/io_expander'; // New
import { ShiftRegisterModule } from './hardware/shift_register'; // New
import { NeoPixelModule } from './hardware/neopixel';
import { DisplayMatrixModule } from './hardware/display_matrix';
import { OLEDModule } from './hardware/display_oled';
import { MotorsModule } from './hardware/motors';
import { AdvancedMotorsModule } from './hardware/motors_adv';
import { AccelStepperModule } from './hardware/stepper_adv';
import { SharpIRModule } from './hardware/sharp_ir';
import { ChipInfoModule } from './hardware/chip_info'; // New

import { DS18B20Module } from './hardware/ds18b20';
import { ActuatorsModule } from './hardware/actuators';
import { SpeechModule } from './hardware/speech'; // New
import { AudioModule } from './hardware/audio';
import { MP3Module } from './hardware/mp3';
import { StorageModule } from './hardware/storage';
import { PreferencesModule } from './hardware/preferences';
import { OTAModule } from './hardware/ota';
import { DACModule } from './hardware/dac';
import { RTCModule } from './hardware/rtc';
import { CameraModule } from './hardware/camera';
import { QRModule } from './hardware/qrcode'; // New
import { AudioInputModule } from './hardware/audio_input'; // New
import { ServosAdvModule } from './hardware/servos_adv'; // New
import { BarcodeModule } from './hardware/barcode'; // New

import { InputsModule } from './hardware/inputs';
import { SeeedModule } from './vendor/seeed';
import { DFRobotModule } from './vendor/dfrobot';
import { mBotModule } from './robots/mbot';
import { OttoModule } from './robots/otto';
import { WiiModule } from './hardware/wii';
import { PS2Module } from './vendor/ps2';
import { TouchModule } from './hardware/touch';
import { NetworkModule } from './protocols/network';
import { RadioModule } from './protocols/radio';
import { BlynkModule } from './protocols/blynk';
import { NRF24Module } from './protocols/nrf24';
import { LoRaModule } from './protocols/lora';
import { RFIDModule } from './hardware/rfid';
import { SpecialSensorsModule } from './hardware/special_sensors';

import { I2CModule } from './protocols/i2c';
import { SPIModule } from './protocols/spi';
import { STM32CANModule } from './stm32/can';
import { STM32USBModule } from './stm32/usb';
import { STM32NetworkModule } from './stm32/network';

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


import { HTTPClientModule } from './protocols/http_client'; // New
import { USBHidModule } from './protocols/usb_hid';
import { EthernetW5500Module } from './hardware/ethernet_w5500'; // New

import { ArduinoBaseModule } from './arduino/base';
import { TestDevBlockModule } from './extensions/test_dev_block';

export const initAllModules = () => {
    // 1. Register Core Modules
    ModuleRegistry.register(VariablesModule);
    ModuleRegistry.register(LogicAdvancedModule);
    ModuleRegistry.register(TinyMLModule); // New
    ModuleRegistry.register(GameModule); // New
    ModuleRegistry.register(MenuModule);
    ModuleRegistry.register(LoopsAdvancedModule);
    ModuleRegistry.register(TimeModule);
    ModuleRegistry.register(TimerUtilsModule); // New
    ModuleRegistry.register(SystemModule);
    ModuleRegistry.register(TextEnhancedModule);
    ModuleRegistry.register(StandardModule);
    ModuleRegistry.register(ListsAdvancedModule); // New
    ModuleRegistry.register(DataFormatsModule); // New
    ModuleRegistry.register(DictionaryModule); // New
    ModuleRegistry.register(SystemControlModule);
    ModuleRegistry.register(RTOSModule);
    ModuleRegistry.register(ControlModule);
    ModuleRegistry.register(DataModule);
    ModuleRegistry.register(SignalsModule);
    ModuleRegistry.register(CryptoModule); // New
    ModuleRegistry.register(MathStatsModule); // New
    ModuleRegistry.register(LoggingModule);
    ModuleRegistry.register(DiagnosticsModule);
    ModuleRegistry.register(ESPUtilsModule);

    // 2. Register Hardware Modules
    ModuleRegistry.register(ESP32Module);
    ModuleRegistry.register(ServoModule);
    ModuleRegistry.register(IOModule);       // 基础 I/O (带引脚提示)
    ModuleRegistry.register(I2CModule);      // I2C
    ModuleRegistry.register(SPIModule);      // SPI
    ModuleRegistry.register(STM32CANModule); // STM32 CAN
    ModuleRegistry.register(STM32USBModule); // STM32 USB
    ModuleRegistry.register(STM32NetworkModule); // STM32 Network
    ModuleRegistry.register(SensorsModule);
    ModuleRegistry.register(AdvancedSensorsModule);
    ModuleRegistry.register(SensorsIIIModule); // New
    ModuleRegistry.register(DisplaysModule);
    ModuleRegistry.register(NextionModule);
    ModuleRegistry.register(IOExpanderModule); // New
    ModuleRegistry.register(ShiftRegisterModule); // New
    ModuleRegistry.register(NeoPixelModule);
    ModuleRegistry.register(DisplayMatrixModule);
    ModuleRegistry.register(OLEDModule);
    ModuleRegistry.register(ChipInfoModule); // 芯片信息 (MAC/Freq/Flash)
    ModuleRegistry.register(MotorsModule);
    ModuleRegistry.register(AdvancedMotorsModule);
    ModuleRegistry.register(AccelStepperModule);
    ModuleRegistry.register(SharpIRModule);
    ModuleRegistry.register(DS18B20Module);
    ModuleRegistry.register(ActuatorsModule);
    ModuleRegistry.register(ServosAdvModule); // New
    ModuleRegistry.register(AudioInputModule); // New
    ModuleRegistry.register(SpeechModule); // New
    ModuleRegistry.register(AudioModule);
    ModuleRegistry.register(MP3Module);
    ModuleRegistry.register(StorageModule);
    ModuleRegistry.register(PreferencesModule);
    ModuleRegistry.register(OTAModule);
    ModuleRegistry.register(DACModule);
    ModuleRegistry.register(RTCModule);
    ModuleRegistry.register(CameraModule);
    ModuleRegistry.register(QRModule); // New
    ModuleRegistry.register(BarcodeModule); // New
    ModuleRegistry.register(InputsModule);
    ModuleRegistry.register(SeeedModule);
    ModuleRegistry.register(DFRobotModule);
    ModuleRegistry.register(mBotModule);
    ModuleRegistry.register(OttoModule);
    ModuleRegistry.register(WiiModule);
    ModuleRegistry.register(PS2Module);
    ModuleRegistry.register(TouchModule);
    ModuleRegistry.register(RFIDModule);

    // 3. Register Protocol Modules
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
    ModuleRegistry.register(HTTPClientModule); // New
    ModuleRegistry.register(EthernetW5500Module); // New
    ModuleRegistry.register(OpenAIModule);
    ModuleRegistry.register(FirebaseModule);

    // 4. Register Ported Modules
    ModuleRegistry.register(ArduinoBaseModule);

    // 5. Auto-discovered Internal Extensions (孵化器)
    const extensions = import.meta.glob(['./extensions/*/index.ts'], { eager: true });
    for (const path in extensions) {
        const mod = extensions[path] as any;
        for (const key in mod) {
            const item = mod[key];
            // Duck typing check for BlockModule
            if (item && item.id && item.init && typeof item.init === 'function') {
                ModuleRegistry.register(item);
            }
        }
    }

    // Initialize all registered modules
    ModuleRegistry.initAll();
};

export const refreshBlockDefinitions = () => {
    ModuleRegistry.reinitializeAll();
};