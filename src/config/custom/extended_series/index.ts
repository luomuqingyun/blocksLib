
import { BoardSeries, Board } from '../../../types/board';

/**
 * 示例: 自动化系列 (Auto-Discovery Series)
 * 
 * 这个 index.ts 使用了 Vite 的 `import.meta.glob` 功能。
 * 它会自动扫描当前文件夹下所有的 .ts 文件（以及子文件夹中的 index.ts），
 * 并自动将它们注册到系列中。
 * 
 * **优势**: 
 * 1. 你只需要新建文件/文件夹，无需修改此文件。
 * 2. 支持单文件定义 (`board_x.ts`)。
 * 3. 支持文件夹定义 (`my_board/index.ts`)。
 */

// 1. 自动扫描所有 board_*.ts 文件 和 */index.ts (针对文件夹结构)
const modules = import.meta.glob(['./board_*.ts', './*/index.ts'], { eager: true });

const autoLoadedBoards: Board[] = [];

for (const path in modules) {
    const mod = modules[path] as any;
    // 假设每个文件导出的第一个 Export 就是 Board 配置
    // 或者你可以约定使用 default export: const board = mod.default;
    for (const key in mod) {
        const item = mod[key];
        // 简单鸭子类型判断: 只要有 id 和 mcu 字段就认为是 Board
        if (item && item.id && item.mcu) {
            autoLoadedBoards.push(item);
        }
    }
}

export const MY_CUSTOM_SERIES: BoardSeries = {
    id: 'my_custom_series',
    name: { zh: '我的自定义扩展系列', en: 'My Custom Extended Series' },
    boards: autoLoadedBoards
};

