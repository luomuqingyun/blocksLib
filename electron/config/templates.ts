import { PlatformIOTemplate } from '../shared/types';

/**
 * 预定义的板级配置模板注册表
 * 包含所有支持的开发板及其 PlatformIO 配置
 */
// BOARD_TEMPLATES has been removed in favor of frontend-driven configuration (Single Source of Truth)

/**
 * 根据模板生成 platformio.ini 配置文件内容的工具函数
 * @param template 板级配置模板
 * @returns INI 格式的配置字符串
 */
export const generateIniConfig = (template: PlatformIOTemplate): string => {
    let config = `[env:${template.envName}]\n`;
    config += `platform = ${template.platform}\n`;
    config += `board = ${template.board}\n`;
    config += `framework = ${template.framework}\n`;

    // 添加可选字段
    Object.keys(template).forEach(key => {
        if (key !== 'envName' && key !== 'platform' && key !== 'board' && key !== 'framework' && key !== 'custom_ini_content' && template[key]) {
            config += `${key} = ${template[key]}\n`;
        }
    });

    if (template.custom_ini_content) {
        config += `\n${template.custom_ini_content}\n`;
    }

    return config;
};
