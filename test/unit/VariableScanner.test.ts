/**
 * ============================================================
 * 变量扫描器单元测试 (Variable Scanner Unit Tests)
 * ============================================================
 * 
 * 测试 VariableScanner 模块的核心逻辑，确保变量、函数、结构体
 * 等定义能从工作区积木中正确解析。
 * 
 * 测试覆盖:
 * - 全局变量 (Globals) 扫描
 * - 函数作用域 (Function Scope) 扫描 (参数 vs 局部变量)
 * - 结构体/枚举定义 (Struct/Enum) 扫描
 * 
 * @file test/unit/VariableScanner.test.ts
 * @module EmbedBlocks/Testing/Unit/Scanner
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as VariableScanner from '../../src/utils/scanner/VariableScanner';

// ------------------------------------------------------------------
// Helper: 创建模拟积木 (Mock Block Factory)
// ------------------------------------------------------------------
// 本地模拟 Blockly 类型，避免加载完整的 Blockly 引擎，提高测试速度。
const createMockBlock = (id: string, type: string, fields: Record<string, string> = {}) => {
    return {
        id,
        type,
        isEnabled: () => true,
        getFieldValue: (name: string) => fields[name] || null,
        getInputTargetBlock: vi.fn(),
        getSurroundParent: vi.fn().mockReturnValue(null), // 默认无父级 (全局)
        nextConnection: { targetBlock: vi.fn().mockReturnValue(null) },
        // 模拟特定积木的扩展属性 (如结构体成员、枚举项)
        members_: [],
        items_: [],
    };
};

describe('VariableScanner', () => {
    let mockWorkspace: any;
    let mockBlocks: any[];

    // 每个测试前重置工作区状态
    beforeEach(() => {
        mockBlocks = [];
        mockWorkspace = {
            id: 'test_workspace',
            getAllBlocks: () => mockBlocks,
        };
    });

    /**
     * 测试用例: 扫描全局变量
     * 验证 'arduino_var_declare' 积木能否被正确识别为全局变量，并提取类型信息。
     */
    it('scans global variables (扫描全局变量)', () => {
        // 模拟一个全局变量声明积木: int myGlobal;
        mockBlocks.push(createMockBlock('1', 'arduino_var_declare', { VAR: 'myGlobal', TYPE: 'int' }));

        const result = VariableScanner.scanVariablesCategorized(mockWorkspace);

        expect(result.globals.has('myGlobal')).toBe(true);
        expect(result.variableTypes.get('myGlobal')).toBe('int');
    });

    /**
     * 测试用例: 扫描函数定义
     * 验证 'arduino_functions_def_flexible' 积木能否被识别，并创建对应的作用域记录。
     */
    it('scans function definitions (扫描函数定义)', () => {
        // 模拟一个函数定义积木: void myFunc() {}
        mockBlocks.push(createMockBlock('f1', 'arduino_functions_def_flexible', { NAME: 'myFunc' }));

        const result = VariableScanner.scanVariablesCategorized(mockWorkspace);

        expect(result.functions.has('myFunc')).toBe(true);
        // 确认该函数ID在 functionScopes Map 中存在
        expect(result.functionScopes.has('f1')).toBe(true);
    });

    /**
     * 测试用例: 识别函数作用域内的局部变量
     * 验证嵌套在函数内部的变量声明是否被正确归类为局部变量，而不是全局变量。
     */
    it('identifies local variables within function scope (识别局部变量)', () => {
        const funcBlock = createMockBlock('f1', 'arduino_functions_def_flexible', { NAME: 'myFunc' });
        const varBlock = createMockBlock('v1', 'arduino_var_declare', { VAR: 'myLocal', TYPE: 'int' });

        // 模拟嵌套关系: 变量积木位于函数积木内部
        varBlock.getSurroundParent = vi.fn().mockReturnValue(funcBlock);

        mockBlocks.push(funcBlock, varBlock);

        const result = VariableScanner.scanVariablesCategorized(mockWorkspace);

        // 验证它不在全局列表中
        expect(result.globals.has('myLocal')).toBe(false);
        // 验证它出现在特定函数积木的 locals 集合中
        expect(result.functionScopes.get('f1')?.locals.has('myLocal')).toBe(true);
    });

    /**
     * 测试用例: 扫描结构体定义
     * 验证结构体定义积木及其成员属性的解析。
     */
    it('scans struct definitions (扫描结构体定义)', () => {
        const structBlock = createMockBlock('s1', 'c_struct_define', { NAME: 'MyStruct' });
        // 模拟结构体成员 (Blockly 积木上的自定义属性)
        (structBlock as any).members_ = [{ name: 'member1' }, { name: 'member2' }];

        mockBlocks.push(structBlock);

        const result = VariableScanner.scanVariablesCategorized(mockWorkspace);

        expect(result.userTypes.has('struct MyStruct')).toBe(true);
        expect(result.structDefinitions.get('MyStruct')).toEqual(['member1', 'member2']);
    });
});
