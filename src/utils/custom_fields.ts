/**
 * ============================================================
 * 自定义 Blockly 字段 (Custom Blockly Fields)
 * ============================================================
 * 
 * 提供增强的下拉菜单字段，解决 Blockly 原生字段的局限性。
 * 
 * 包含字段:
 * - FieldDropdownPermissive: 宽松模式，允许保留不在选项列表中的值
 *   适用于变量定义等需要保留历史值的场景
 * 
 * - FieldDropdownSmart: 智能模式，自动替换无效占位符
 *   适用于 Get/Set 积木、函数调用等需要自动选择有效值的场景
 * 
 * @file src/utils/custom_fields.ts
 * @module EmbedBlocks/Frontend/Utils
 */

// @ts-nocheck
import * as Blockly from 'blockly';

/**
 * 宽松模式下拉菜单 (Permissive Dropdown)
 * 允许显示不在选项列表中的值（用于保留已删除的变量名，防止变成空白）
 * 适用于：变量定义、结构体成员选择（需要保留历史值）
 */
export class FieldDropdownPermissive extends Blockly.FieldDropdown {
    constructor(menuGenerator: any, opt_validator?: any) {
        super(menuGenerator, opt_validator);
    }

    doClassValidation_(newValue: string) {
        return newValue;
    }

    // 新增：强制刷新选项缓存
    refreshOptions() {
        this.generatedOptions_ = null; // 清除缓存
        this.getOptions(false); // 立即重新生成
        this.forceRerender(); // 强制重绘
    }
}

/**
 * 智能下拉菜单 (Smart Dropdown)
 * 如果当前值是无效占位符（如 no_var），且列表有有效选项，则自动选择第一个。
 * 适用于：Get/Set 积木、函数调用、枚举值选择
 */
export class FieldDropdownSmart extends Blockly.FieldDropdown {
    constructor(menuGenerator: any, opt_validator?: any) {
        super(menuGenerator, opt_validator);
    }

    doClassValidation_(newValue: string) {
        // 1. 如果值在列表中存在，直接通过
        const options = this.getOptions(true); // true 表示使用缓存
        for (let i = 0; i < options.length; i++) {
            if (options[i][1] === newValue) return newValue;
        }

        // 2. 定义无效占位符列表
        const invalidPlaceholders = [
            'no_func', 'myFunc',
            'no_var', 'myVar',
            'no_arr', 'myArr',
            'no_struct', 'mySt',
            'no_enum',
            'no_item', // 枚举子项占位符
            'no_const',
            'no_member',
            ''
        ];

        // 3. 如果当前值是占位符，返回 null -> Blockly 会自动重置为列表第一项
        if (invalidPlaceholders.includes(newValue)) {
            return null;
        }

        // 4. 如果是其他未知值（可能是已删除的变量），保留它（表现得像 Permissive）
        return newValue;
    }

    // 新增：强制刷新选项缓存
    refreshOptions() {
        this.generatedOptions_ = null; // 清除缓存
        this.getOptions(false); // 立即重新生成
        this.forceRerender(); // 强制重绘
    }
}

// 安全注册
try {
    if (!Blockly.fieldRegistry.registry['field_dropdown_permissive']) {
        Blockly.fieldRegistry.register('field_dropdown_permissive', FieldDropdownPermissive);
    }
} catch (e) { }

try {
    if (!Blockly.fieldRegistry.registry['field_dropdown_smart']) {
        Blockly.fieldRegistry.register('field_dropdown_smart', FieldDropdownSmart);
    }
} catch (e) { }