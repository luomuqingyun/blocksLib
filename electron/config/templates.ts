/**
 * ============================================================
 * PlatformIO 配置生成器 (PIO Config Generator)
 * ============================================================
 * 
 * 负责生成 platformio.ini 配置文件内容。
 * 
 * 主要功能:
 * - generateIniConfig: 根据 PlatformIOTemplate 生成 INI 配置
 * - 智能板卡映射: 将不直接支持 Arduino 的板卡映射到兼容板
 * - 本地补丁模式: 支持使用项目内的自定义 board/variant
 * - 环境名清理: 确保环境名符合 PIO 规范
 * 
 * 增强兼容性映射:
 * - 从 stm32_compatibility_enhanced.json 加载
 * - 提供精确的 STM32duino variant 信息
 * 
 * @file electron/config/templates.ts
 * @module EmbedBlocks/Electron/Config/Templates
 */

import * as fs from 'fs';
import * as path from 'path';
import { PlatformIOTemplate } from '../shared/types';

/**
 * 预定义的板级配置模板注册表
 * 包含所有支持的开发板及其 PlatformIO 配置
 */
// BOARD_TEMPLATES has been removed in favor of frontend-driven configuration (Single Source of Truth)

/**
 * 兼容性板卡映射表
 * 
 * 原因: 某些板卡（如 u-blox Odin-W2）在 PlatformIO 官方定义中仅标注支持 mbed 或 stm32cube 框架。
 * 实际上，这些板卡的 MCU (如 STM32F439ZI) 完全兼容 Arduino 框架，但直接使用原板卡 ID 会导致 PIO 报错：
 * "Error: This board doesn't support arduino framework!"
 * 
 * 解决方法: 当用户选择 Arduino 框架时，我们将这些板卡 ID 自动映射到同系列、引脚和资源高度兼容且官方支持 Arduino 的板卡 ID 上。
 * 例如: mtb_ublox_odin_w2 (F439ZI) -> nucleo_f429zi (F429ZI)。
 */
const BOARD_COMPATIBILITY_MAP: Record<string, string> = {
    'mtb_ublox_odin_w2': 'nucleo_f429zi',
    'ublox_evk_odin_w2': 'nucleo_f429zi',
    'mbed_connect_odin': 'nucleo_f429zi',
};

// 增强版兼容性映射 (包含 variant 路径和内存信息)
// 这是唯一使用的兼容性映射，提供精确的 STM32duino variant 信息
interface EnhancedCompatInfo {
    pioBoardId: string | null;
    variantPath: string;
    productLine: string;
    maxSize: number;
    maxDataSize: number;
    requiresLocalPatch: boolean;
}
let ENHANCED_COMPATIBILITY_MAP: Record<string, EnhancedCompatInfo> = {};
try {
    const enhancedPath = path.join(__dirname, 'stm32_compatibility_enhanced.json');
    if (fs.existsSync(enhancedPath)) {
        const content = fs.readFileSync(enhancedPath, 'utf8');
        ENHANCED_COMPATIBILITY_MAP = JSON.parse(content);
    }
} catch (error) {
    console.error('Failed to load enhanced compatibility map:', error);
}

/**
 * 获取芯片的增强兼容性信息
 */
export const getEnhancedCompatInfo = (boardId: string): EnhancedCompatInfo | null => {
    return ENHANCED_COMPATIBILITY_MAP[boardId] || null;
};

/**
 * 清理并规范化环境名称，确保符合 PlatformIO 规范 (a-z, 0-9, _)
 * 
 * 修复点: 
 * 1. 剥离重复的 "env:" 前缀。由于服务层和生成层都可能尝试添加前缀，曾导致生成 [env:env:board_id] 
 *    这种含有冒号 ':' 的非法环境名，触发 Invalid environment name 错误。
 * 2. 严格限制字符集。PlatformIO 对环境名字符要求严格，建议仅使用字母、数字和下划线。
 */
