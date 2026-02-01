export interface I18nString {
    zh: string;
    en: string;
    [key: string]: string;
}

export interface PinDefinition {
    label: string | I18nString;
    value: string;
}

export interface PinMapping {
    name: string;
    position: string;
}

export interface BoardPins {
    digital: PinDefinition[];
    analog: PinDefinition[];
    pwm: PinDefinition[];
    i2c: PinDefinition[];
    spi: PinDefinition[];
    serial: PinDefinition[];
}

export interface RawPinOptions {
    digital: (string | string[])[];
    analog: (string | string[])[];
    pwm: (string | string[])[];
    i2c?: any[];
    spi?: any[];
}

export interface BoardBuildConfig {
    envName: string;       // [env:name]
    platform: string;      // platform = ...
    board: string;         // board = ...
    framework: string;     // framework = ...
    upload_protocol?: string;
    monitor_speed?: string;
    [key: string]: string | undefined;
}

export interface ProjectBuildConfig {
    // PlatformIO Identity
    envName?: string;
    platform?: string;
    board?: string;
    framework?: string;

    description?: string;

    // Compiler
    optimizationLevel?: '-Os' | '-O0' | '-O1' | '-O2' | '-O3';
    cppStandard?: '-std=gnu++11' | '-std=gnu++14' | '-std=gnu++17';
    extraBuildFlags?: string[];

    // Libraries
    lib_deps?: string[];

    // Upload & Monitor
    monitor_speed?: string;
    upload_speed?: string;
    upload_port?: string;
    upload_protocol?: 'default' | 'serial' | 'esptool' | 'stlink' | 'jlink' | 'cmsis-dap' | 'blackmagic' | 'esp-prog' | 'ti-icdi' | 'atmel-ice';
    upload_interface?: 'swd' | 'jtag';
    debug_tool?: string;

    // Advanced
    customIni?: string;
}

export interface Board {
    id: string;
    name: string | I18nString;
    mcu: string;
    pinCount?: number; // 新增：用于芯片预览渲染
    package?: string;  // 新增：用于芯片预览渲染
    pinMap?: PinMapping[]; // 新增：物理引脚映射
    freq: string;
    flash: string;
    ram: string;
    fqbn: string;
    pins: BoardPins;
    pin_options?: RawPinOptions;
    pinout?: any; // Hardware resource mapping (TIM, UART, etc.)
    capabilities?: {
        wifi?: boolean;
        bluetooth?: boolean;
        ethernet?: boolean;
        can?: boolean;
        usb?: boolean;
        analogOut?: boolean; // DAC
        rtos?: boolean;
    };
    build?: BoardBuildConfig; // Optional for now during migration
}

export interface BoardSeries {
    id: string;
    name: string | I18nString;
    boards: Board[];
}

export interface BoardFamily {
    id: 'arduino' | 'stm32' | 'esp32' | 'custom';
    name: string | I18nString;
    series: BoardSeries[];
}

export interface BoardConfig extends Board {
    family: 'arduino' | 'stm32' | 'esp32' | 'custom';
}
