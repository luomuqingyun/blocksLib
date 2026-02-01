/**
 * ============================================================
 * 编译工作流服务 (Build Workflow Service)
 * ============================================================
 * 
 * 负责编排编译/上传工作流，协调各服务之间的交互。
 * 
 * 主要职责:
 * - 协调串口服务 (上传前关闭冲突的串口)
 * - 注入扩展库路径
 * - 生成唯一的构建 ID 防止日志混淆
 * - 向前端发送实时日志和状态
 * 
 * 双端口模式:
 * - 支持监视端口和上传端口分离
 * - 仅在端口冲突时关闭监视器
 * 
 * @file electron/services/BuildWorkflowService.ts
 * @module EmbedBlocks/Electron/Services/BuildWorkflowService
 */

import { BrowserWindow } from 'electron';
import { pioService } from './PioService';
import { serialService } from './SerialService';
import { extensionService } from './ExtensionService';

export class BuildWorkflowService {
    /**
     * 构建计数器，用于生成唯一的 buildId
     * 防止多次快速编译时日志混淆
     */
    private buildCounter = 0;

    /**
     * 执行编译或上传工作流
     * 
     * 工作流步骤:
     * 1. 确定目标端口 (项目设置优先于监视器端口)
     * 2. 处理端口冲突 (双端口模式支持)
     * 3. 注入扩展库路径
     * 4. 调用 PioService 执行实际编译/上传
     * 5. 上传完成后提示重连串口
     * 
     * @param mainWindow 主窗口，用于发送 IPC 消息
     * @param code 要编译的源代码
     * @param buildConfig 构建配置 (包含 board, platform, framework, upload_port 等)
     * @param operation 操作类型: 'build' 编译 | 'upload' 上传
     * @param port 监视器当前端口 (可能不同于上传端口)
     * @param projectPath 项目路径 (可选，用于指定编译目录)
     */
    public async runOrchestration(
        mainWindow: BrowserWindow | null,
        code: string,
        buildConfig: any,
        operation: 'build' | 'upload',
        port?: string,
        projectPath?: string
    ) {
        // ===== 步骤0: 初始化构建会话 =====
        // 生成唯一的 buildId，结合时间戳和计数器确保唯一性
        const buildId = `${Date.now()}-${++this.buildCounter}`;

        // 日志发送工具函数，封装 buildId 以便前端区分不同构建会话的日志
        const sendLog = (msg: string) => mainWindow?.webContents.send('build-log', { buildId, message: msg });

        // 通知前端新的构建会话开始 (前端可清空旧日志)
        mainWindow?.webContents.send('build-start', { buildId, operation });

        // ===== 步骤1: 确定目标上传端口 =====
        // 端口优先级: buildConfig.upload_port (项目设置) > port (监视器端口)
        // 这支持“双端口模式”: 监视器和上传使用不同端口
        const targetUploadPort = (operation === 'upload' && buildConfig?.upload_port) ? buildConfig.upload_port : port;

        // ===== 步骤2: 处理端口冲突 =====
        const status = serialService.getStatus();
        const wasConnected = status.connected;  // 记录上传前的连接状态
        const previousPort = status.port;       // 记录之前连接的端口

        /**
         * 端口冲突判断逻辑:
         * - 如果 targetUploadPort 未定义 (自动检测): 保守起见，关闭端口
         * - 如果 targetUploadPort === previousPort: 必须关闭，否则 PIO 无法访问
         * - 如果两者不同: 可以并行工作 (双端口模式)
         * 
         * 潜在问题:
         * - 如果用户配置了错误的 upload_port，之后会在预检查中拥截
         */
        const isPortCollision = wasConnected && (!targetUploadPort || targetUploadPort === previousPort);

        if (isPortCollision) {
            // 存在冲突，关闭串口监视器
            serialService.close();
            // 通知前端更新 UI 状态
            mainWindow?.webContents.send('monitor-status', { connected: false });
        } else if (wasConnected && operation === 'upload') {
            // 不冲突且是上传操作: 记录双端口模式信息
            sendLog(`双端口模式: 监视 ${previousPort}, 上传到 ${targetUploadPort || '自动检测'}`);
        }

        // ===== 步骤3: 获取扩展库路径 =====
        // 扩展插件可能包含 C++ 库，需要注入到 PLATFORMIO_LIB_EXTRA_DIRS
        const extLibPaths = extensionService.getExtensionLibPaths();

        // ===== 步骤4: 执行 PIO 操作 =====
        let result;
        if (operation === 'build') {
            // 编译操作: 不需要端口
            result = await pioService.build(code, buildConfig, extLibPaths, sendLog, projectPath);
        } else {
            // 上传操作: 需要预检查端口是否存在
            if (targetUploadPort) {
                const ports = await serialService.listPorts();
                const portExists = ports.some(p => p.path === targetUploadPort);
                if (!portExists) {
                    // 端口不存在，提前报错并终止
                    sendLog(`错误: 目标上传端口 [${targetUploadPort}] 未找到!`);
                    sendLog(`提示: 请检查连接，或在设置中清空“上传端口”改用监视器端口。`);
                    // TODO: 应该发送 build-end 事件通知前端构建失败
                    return;
                }
            }

            // 执行上传
            // 注意: targetUploadPort 可能为 undefined，此时 PIO 会自动检测端口
            result = await pioService.upload(code, buildConfig, targetUploadPort, extLibPaths, sendLog, projectPath);
        }

        // ===== 步骤5: 上传后处理 =====
        // 如果之前因冲突关闭了端口，提示用户手动重连
        // 设计决策: 不自动重连，因为:
        // 1. 用户可能希望检查上传结果或改变设置
        // 2. 端口可能需要时间重新准备就绪
        // 3. 避免上传失败后立即重连导致的混乱
        if (isPortCollision && wasConnected && previousPort && result.success) {
            sendLog("注意: 如需重新连接串口监视器，请手动操作。");
        }

        // TODO: 应该发送 build-end 事件通知前端构建结束
        // mainWindow?.webContents.send('build-end', { buildId, success: result.success });
    }
}

/** 导出单例服务实例 */
export const buildWorkflowService = new BuildWorkflowService();
