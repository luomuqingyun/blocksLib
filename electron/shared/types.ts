/**
 * PlatformIO 板级配置模板接口
 * 定义了生成 platformio.ini 所需的各项参数
 * Shared between Backend (PioService) and Frontend (IPC)
 */
export interface PlatformIOTemplate {
    envName: string;       // 环境名称 (例如: uno, esp32dev)
    platform: string;      // 平台名称 (例如: atmelavr, espressif32)
    board: string;         // 板子 ID (例如: uno, esp32dev)
    framework: string;     // 开发框架 (通常为 arduino)
    monitor_speed?: string;// 串口波特率 (可选)
    upload_port?: string;  // 上传端口 (可选, 用于分离端口)
    upload_protocol?: string; // 上传协议 (可选, 如 stlink)
    upload_interface?: 'swd' | 'jtag'; // 调试接口 (可选)
    debug_tool?: string; // 调试工具 (可选)
    custom_ini_content?: string; // Raw content to append
    [key: string]: string | undefined; // 允许其他自定义字段
}

export interface ProjectBuildConfig {
    // PlatformIO Identity (Optional overrides or cache)
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
    upload_protocol?: 'default' | 'serial' | 'esptool' | 'stlink' | 'jlink' | 'cmsis-dap' | 'blackmagic' | 'esp-prog' | 'ti-icdi' | 'atmel-ice';
    debug_tool?: string;

    // Advanced
    customIni?: string;
}
