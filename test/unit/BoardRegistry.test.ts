/**
 * ============================================================
 * 开发板注册表单元测试 (Board Registry Unit Tests)
 * ============================================================
 * 
 * 测试 BoardRegistry 单例服务的核心功能。
 * 
 * 测试覆盖:
 * - 开发板注册与获取 (Registration)
 * - 默认工具箱生成 (Default Toolbox)
 * - 策略模式分发 (Strategy Dispatch) - 验证 STM32/ESP32 动态分类
 * - 扩展插件分类注入 (Extensions) 及其兼容性过滤
 * 
 * @file test/unit/BoardRegistry.test.ts
 * @module EmbedBlocks/Testing/Unit/Registry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BoardRegistry } from '../../src/registries/BoardRegistry';
import { BoardConfig } from '../../src/types/board';

// ------------------------------------------------------------------
// Mock: BoardRepository
// ------------------------------------------------------------------
// 模拟数据层，防止测试时尝试读取真实的文件系统。
vi.mock('../../src/data/BoardRepository', () => ({
    boardRepository: {
        getAllBoards: () => []
    }
}));

describe('BoardRegistry', () => {
    // 每次测试前清理单例状态，防止测试间污染
    beforeEach(() => {
        // 使用 any 类型转换访问私有属性进行清理
        (BoardRegistry as any).boards.clear();
        (BoardRegistry as any).toolboxCache.clear();
        (BoardRegistry as any).externalCategories.clear();
    });

    /**
     * Helper: 创建模拟开发板配置
     * 快速生成用于测试的 BoardConfig 对象。
     */
    const createMockBoard = (id: string, family: string = 'arduino'): BoardConfig => ({
        id,
        name: `Test Board ${id}`,
        family: family as any,
        mcu: 'atmega328p',
        freq: '16MHz',
        flash: '32KB',
        ram: '2KB',
        fqbn: 'arduino:avr:uno',
        pins: {
            digital: [], analog: [], pwm: [], i2c: [], spi: [], serial: []
        },
        capabilities: {}
    });

    const mockBoard = createMockBoard('test:uno');

    /**
     * 测试用例: 基本注册与获取
     * 验证基础的 CRUD 操作是否正常。
     */
    it('registers and retrieves a board (开发板注册与获取)', () => {
        BoardRegistry.register(mockBoard);
        expect(BoardRegistry.get('test:uno')).toEqual(mockBoard);
    });

    /**
     * 测试用例: 生成默认工具箱
     * 验证对于标准开发板，是否能生成包含 变量区(Common) 和 IO区(Hardware) 的工具箱。
     */
    it('generates default toolbox for simple board (生成默认工具箱)', () => {
        BoardRegistry.register(mockBoard);
        const defaults = BoardRegistry.getToolboxConfig('test:uno');

        // 验证: 包含通用的变量分类
        const variableCat = defaults.contents.find((c: any) => c.custom === 'ARDUINO_VARIABLES');
        expect(variableCat).toBeDefined();

        // 验证: 包含基础 IO 分类
        const ioCat = defaults.contents.find((c: any) => c.name === '%{BKY_CAT_IO}');
        expect(ioCat).toBeDefined();
    });

    /**
     * 测试用例: 应用 STM32 策略
     * 验证当板卡家族为 stm32 时，是否自动注入了 STM32 特有的工具箱分类。
     */
    it('applies strategies for STM32 family (应用 STM32 策略)', () => {
        const stm32Board = createMockBoard('test:stm32', 'stm32');
        stm32Board.capabilities = { can: true };
        BoardRegistry.register(stm32Board);

        const config = BoardRegistry.getToolboxConfig('test:stm32');
        const stm32Cat = config.contents.find((c: any) => c.name === '%{BKY_CAT_STM32}');

        expect(stm32Cat).toBeDefined();
    });

    /**
     * 测试用例: 应用 IoT 策略
     * 验证当板卡具备 wifi 能力时，是否自动注入了 IoT 工具箱分类。
     */
    it('applies IoT strategy for WiFi boards (应用 IoT 策略)', () => {
        const wifiBoard = createMockBoard('test:esp32', 'esp32');
        wifiBoard.capabilities = { wifi: true };
        BoardRegistry.register(wifiBoard);

        const config = BoardRegistry.getToolboxConfig('test:esp32');
        const iotCat = config.contents.find((c: any) => c.name === '%{BKY_CAT_IOT}');

        expect(iotCat).toBeDefined();
    });

    /**
     * 测试用例: 注册扩展分类
     * 验证插件系统是否可以通过 registerExtensionCategory 动态添加新的工具箱分类。
     */
    it('allows registering extension categories (允许注册扩展分类)', () => {
        BoardRegistry.register(mockBoard);
        const extCat = { kind: 'category', name: 'My Utils' };

        BoardRegistry.registerExtensionCategory('my-plugin', extCat);

        const config = BoardRegistry.getToolboxConfig('test:uno');
        const myCat = config.contents.find((c: any) => c.name === 'My Utils');

        expect(myCat).toBeDefined();
    });

    /**
     * 测试用例: 扩展兼容性过滤
     * 验证扩展分类是否遵守 families 约束。例如声明仅支持 esp32 的插件不应出现在 arduino 板卡中。
     */
    it('respects extension compatibility (遵守扩展兼容性规则)', () => {
        BoardRegistry.register(mockBoard); // family: arduino
        const extCat = { kind: 'category', name: 'ESP Only' };

        // 仅注册给 esp32 家族
        BoardRegistry.registerExtensionCategory('esp-plugin', extCat, { families: ['esp32'] });

        const config = BoardRegistry.getToolboxConfig('test:uno');
        const myCat = config.contents.find((c: any) => c.name === 'ESP Only');

        // 预期: 在 arduino 板卡中不应出现该分类
        expect(myCat).toBeUndefined();
    });
});
