import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as Blockly from 'blockly';
import { arduinoGenerator } from './arduino-base';
import { initAllModules } from '../modules/index';

/**
 * ============================================================
 * 积木跨平台功能验证测试 (Block Cross-Platform Functional Test)
 * ============================================================
 * 
 * 该测试套件具备双重功能：
 * 1. 标准单元测试：验证每个积木块在不同平台下的代码生成逻辑是否正常。
 * 2. 清单导出 (Manifest Dump)：批量扫描并记录积木代码快照，供后续真编译流程使用。
 * 
 * 技术关键点：
 * - 使用 Vitest 环境运行。
 * - 动态载入 EmbedBlocks 积木库并初始化。
 * - 模拟工作区 (Workspace) 以实现 Headless 代码生成。
 */

describe('Block functional cross-platform verification', () => {
    
    // 在所有测试开始前，初始化所有硬件模块注册
    beforeAll(() => {
        initAllModules();
    });

    /** 测试覆盖的所有芯片家族 */
    const testFamilies = ['arduino', 'esp32', 'esp8266', 'stm32'];

    /**
     * 辅助函数：创建一个模拟的积木实例。
     * 为积木注入虚假的字段值（PIN, BAUD 等），确保生成逻辑不会因为缺少字段而报错。
     */
    const createMockBlock = (type: string): any => {
        const workspace = new Blockly.Workspace();
        const block = workspace.newBlock(type);
        
        // 模拟字段获取逻辑
        block.getFieldValue = vi.fn((name: string) => {
            if (name === 'PIN' || name.includes('PIN')) return '13';
            if (name === 'BAUD') return '115200';
            if (name === 'SERIAL_ID') return 'Serial';
            if (name === 'MODE') return 'OUTPUT';
            return '0';
        });

        // 模拟输入链接
        block.getInput = vi.fn((name: string) => ({
            connection: {
                targetBlock: () => null
            }
        })) as any;

        return block;
    };

    // 重新初始化并获取所有注册的积木类型
    initAllModules();
    const allBlockTypes = Object.keys(Blockly.Blocks);
    
    // 环境参数配置
    const BLOCK_FILTER = process.env.BLOCK_FILTER || ''; // 用于过滤特定积木（支持正则）
    const DUMP_MANIFEST = process.env.DUMP_MANIFEST === '1'; // 是否开启清单导出模式
    const MANIFEST_SUFFIX = process.env.MANIFEST_SUFFIX || ''; // 导出文件名后缀

    // 积木审计过滤：排除掉 Blockly 原生基础积木，只关注硬件自定义积木
    const auditedBlocks = allBlockTypes.filter(type => {
        if (BLOCK_FILTER) {
            try {
                const regex = new RegExp(BLOCK_FILTER);
                if (!regex.test(type)) return false;
            } catch (e) {
                if (!type.includes(BLOCK_FILTER)) return false;
            }
        }

        return !['text', 'math_number', 'logic_boolean'].includes(type) &&
            !type.startsWith('controls_') &&
            !type.startsWith('logic_') &&
            !type.startsWith('math_') &&
            !type.startsWith('text_') &&
            !type.startsWith('lists_') &&
            !type.startsWith('variables_') &&
            !type.startsWith('procedures_');
    });

    /**
     * 根据积木类型决定其需要验证的目标家族。
     * 特殊积木（如 esp32_ 开头的）仅验证其对应的平台。
     */
    const getTargetFamiliesForBlock = (type: string): string[] => {
        if (type.startsWith('esp32_')) return ['esp32'];
        if (type.startsWith('stm32_')) return ['stm32'];
        if (type.startsWith('esp8266_')) return ['esp8266'];
        if (type.startsWith('arduino_')) return ['arduino'];
        return testFamilies;
    };

    // ==========================================
    // 模式 A: 积木代码清单导出模式 (DUMP_MANIFEST)
    // ==========================================
    if (DUMP_MANIFEST) {
        it(`should dump manifest for ${auditedBlocks.length} blocks`, async () => {
            const manifest: Record<string, any> = {};
            const manifestPath = path.join(process.cwd(), `block_manifest_${MANIFEST_SUFFIX}.json`);
            
            console.log(`[Manifest] Scanning ${auditedBlocks.length} blocks for suffix ${MANIFEST_SUFFIX}...`);

            for (const type of auditedBlocks) {
                const supportedFamilies = getTargetFamiliesForBlock(type);
                manifest[type] = {};
                for (const family of supportedFamilies) {
                    try {
                        const block = createMockBlock(type);
                        arduinoGenerator.init(block.workspace);
                        arduinoGenerator.setFamily(family);
                        
                        // 执行生成逻辑
                        const rawCode = arduinoGenerator.blockToCode(block);
                        const codeSnippet = Array.isArray(rawCode) ? rawCode[0] : rawCode;
                        arduinoGenerator.finish(codeSnippet || '');
                        
                        // 捕获生成后的构建快照（Include, Setup 等副作用）
                        const snapshot = arduinoGenerator.getSnapshot();
                        manifest[type][family] = { snippet: codeSnippet, ...snapshot };
                    } catch (e: any) {
                        manifest[type][family] = { error: e.message };
                    }
                }
            }

            // 保存最终 Manifest JSON
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            console.log(`[Manifest] Batch saved to: ${manifestPath}`);
        }, 300000); // 增加超时以应对全量扫描
    } 
    // ==========================================
    // 模式 B: 标准单元测试模式
    // ==========================================
    else {
        auditedBlocks.forEach(type => {
            const supportedFamilies = getTargetFamiliesForBlock(type);
            describe(`Block [${type}]`, () => {
                supportedFamilies.forEach(family => {
                    it(`should generate code for target [${family}]`, () => {
                        const block = createMockBlock(type);
                        arduinoGenerator.init(block.workspace);
                        arduinoGenerator.setFamily(family);
                        
                        const rawCode = arduinoGenerator.blockToCode(block);
                        const codeSnippet = Array.isArray(rawCode) ? rawCode[0] : rawCode;
                        const finalCode = arduinoGenerator.finish(codeSnippet || '');
                        
                        // 验证是否成功返回了生成结果
                        expect(finalCode).toBeDefined();
                    });
                });
            });
        });
    }
});
