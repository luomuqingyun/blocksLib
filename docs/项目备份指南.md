# 如何将项目备份到 GitHub 私有仓库

为了确保您的代码安全，建议将其上传到 GitHub 私有仓库。以下是详细步骤：

## 第一步：准备 GitHub 仓库
1.  登录 [GitHub](https://github.com).
2.  点击右上角的 **+** 号，选择 **New repository**。
3.  **Repository name**: 输入项目名称 (例如 `embedblocks-studio-backup`)。
4.  **Visibility**: 务必选择🔒 **Private** (私有)，这样只有您自己能看到。
5.  其他选项（README, .gitignore）**不要勾选**（因为我们本地已经有了）。
6.  点击 **Create repository**。
7.  复制屏幕上显示的HTTPS地址，类似：`https://github.com/YourUsername/embedblocks-studio-backup.git`。

## 第二步：安装 Git (如果您还没有安装)
由于系统检测到您可能未安装 Git，请先安装：
1.  下载 [Git for Windows](https://git-scm.com/download/win)。
2.  一路点击 "Next" 完成安装（默认设置即可）。
3.  安装完成后，**重启电脑**或重新打开终端。

## 第三步：初始化并上传
打开项目文件夹 (`c:\Users\wofy\Desktop\embedblocks-studio`)，右键选择 "Open Git Bash here" 或在终端中执行以下命令：

```bash
# 1. 初始化 Git 仓库
git init

# 2. 添加所有文件 (我们已经为您配置好了 .gitignore，会自动忽略垃圾文件)
git add .

# 3. 提交更改
git commit -m "First backup: Initial commit"

# 4. 关联远程仓库 (将下面的 URL 替换为您刚才复制的地址)
git remote add origin https://github.com/YourUsername/embedblocks-studio-backup.git

# 5. 推送到 GitHub
git branch -M main
git push -u origin main
```

## 常见问题
- **需要登录？**: 第一次 `git push` 时会弹窗要求登录 GitHub，输入账号密码（或 Token）即可。
- **大文件错误？**: 如果遇到文件过大无法上传，请检查是否有些编译生成的 `.exe` 或大文件未被忽略。我已经为您更新了 `.gitignore` 过滤掉了常见的构建产物。

## 后续备份
每次修改完代码想要备份时，只需执行：
```bash
git add .
git commit -m "更新说明"
git push
```