const sanitizeEnvName = (name: string): string => {
    if (!name) return 'default';

    // 移除可能存在的 "env:" 前缀，避免生成含 ':' 的非法环境名 (如 [env:env:stm32...])
    let cleanName = name;
    if (cleanName.startsWith('env:')) {
        cleanName = cleanName.substring(4);
    }

    // 仅允许字母、数字、下划线，将其余非法字符替换为下划线
    // 注意：PlatformIO 环境名通常不建议包含连字符 '-'，某些版本会报错
    let sanitized = cleanName.replace(/[^a-zA-Z0-9_]/g, '_');

    return sanitized;
};

/**
 * 根据模板生成 platformio.ini 配置文件内容的工具函数
 * @param template 板级配置模板 (来自 BoardRegistry)
 * @returns INI 格式的配置字符串
 */
export const generateIniConfig = (template: PlatformIOTemplate): string => {
    // 1. 处理板卡兼容性映射
    let boardId = template.board;
    let useLocalPatch = template.local_patch;

    // [核心增强] 智能兼容性检测
    // 优先使用增强的兼容性映射来确定最佳配置策略
    if (template.framework === 'arduino' && !useLocalPatch) {
        const enhancedInfo = ENHANCED_COMPATIBILITY_MAP[boardId];
        if (enhancedInfo) {
            if (enhancedInfo.pioBoardId) {
                // 有精确匹配的 PIO board
                boardId = enhancedInfo.pioBoardId;
            } else if (enhancedInfo.requiresLocalPatch) {
                // 需要 local_patch 模式
                useLocalPatch = true;
            }
        } else {
            // 芯片不在增强映射中
            // 仅回退到手动定义的特殊板卡映射
            if (BOARD_COMPATIBILITY_MAP[boardId]) {
                boardId = BOARD_COMPATIBILITY_MAP[boardId];
            } else if (template.platform === 'ststm32' || boardId.startsWith('generic_stm32')) {
                // 仅对 STM32 板卡使用 local_patch 模式，防止影响 Arduino / ESP32 等普通板卡
                useLocalPatch = true;
            }
        }
    }

    // [核心增强] 本地板卡补丁 (Local Patch)
    // 如果启用了本地补丁，则直接使用项目目录下的 eb_custom_board.json
    if (useLocalPatch) {
        boardId = 'eb_custom_board';
    }

    // 2. 生成合法的环境名称 (剥离冗余前缀并清理非法字符)
    const safeEnvName = sanitizeEnvName(template.envName || template.board);

    // 开始构建 INI 内容
    let config = `[env:${safeEnvName}]\n`;
    config += `platform = ${template.platform}\n`;
    config += `board = ${boardId}\n`;
    config += `framework = ${template.framework}\n`;

    // [核心增强] 本地板卡补丁路径注入
    if (useLocalPatch) {
        config += `board_build.variants_dir = variants\n`;
        config += `board_build.variant = eb_custom_variant\n`;

        // [WBA Fix] 针对 STM32WBA 系列，自动注入构建拦截脚本以解决驱动识别错误问题
        // 只有当 template 中没有手动定义 extra_scripts 时才自动添加
        if (template.board.toLowerCase().includes('wba') && !template['extra_scripts']) {
            config += `extra_scripts = post:fix_wba_build.py\n`;
        }
    }

    // 3. 添加其他可选配置项 (如 build_flags, lib_deps 等)
    Object.keys(template).forEach(key => {
        // 排除已处理的固定字段和内部私有字段
        if (key !== 'envName' && key !== 'platform' && key !== 'board' && key !== 'framework' && key !== 'custom_ini_content' && template[key]) {
            config += `${key} = ${template[key]}\n`;
        }
    });

    // 4. 追加用户自定义的 INI 内容
    if (template.custom_ini_content) {
        config += `\n${template.custom_ini_content}\n`;
    }

    return config;
};
