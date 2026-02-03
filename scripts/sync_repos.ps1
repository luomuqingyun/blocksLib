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

function Invoke-GitCommand {
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

    # 1. 执行自动打包 (带询问)
    if (Test-Path "pack_plugins.ps1") {
        $shouldPack = Read-Host "是否执行插件打包与市场更新 (Run pack_plugins.ps1)? [Y/n]"
        if ($shouldPack -eq "" -or $shouldPack -match "^[Yy]$") {
            Write-Host ">>> 执行插件打包逻辑..." -ForegroundColor Yellow
            .\pack_plugins.ps1
        }
        else {
            Write-Host ">>> 跳过打包步骤。" -ForegroundColor Gray
        }
    }
    else {
        Write-Warning "未找到 pack_plugins.ps1，跳过打包步骤。"
    }

    # 2. Git 提交
    Write-Host ">>> 提交代码..." -ForegroundColor Yellow
    Invoke-GitCommand "add ."
    
    $commitMsg = Read-Host "请输入blocksLib子项目提交信息 (默认为 'Update plugins')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "Update plugins" }
    
    Invoke-GitCommand "commit -m ""$commitMsg"""
    
    # 3. Git 推送
    Write-Host ">>> 推送至 GitHub..." -ForegroundColor Yellow
    Invoke-GitCommand "push origin main"

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
    Invoke-GitCommand "add ."
    
    $commitMsg = Read-Host "请输入主项目提交信息 (默认为 'Update project')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "Update project" }
    
    Invoke-GitCommand "commit -m ""$commitMsg"""

    # 3. Git 推送
    Write-Host ">>> 推送至 GitHub..." -ForegroundColor Yellow
    Invoke-GitCommand "push origin main"

    Write-Host "=== 主项目更新完成 ===" -ForegroundColor Green
}

function Update-ArduinoCore {
    Write-Host "`n=== 正在同步 Arduino Core STM32 (子模块) ===" -ForegroundColor Cyan
    
    $SubPath = "third_party\Arduino_Core_STM32"
    
    if (Test-Path $SubPath) {
        # 获取当前版本哈希
        $oldCommit = & $GitPath -C $SubPath rev-parse --short HEAD 2>$null
        Write-Host ">>> 当前版本: $oldCommit" -ForegroundColor Gray

        Write-Host ">>> 正在从官方仓库拉取最新代码..." -ForegroundColor Yellow
        # 更新 submodule 到远程最新 commit
        Invoke-GitCommand "submodule update --init --recursive --remote third_party/Arduino_Core_STM32"
        
        # 获取更新后的版本哈希
        $newCommit = & $GitPath -C $SubPath rev-parse --short HEAD 2>$null

        if ($oldCommit -eq $newCommit) {
            Write-Host "`n=== 已是最新版本 ($newCommit) ===" -ForegroundColor Green
        }
        else {
            Write-Host "`n=== 同步成功! ($oldCommit -> $newCommit) ===" -ForegroundColor Green
            
            # 显示最近的一条日志
            Write-Host "最新提交:" -ForegroundColor Gray
            & $GitPath -C $SubPath log -1 --oneline

            Write-Host "`n[提示] 请运行选项2提交子模块指针变更。" -ForegroundColor Magenta
        }
    }
    else {
        Write-Warning "未找到 $SubPath 目录。"
        Write-Host "请先运行: git submodule add git@github.com:stm32duino/Arduino_Core_STM32.git third_party/Arduino_Core_STM32"
    }
}

# --- 主菜单 ---
Clear-Host
Write-Host "=========================================="
Write-Host "   EmbedBlocks 仓库同步工具"
Write-Host "=========================================="
Write-Host "1. 仅更新 blocksLib (插件库)"
Write-Host "2. 仅更新 主项目 (EmbedBlocks Studio)"
Write-Host "3. 联合更新 (先更新插件库，再更新主项目)"
Write-Host "4. 同步 Arduino Core STM32 (从官方拉取最新)"
Write-Host "Q. 退出"
Write-Host "=========================================="

$choice = Read-Host "请选择操作 [1-4, Q]"

switch ($choice) {
    "1" { Update-BlocksLib }
    "2" { Update-MainRepo }
    "3" { 
        Update-BlocksLib
        # 等待一小会儿确保文件系统同步
        Start-Sleep -Seconds 1
        Update-MainRepo 
    }
    "4" { Update-ArduinoCore }
    "Q" { exit }
    Default { Write-Warning "无效选择" }
}

Write-Host "`n所有操作已结束。按回车键退出..."
Read-Host
