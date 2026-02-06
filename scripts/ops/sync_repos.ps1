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

# 助手函数: 执行 Git 命令并处理错误
function Invoke-GitCommand {
    param(
        [string[]]$ArgsArr
    )
    $cmdDisplay = "$GitPath " + ($ArgsArr -join " ")
    Write-Host "> $cmdDisplay" -ForegroundColor Gray
    
    # 执行命令
    & $GitPath $ArgsArr
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ">>> [错误] Git 命令执行失败 (退出码: $LASTEXITCODE)" -ForegroundColor Red
        return $false
    }
    return $true
}

function Update-Repo-Generic {
    param(
        [string]$Name,
        [string]$DefaultCommitMsg
    )
    Write-Host "`n=== 正在更新 $Name ===" -ForegroundColor Cyan

    # 1. 暂存所有变更
    Write-Host ">>> 正在暂存变更 (git add -A)..." -ForegroundColor Yellow
    if (-not (Invoke-GitCommand @("add", "-A"))) { return }

    # 2. 检查是否有需要提交的变更
    # git diff --cached --quiet 如果返回非0，说明有变更
    & $GitPath diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        # 有变更，询问提交信息并提交
        $commitMsg = Read-Host "请输入提交信息 (默认为 '$DefaultCommitMsg')"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = $DefaultCommitMsg }
        
        Write-Host ">>> 正在创建提交..." -ForegroundColor Yellow
        Invoke-GitCommand @("commit", "-m", $commitMsg)
    } else {
        Write-Host ">>> 本地无新变更需要提交。" -ForegroundColor Gray
    }

    # 3. 始终执行推送 (确保已提交但未推送的代码也能同步)
    Write-Host ">>> 正在推送到远程仓库 (Push to GitHub)..." -ForegroundColor Yellow
    if (Invoke-GitCommand @("push", "origin", "main")) {
        Write-Host "=== $Name 同步成功！ ===" -ForegroundColor Green
    } else {
        Write-Host ">>> [警告] 推送失败。请检查网络或是否存在远程冲突。" -ForegroundColor Red
    }
}

function Update-BlocksLib {
    if (-not (Test-Path "blocksLib")) {
        Write-Error "找不到 blocksLib 目录！"
        return
    }

    Push-Location "blocksLib"

    # 执行插件打包逻辑 (子仓库特有)
    if (Test-Path "pack_plugins.ps1") {
        $shouldPack = Read-Host "是否执行插件打包与市场更新 (Run pack_plugins.ps1)? [Y/n]"
        if ($shouldPack -eq "" -or $shouldPack -match "^[Yy]$") {
            Write-Host ">>> 执行插件打包逻辑..." -ForegroundColor Yellow
            .\pack_plugins.ps1
        }
    }

    Update-Repo-Generic -Name "blocksLib (插件库)" -DefaultCommitMsg "Update plugins"

    Pop-Location
}

function Update-MainRepo {
    Update-Repo-Generic -Name "EmbedBlocks Studio (主项目)" -DefaultCommitMsg "Update project"
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
