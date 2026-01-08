/**
 * Blockly 工具箱主题配色
 * 统一管理所有分类的颜色值，便于主题切换
 */

export const CATEGORY_COLORS = {
    // 核心语言结构
    LOGIC: '210',
    LOOPS: '120',
    LISTS: '260',
    MATH: '230',
    TEXT: '160',
    VARIABLES: '330',
    TYPES: '260',
    TOOLS: '290',
    FUNCTIONS: '290',

    // 硬件基础
    IO: '230',
    TIME: '120',
    SERIAL: '160',
    SERVO: '160',

    // 外设与传感器
    ACTUATORS: '0',
    SENSORS: '280',
    MOTORS: '200',
    DISPLAYS: '60',
    AUDIO: '250',
    STORAGE: '30',

    // 网络与协议
    IOT: '210',
    PROTOCOLS: '290',

    // 特定模块
    RFID: '180',
    QR_CODE: '160',
    PS2: '30',
    INPUTS: '20',
    EXPANSION: '230',
    HID: '200',

    // 高级功能
    AI: '280',
    DATA_SECURITY: '260',
    SIGNALS: '230',
    CONTROL: '230',
    MENU: '200',
    DIAGNOSTICS: '200',
    RTOS: '290',
    GAME: '200',
    VENDOR: '120',
    STRUCTS_ENUMS: '260',
    C_ADVANCED: '290',

    // 平台特定
    ESP_NETWORK: '60',
    ESP_UTILS: '230',
    STM32: '230',
    SYSTEM_UTILS: '290',
    ROBOTS: '250'
} as const;

/**
 * 获取分类颜色
 * @param category - 分类名称
 * @returns 颜色字符串，如果未定义则返回默认灰色
 */
export function getCategoryColor(category: keyof typeof CATEGORY_COLORS): string {
    return CATEGORY_COLORS[category] || '200';
}
