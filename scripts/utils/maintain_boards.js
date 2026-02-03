
/**
 * 板卡数据维护脚本 (Board Data Maintenance Script)
 * ------------------------------------------------
 * 本脚本旨在安全地格式化和标准化 JSON 板卡定义文件，
 * **绝不会** 覆盖关键的手动数据（如 `description` 描述和 `page_url` 文档链接）。
 * 
 * 使用方法:
 *   node scripts/maintain_boards.js check    - 仅检查是否有缺失字段或格式问题（只读）
 *   node scripts/maintain_boards.js format   - 将 JSON 键值重排为标准顺序 (id -> name -> ... -> description -> page_url)
 * 
 * 逻辑:
 * 1. 遍历 src/data/boards/ 下的所有 JSON 文件。
 * 2. 解析 JSON 内容。
 * 3. 强制字段顺序: id, name, platform, mcu, variant, package, pinCount, fcpu, specs, description, page_url。
 * 4. **保留** 所有现有的值，不进行任何删除或覆盖操作。
 */

const fs = require('fs');
const glob = require('glob');
const path = require('path');

const command = process.argv[2] || 'check';
const boardFiles = glob.sync('src/data/boards/**/*.json', { absolute: true });

console.log(`当前运行模式: ${command.toUpperCase()}`);
console.log(`找到板卡文件: ${boardFiles.length} 个`);

let issueCount = 0;
let updatedCount = 0;

const preferredOrder = [
    "id",
    "name",
    "platform",
    "mcu",
    "variant",
    "package",
    "pinCount",
    "fcpu",
    "specs",
    "description",
    "page_url"
];

boardFiles.forEach(subFile => {
    try {
        const content = fs.readFileSync(subFile, 'utf8');
        const board = JSON.parse(content);
        const fileName = path.basename(subFile);

        // 验证检查 (Validation Checks)
        const issues = [];
        if (!board.id) issues.push("缺少 'id'");
        if (!board.name) issues.push("缺少 'name'");
        if (!board.description) issues.push("缺少 'description'");
        if (!board.page_url) issues.push("缺少 'page_url'");

        // 检查 page_url 是否紧跟在 description 之后 (启发式检查)
        const keys = Object.keys(board);
        const descIndex = keys.indexOf('description');
        const urlIndex = keys.indexOf('page_url');

        const isOrdered = descIndex !== -1 && urlIndex !== -1 && urlIndex === descIndex + 1;

        if (issues.length > 0) {
            console.warn(`[警告] ${fileName}: ${issues.join(', ')}`);
            issueCount++;
        }

        if (command === 'format') {
            // 重排逻辑 (Reordering Logic)
            const newBoard = {};

            // 1. 按首选顺序添加存在的键
            preferredOrder.forEach(key => {
                if (board.hasOwnProperty(key)) {
                    newBoard[key] = board[key];
                    delete board[key];
                }
            });

            // 2. 添加剩余的键 (如 pinMap 等)
            Object.keys(board).forEach(key => {
                newBoard[key] = board[key];
            });

            // 检查内容是否有变更，避免无意义的写入
            const newContent = JSON.stringify(newBoard, null, 2);
            if (newContent !== content) {
                fs.writeFileSync(subFile, newContent);
                updatedCount++;
                // console.log(`[已更新] ${fileName}`);
            }
        } else if (command === 'check') {
            if (!isOrdered && board.description && board.page_url) {
                console.log(`[格式建议] ${fileName}: 'page_url' 字段未紧跟在 'description' 之后`);
                issueCount++;
            }
        }

    } catch (e) {
        console.error(`[错误] 处理文件 ${subFile} 时出错:`, e.message);
    }
});

console.log(`------------------------------------------------`);
if (command === 'format') {
    console.log(`格式化完成。已更新 ${updatedCount} 个文件。`);
} else {
    console.log(`检查完成。发现 ${issueCount} 个问题/警告。`);
}
