import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { projectService } from './services/ProjectService';
import { configService } from './services/ConfigService';

/**
 * AI 自动运行器: 处理通过 CLI 触发的自动化项目创建和积木注入。
 * 
 * 支持的命令行标志 (Flags):
 * --ai-create-project: 触发此运行器。
 * --name="ProjectName": 项目名称。
 * --board="board_id": 目标开发板 ID。
 * --blocks="JSON_OR_FILE": Blockly 积木的 JSON 字符串或 .json 文件路径。
 * --dir="ParentDir": 项目的父级存储目录。
 * 
 * @file electron/aiRunner.ts
 */
export async function runAiProjectCreation() {
    console.log('\n======================================================');
    console.log(' EmbedBlocks Studio - AI 自动化运行器 (AI Runner)        ');
    console.log('======================================================\n');

    /** 获取命令行参数值的辅助函数 */
    const getArgValue = (name: string): string | null => {
        const arg = process.argv.find(a => a.startsWith(name + '='));
        return arg ? arg.split('=')[1] : null;
    };

    // 解析参数，提供默认值
    const name = getArgValue('--name') || 'AI_Project';
    const board = getArgValue('--board') || 'arduino_uno';
    const blocksArg = getArgValue('--blocks') || '';
    const targetDir = getArgValue('--dir') || configService.get('general.workDir');

    if (!targetDir) {
        console.error('[AIRunner] 错误: 未指定目标目录，且 general.workDir 未设置。');
        return;
    }

    console.log(`[AIRunner] 正在创建项目: ${name}`);
    console.log(`[AIRunner] 目标板卡: ${board}`);
    console.log(`[AIRunner] 父级目录: ${targetDir}`);

    // 构建项目编译配置
    const buildConfig: any = {
        board: board,
        framework: 'arduino'
    };

    // ============================================================
    // 1. 初始化项目基础结构 (Initialize Project Structure)
    // 使用 ProjectService 创建包含 .ebproj, src/, libraries/ 的标准目录结构
    // ============================================================
    try {
        const res = await projectService.createProject(targetDir, name, board, buildConfig);
        if (!res.success) {
            console.error(`[AIRunner] ❌ 项目创建失败: ${res.error}`);
            return;
        }

        const ebprojPath = res.path!;
        console.log(`[AIRunner] ✅ 项目结构已成功创建于: ${path.dirname(ebprojPath)}`);

        // ============================================================
        // 2. 积木数据注入 (Blocks Data Injection)
        // 如果命令行提供了 --blocks 参数，则将其解析并存入 .ebproj 文件
        // ============================================================
        if (blocksArg) {
            let blocksData: any = null;
            try {
                // 自动识别输入：如果是合法的文件路径则读取文件，否则视为原始 JSON 字符串
                const absolutePath = path.isAbsolute(blocksArg) ? blocksArg : path.join(process.cwd(), blocksArg);
                if (fs.existsSync(absolutePath)) {
                    console.log(`[AIRunner] 📄 正在从外部文件读取积木定义: ${absolutePath}`);
                    blocksData = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
                } else {
                    console.log('[AIRunner] 📥 正在解析传入的原始 JSON 积木数据串...');
                    blocksData = JSON.parse(blocksArg);
                }
            } catch (e: any) {
                console.error(`[AIRunner] ❌ 解析积木 JSON 失败: ${e.message}`);
            }

            if (blocksData) {
                // --------------------------------------------------------
                // 将积木数据更新回新创建的 .ebproj 配置文件中
                // --------------------------------------------------------
                const projContent = JSON.parse(fs.readFileSync(ebprojPath, 'utf8'));
                projContent.blocks = blocksData;
                fs.writeFileSync(ebprojPath, JSON.stringify(projContent, null, 2));
                console.log('[AIRunner] ✨ 积木建议数据已成功注入并持久化至 .ebproj 文件');

                // --------------------------------------------------------
                // 自动添加至“最近项目”缓存，确保用户打开软件后能直接看到
                // --------------------------------------------------------
                configService.addRecentProject(ebprojPath);
                console.log('[AIRunner] 🔗 已同步至全局“最近使用”项目列表');
            }
        }

        console.log('\n[AIRunner] 🚀 自动化流程执行完毕！您现在可以在 EmbedBlocks Studio 主界面中直接访问该项目。');
        console.log('======================================================\n');
    } catch (err) {
        console.error(`[AIRunner] 🛑 自动化创建过程中发生未捕获的严重异常: ${err}`);
    }
}
