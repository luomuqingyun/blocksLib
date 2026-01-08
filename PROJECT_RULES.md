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
    -   所有用户可见字符串必须提取到 `src/i18n` 或相应的语言包文件中。
    -   **新增功能与插件**：必须同步提供 `en(英文)` 和 `zh(中文)` 版本的翻译。插件开发推荐使用 `locales/` 动态加载机制。

## 3. 自动记忆 (Persistent Habits)
-   **路径记忆**: 自动检索 `DEV_PATHS.json` 获取本地工具路径。
-   **偏好记忆**: 自动检索 `DEV_PREFERENCES.json` 获取个人开发习惯。

## 4. 文档驱动 (Doc-Driven)
-   重大功能变更需先更新 `implementation_plan.md`。
-   任务完成后需通过 `walkthrough.md` 记录变更历史。

---
*本指南由 Antigravity 自动维护，作为我们协作的“思维契约”。*

