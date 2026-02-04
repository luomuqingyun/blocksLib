/**
 * ============================================================
 * 开发板类型定义 (Board Type Definitions)
 * ============================================================
 * 
 * 本文件定义了 EmbedBlocks 中所有与开发板相关的 TypeScript 类型。
 * 这些类型用于描述开发板的硬件特性、引脚配置、构建参数等信息。
 * 
 * 类型层级结构:
 * - BoardFamily (板卡家族，如 Arduino/STM32/ESP32)
 *   └─ BoardSeries (板卡系列，如 Uno/Mega/Nano)
 *       └─ Board (具体板卡型号)
 * 
 * 主要类型说明:
 * - BoardConfig: 完整的板卡配置，包含 family 信息
 * - BoardPins: 板卡引脚分类定义
 * - BoardBuildConfig: PlatformIO 构建配置
 * - ProjectBuildConfig: 项目级构建配置
 * 
 * @file src/types/board.ts
 * @module EmbedBlocks/Types/Board
 */

/**
 * 国际化字符串接口
 * 用于支持多语言显示，至少需要提供中文和英文
 */
export interface I18nString {
    /** 中文文本 */
    zh: string;
    /** 英文文本 */
    en: string;
    /** 支持其他语言扩展 */
    [key: string]: string;
}

/**
 * 引脚定义接口
 * 描述单个引脚的标签和对应的代码值
 */
export interface PinDefinition {
    /** 引脚显示名称，支持多语言 */
    label: string | I18nString;
    /** 引脚在代码中使用的值 (如 "2", "A0", "PA1") */
    value: string;
}

/**
 * 物理引脚映射接口
 * 用于芯片预览组件中映射引脚名称到物理位置
 */
export interface PinMapping {
    /** 引脚逻辑名称 (如 "D13", "PA5") */
    name: string;
    /** 物理位置标识 (如 "left-1", "right-8") */
    position: string;
}

/**
 * 板卡引脚分类接口
 * 按功能分类的引脚定义集合
 */
export interface BoardPins {
    /** 数字 I/O 引脚列表 */
    digital: PinDefinition[];
    /** 模拟输入引脚列表 */
    analog: PinDefinition[];
    /** PWM 输出引脚列表 */
    pwm: PinDefinition[];
    /** I2C 总线引脚列表 (SDA/SCL) */
    i2c: PinDefinition[];
    /** SPI 总线引脚列表 (MOSI/MISO/SCK/CS) */
    spi: PinDefinition[];
    /** 串口引脚列表 (TX/RX) */
    serial: PinDefinition[];
}

/**
 * 原始引脚选项接口
 * 用于简化的引脚配置格式，支持引脚组
 */
export interface RawPinOptions {
    /** 数字引脚，支持单引脚或引脚组 */
    digital: (string | string[])[];
    /** 模拟引脚，支持单引脚或引脚组 */
    analog: (string | string[])[];
    /** PWM 引脚，支持单引脚或引脚组 */
    pwm: (string | string[])[];
    /** I2C 引脚配置 (可选) */
    i2c?: any[];
    /** SPI 引脚配置 (可选) */
    spi?: any[];
}

/**
 * 板卡构建配置接口
 * 对应 platformio.ini 中的环境配置段
 */
export interface BoardBuildConfig {
    /** 环境名称，对应 [env:name] */
    envName: string;
    /** 平台标识符 (如 "atmelavr", "ststm32", "espressif32") */
    platform: string;
    /** 板卡标识符 (如 "uno", "bluepill_f103c8", "esp32dev") */
    board: string;
    /** 框架类型 (如 "arduino", "stm32cube") */
    framework: string;
    /** 上传协议 (可选，如 "stlink", "esptool") */
    upload_protocol?: string;
    /** 串口监视器波特率 (可选) */
    monitor_speed?: string;
    /** 是否启用本地板卡补丁模式 */
    local_patch?: boolean;
    /** 支持其他自定义配置项 */
    [key: string]: string | boolean | undefined;
}

/**
 * 项目构建配置接口
 * 用户可在项目设置中自定义的构建参数
 */
export interface ProjectBuildConfig {
    // ======== PlatformIO 身份标识 ========
    /** 环境名称 */
    envName?: string;
    /** 平台标识符 */
    platform?: string;
    /** 板卡标识符 */
    board?: string;
    /** 框架类型 */
    framework?: string;
    /** 项目描述 */
    description?: string;

