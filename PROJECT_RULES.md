# Agent Guidelines
1. **Language**: Strictly use Simplified Chinese (简体中文) for all thinking, reasoning, and communication with the user.
2. **Documentation**: When generating code comments, READMEs, or implementation plans, always use Simplified Chinese.Code comments must be in Simplified Chinese.

# 协作默契指南 (Collaboration Agreement)

为了提升开发效率并保持 EmbedBlocks Studio 项目的代码质量，Antigravity（AI 助手）与开发者共同遵守以下约定：

## 1. 语言偏好 (Language)
-   **交流语言**: 始终使用 **简体中文** 进行对话与反馈。
-   **文档语言**: 所有新增的手册、指南及 `README.md` 默认生成中文版本。

## 2. 编码规范 (Coding Standards)
-   **中文注释**: 在修改或新增代码逻辑时，必须主动添加清晰的 **中文注释**。
-   **国际化 (I18n)**: 
    -   严禁在 UI 组件中硬编码文本。
    -   **核心 UI (Core)**: 修改 `src/` 下的界面代码时，必须同步 update `src/locales/` 下的 `zh.json` 和 `en.json`。
    -   **用户插件 (User Extensions)**: 遵循《普通用户插件系统开发手册.md》，使用 `locales/` 目录和 `%{KEY}` 占位符实现运行时翻译。**绝不允许**要求用户修改核心源码。
    > [!IMPORTANT]
    > **核心开发铁律**: 对于 Core 源码修改，严禁“先实现功能后补翻译”。对于插件显示问题，必须优先检查 `ExtensionRegistry.ts` 的运行时加载逻辑，而非硬编码修复。
    > [!IMPORTANT]
    > **变更即翻译 (Translation on Change)**: 任何涉及到 UI 显示的代码修改，必须在**第一时间**同步更新 `zh.json` 和 `en.json`。**严禁“先实现功能后补翻译”的行为**，避免测试阶段再返工。

## 3. 自动记忆 (Persistent Habits)
-   **路径记忆**: 自动检索 `DEV_PATHS.json` 获取本地工具路径。
-   **偏好记忆**: 自动检索 `DEV_PREFERENCES.json` 获取个人开发习惯。

## 4. 文档驱动 (Doc-Driven)
-   重大功能变更需先更新 `implementation_plan.md`。
-   任务完成后需通过 `walkthrough.md` 记录变更历史。

---
*本指南由 Antigravity 自动维护，作为我们协作的“思维契约”。*

