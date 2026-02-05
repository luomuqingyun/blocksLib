import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

/**
 * PlatformIO 智能发现模拟测试脚本
 * 
 * 动机：
 * 当用户没有将 'pio' 添加到系统环境变量时，软件需要能自动找到 
 * VSCode 或官方安装程序默认的安装路径，防止编译功能失效。
 */
async function testSmartDiscovery() {
    // 获取用户主目录 (如 C:\Users\YourName)
    const userHome = process.env.USERPROFILE || process.env.HOME || '';

    // 定义常见的 PlatformIO 安装路径（Windows 的默认位置）
    const potentialPaths = [
        path.join(userHome, '.platformio', 'penv', 'Scripts', 'pio.exe')
    ];

    console.log("--- 开始模拟 PlatformIO 智能发现逻辑 ---");

    // 测试步骤 1: 验证环境变量环境
    // 我们要确保当前命令行确实识别不到 'pio'，才能测试“回退/自动发现”逻辑是否生效
    console.log("1. 检查环境变量中的 'pio'...");
    try {
        await new Promise((res, rej) => exec('pio --version', (err) => err ? rej(err) : res(true)));
        console.log("   [警告] 环境变量中依然能找到 pio。为了测试自动搜索，请确保已删除相关环境变量并重启终端。");
    } catch (e) {
        console.log("   [正常] 环境变量中未发现 pio。正在启动智能扫描回退逻辑...");
    }

    // 测试步骤 2: 模拟 PioService 中的智能扫描算法
    console.log("\n2. 启动路径扫描...");
    let foundPio = null;

    // 过滤出物理上真实存在的安装路径
    const filteredPaths = potentialPaths.filter(p => fs.existsSync(p));
    console.log(`   发现物理存在的潜在路径数量: ${filteredPaths.length}`);

    for (const p of filteredPaths) {
        console.log(`   正在尝试执行: ${p}`);
        try {
            // 尝试通过绝对路径调用 pio --version
            const version = await new Promise<string>((res, rej) => {
                exec(`"${p}" --version`, (err, out) => err ? rej(err) : res(out.trim()));
            });
            console.log(`   [成功] 在非环境变量路径下发现 PIO: ${version}`);
            foundPio = p;
            break; // 找到第一个可用的就停止
        } catch (e) {
            console.log(`   [失败] 路径存在但无法执行。`);
        }
    }

    // 测试结果汇报
    if (foundPio) {
        console.log(`\n最终结果: 验证通过。程序可以成功绕过环境变量，直接定位到: ${foundPio}`);
    } else {
        console.log("\n最终结果: 验证失败。脚本未能自动发现已安装的 PlatformIO。");
    }
}

// 执行测试
testSmartDiscovery();
