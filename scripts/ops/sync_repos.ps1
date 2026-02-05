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

/**
 * 助手函数: 执行 Git 命令并处理错误
 */
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

    # 2. Git 暂存 (-A 确保删除和新增都被记录)
    Write-Host ">>> 准备暂存所有变更..." -ForegroundColor Yellow
    if (-not (Invoke-GitCommand @("add", "-A"))) { 
        Pop-Location
        return 
    }
    
    # 3. Git 提交
    $commitMsg = Read-Host "请输入 blocksLib 子项目提交信息 (默认为 'Update plugins')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "Update plugins" }
    
    if (-not (Invoke-GitCommand @("commit", "-m", $commitMsg))) {
        Write-Host ">>> 跳过提交 (可能无变更)" -ForegroundColor Gray
    }
    
    # 4. Git 推送
    Write-Host ">>> 推送至 GitHub..." -ForegroundColor Yellow
    Invoke-GitCommand @("push", "origin", "main")

    Pop-Location
    Write-Host "=== blocksLib 更新完成 ===" -ForegroundColor Green
}

function Update-MainRepo {
    Write-Host "`n=== 正在更新 EmbedBlocks Studio (主项目) ===" -ForegroundColor Cyan

    # 1. 检查状态
    $status = & $GitPath status --short
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host ">>> 本地无任何变更，无需备份。" -ForegroundColor Gray
        return
    }

    # 2. Git 暂存 (使用 -A 实现全量备份，确保本地数据为主)
    Write-Host ">>> 正在全量暂存本地数据 (Capture all changes)..." -ForegroundColor Yellow
    if (-not (Invoke-GitCommand @("add", "-A"))) { return }

    # 3. Git 提交
    $commitMsg = Read-Host "请输入主项目提交信息 (默认为 'Update project')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "Update project" }
    
    Write-Host ">>> 正在创建备份提交..." -ForegroundColor Yellow
    if (-not (Invoke-GitCommand @("commit", "-m", $commitMsg))) {
        Write-Host ">>> 提交失败或由于无变更被跳过。" -ForegroundColor Gray
        return
    }

    # 4. Git 推送 (确保推送到远程仓库)
    Write-Host ">>> 正在推送到远程仓库 (Push to GitHub)..." -ForegroundColor Yellow
    if (Invoke-GitCommand @("push", "origin", "main")) {
        Write-Host "=== 主项目备份成功！所有本地数据已安全同步至云端 ===" -ForegroundColor Green
    } else {
        Write-Host ">>> [警告] 推送失败。请检查网络或是否存在远程冲突。" -ForegroundColor Red
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
