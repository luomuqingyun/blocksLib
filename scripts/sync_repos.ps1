# 同步仓库脚本 (Sync Repositories Script)
# 功能: 自动化管理 blocksLib 子仓库与主项目的更新流程
# 用法: .\scripts\sync_repos.ps1

# --- 初始化环境 ---
# 确保脚本始终在项目根目录下运行
$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path $ScriptDir -Parent
if ($ProjectRoot -ne (Get-Location).Path) {
    Write-Host ">>>以此目录为根目录运行: $ProjectRoot" -ForegroundColor Gray
    Set-Location $ProjectRoot
}

# --- 配置 ---
# Git 路径 (如果在 PATH 中找不到，尝试使用默认路径)
$GitPath = "git"
if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
    if (Test-Path "D:\Program Files\Git\cmd\git.exe") {
        $GitPath = "D:\Program Files\Git\cmd\git.exe"
    }
}

function Run-GitCommand {
    param(
        [string]$CommandStr
    )
    Write-Host "> git $CommandStr" -ForegroundColor Gray
    # 使用 Invoke-Expression 执行带参数的 Git 命令
    & $GitPath $CommandStr.Split(" ")
}

function Update-BlocksLib {
    Write-Host "`n=== 正在更新 blocksLib (子仓库) ===" -ForegroundColor Cyan
    
    if (-not (Test-Path "blocksLib")) {
        Write-Error "找不到 blocksLib 目录！"
        return
    }

    Push-Location "blocksLib"

    # 1. 执行自动打包
    if (Test-Path "pack_plugins.ps1") {
        Write-Host ">>> 执行插件打包逻辑..." -ForegroundColor Yellow
        .\pack_plugins.ps1
    }
    else {
        Write-Warning "未找到 pack_plugins.ps1，跳过打包步骤。"
    }

    # 2. Git 提交
    Write-Host ">>> 提交代码..." -ForegroundColor Yellow
    Run-GitCommand "add ."
    
    $commitMsg = Read-Host "请输入提交信息 (默认为 'Update plugins')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "Update plugins" }
    
    Run-GitCommand "commit -m ""$commitMsg"""
    
    # 3. Git 推送
    Write-Host ">>> 推送至 GitHub..." -ForegroundColor Yellow
    Run-GitCommand "push origin main"

    Pop-Location
    Write-Host "=== blocksLib 更新完成 ===" -ForegroundColor Green
}

function Update-MainRepo {
    Write-Host "`n=== 正在更新 EmbedBlocks Studio (主项目) ===" -ForegroundColor Cyan

    # 1. 检查是否有子模块变更
    $status = & $GitPath status
    if ($status -match "blocksLib") {
        Write-Host "检测到 blocksLib 子模块有更新，正在记录新版本..." -ForegroundColor Yellow
    }

    # 2. Git 提交
    Write-Host ">>> 提交代码..." -ForegroundColor Yellow
    Run-GitCommand "add ."
    
    $commitMsg = Read-Host "请输入提交信息 (默认为 'Update project')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "Update project" }
    
    Run-GitCommand "commit -m ""$commitMsg"""

    # 3. Git 推送
    Write-Host ">>> 推送至 GitHub..." -ForegroundColor Yellow
    Run-GitCommand "push origin main"

    Write-Host "=== 主项目更新完成 ===" -ForegroundColor Green
}

# --- 主菜单 ---
Clear-Host
Write-Host "=========================================="
Write-Host "   EmbedBlocks 仓库同步工具"
Write-Host "=========================================="
Write-Host "1. 仅更新 blocksLib (插件库)"
Write-Host "2. 仅更新 主项目 (EmbedBlocks Studio)"
Write-Host "3. 联合更新 (先更新插件库，再更新主项目)"
Write-Host "Q. 退出"
Write-Host "=========================================="

$choice = Read-Host "请选择操作 [1-3, Q]"

switch ($choice) {
    "1" { Update-BlocksLib }
    "2" { Update-MainRepo }
    "3" { 
        Update-BlocksLib
        # 等待一小会儿确保文件系统同步
        Start-Sleep -Seconds 1
        Update-MainRepo 
    }
    "Q" { exit }
    Default { Write-Warning "无效选择" }
}

Write-Host "`n所有操作已结束。按回车键退出..."
Read-Host