    // ======== 编译器选项 ========
    /** 优化级别: -Os(体积), -O0(无优化), -O1/O2/O3(速度) */
    optimizationLevel?: '-Os' | '-O0' | '-O1' | '-O2' | '-O3';
    /** C++ 标准版本 */
    cppStandard?: '-std=gnu++11' | '-std=gnu++14' | '-std=gnu++17';
    /** 额外的编译标志列表 */
    extraBuildFlags?: string[];

    // ======== 库依赖 ========
    /** PlatformIO 库依赖列表 */
    lib_deps?: string[];

    // ======== 上传与监视器 ========
    /** 串口监视器波特率 */
    monitor_speed?: string;
    /** 上传波特率 */
    upload_speed?: string;
    /** 上传端口 (如 "COM3", "/dev/ttyUSB0") */
    upload_port?: string;
    /** 上传协议类型 */
    upload_protocol?: 'default' | 'serial' | 'esptool' | 'stlink' | 'jlink' | 'cmsis-dap' | 'blackmagic' | 'esp-prog' | 'ti-icdi' | 'atmel-ice';
    /** 调试接口类型 */
    upload_interface?: 'swd' | 'jtag';
    /** 调试工具 */
    debug_tool?: string;

    // ======== 高级选项 ========
    /** 自定义 platformio.ini 内容片段 */
    customIni?: string;
    /** 是否启用本地板卡补丁模式 */
    local_patch?: boolean;
}

/**
 * 板卡接口
 * 描述一个具体开发板型号的完整信息
 */
export interface Board {
    /** 板卡唯一标识符 */
    id: string;
    /** 板卡显示名称，支持多语言 */
    name: string | I18nString;
    /** 微控制器型号 (如 "ATmega328P", "STM32F103C8T6") */
    mcu: string;
    /** 芯片引脚数量，用于芯片预览渲染 */
    pinCount?: number;
    /** 芯片封装类型，用于芯片预览渲染 (如 "DIP-28", "LQFP-48") */
    package?: string;
    /** 物理引脚映射列表 */
    pinMap?: PinMapping[];
    /** 主频 (如 "16MHz", "72MHz") */
    freq: string;
    /** Flash 大小 (如 "32KB", "64KB") */
    flash: string;
    /** RAM 大小 (如 "2KB", "20KB") */
    ram: string;
    /** 完全限定板卡名称 (兼容 Arduino CLI) */
    fqbn: string;
    /** 引脚分类配置 */
    pins: BoardPins;
    /** 原始引脚选项 (简化格式) */
    pin_options?: RawPinOptions;
    /** 硬件资源映射 (定时器、UART 等外设分配) */
    pinout?: any;
    /** 板卡硬件能力标志 */
    capabilities?: {
        /** 是否支持 WiFi */
        wifi?: boolean;
        /** 是否支持蓝牙 */
        bluetooth?: boolean;
        /** 是否支持以太网 */
        ethernet?: boolean;
        /** 是否支持 CAN 总线 */
        can?: boolean;
        /** 是否支持 USB */
        usb?: boolean;
        /** 是否支持模拟输出 (DAC) */
        analogOut?: boolean;
        /** 是否支持 RTOS */
        rtos?: boolean;
    };
    /** 构建配置 (迁移期间可选) */
    build?: BoardBuildConfig;
}

/**
 * 板卡系列接口
 * 同一系列下的多个板卡变体 (如 Arduino Uno/Mini/Pro Mini)
 */
export interface BoardSeries {
    /** 系列唯一标识符 */
    id: string;
    /** 系列显示名称，支持多语言 */
    name: string | I18nString;
    /** 该系列下的板卡列表 */
    boards: Board[];
}

/**
 * 板卡家族接口
 * 顶层分类，按芯片厂商/生态系统划分
 */
export interface BoardFamily {
    /** 家族标识符: arduino(AVR), stm32(STMicro), esp32(Espressif), custom(自定义) */
    id: 'arduino' | 'stm32' | 'esp32' | 'custom';
    /** 家族显示名称，支持多语言 */
    name: string | I18nString;
    /** 该家族下的系列列表 */
    series: BoardSeries[];
}

/**
 * 板卡配置接口 (扩展 Board)
 * 在 Board 基础上增加 family 属性，用于扁平化的板卡列表
 */
export interface BoardConfig extends Board {
    /** 所属板卡家族 */
    family: 'arduino' | 'stm32' | 'esp32' | 'custom';
}
