# ----------------------------------------------------------------------------
# 脚本名称: upload_images.ps1 (轻量级/Lightweight)
# 用途: 自动将本地图片上传到 GitHub 图床仓库
# 描述: 
# 1. 采用 "Sparse Checkout + Shallow Clone" 策略，避免下载整个仓库 (仅下载元数据和目标文件夹)。
#    - 大幅减少带宽消耗和等待时间，特别适合大型图床仓库。
# 2. 自动处理 Git 路径 (支持检测 D 盘常用安装路径)。
# 3. 执行 Clone -> Copy -> Commit -> Push 全流程。
# ----------------------------------------------------------------------------

# --- 1. Git 路径解析 (Git Path Resolution) ---
$GitPath = "git"
# 优先检查用户指定的特定路径 (防止环境变量未配置)
if (Test-Path "D:\Program Files\Git\cmd\git.exe") {
    $GitPath = "D:\Program Files\Git\cmd\git.exe"
} elseif (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
    Write-Error "未找到 Git。请安装 Git 或检查环境变量。"
    exit 1
}

Write-Host "使用 Git 路径: $GitPath" -ForegroundColor Gray

# --- 2. 辅助函数 (Helper) ---
function Run-GitCommand {
    param(
        [string]$ArgsStr
    )
    Write-Host "> $GitPath $ArgsStr" -ForegroundColor Gray
    # 使用 & 符号调用命令
    & $GitPath $ArgsStr.Split(" ")
}

# --- 3. 核心逻辑 (Main Logic) ---
$RepoUrl = "git@github.com:luomuqingyun/pic.git"
$LocalImagesPath = Join-Path $PSScriptRoot "temp_migration\manual_upload\embedblocks-boards"
$TempRepoPath = Join-Path $PSScriptRoot "temp_pic_repo"
$TargetSubDir = "embedblocks-boards"

Write-Host "`n=== 开始轻量级图片上传 (Lightweight Upload) ===" -ForegroundColor Cyan

# 检查本地源图片目录
if (-not (Test-Path $LocalImagesPath)) {
    Write-Error "错误: 本地图片源目录不存在 ($LocalImagesPath)"
    exit 1
}

# 清理旧的临时目录
if (Test-Path $TempRepoPath) {
    Write-Host "清理临时目录..." -ForegroundColor Gray
    Remove-Item -Path $TempRepoPath -Recurse -Force
}

# --- 优化克隆策略 (OPTIMIZED CLONE) ---
Write-Host "初始化稀疏检出 (Sparse Checkout)..." -ForegroundColor Yellow
# 1. 使用 --depth 1 (浅克隆) 和 --filter=blob:none (不下载文件内容)
#    这仅下载最新的 Commit 信息，速度极快。
Run-GitCommand "clone --depth 1 --filter=blob:none --sparse $RepoUrl $TempRepoPath"

if (-not (Test-Path $TempRepoPath)) {
    Write-Error "克隆失败 (目录未创建)"
    exit 1
}

Push-Location $TempRepoPath
try {
    # 2. 配置稀疏检出，只包含我们可以关心的文件夹
    Write-Host "配置目标文件夹: $TargetSubDir" -ForegroundColor Yellow
    Run-GitCommand "sparse-checkout set $TargetSubDir"
    
    # 此时 Git 只会从服务器下载 $TargetSubDir 目录下的文件

    # 3. 文件操作
    $DestPath = Join-Path $TempRepoPath $TargetSubDir
    if (-not (Test-Path $DestPath)) {
        New-Item -ItemType Directory -Path $DestPath | Out-Null
    }

    Write-Host "复制图片中..." -ForegroundColor Yellow
    Copy-Item "$LocalImagesPath\*.webp" $DestPath -Force
    $count = (Get-ChildItem "$LocalImagesPath\*.webp").Count
    Write-Host "已复制 $count 张图片。" -ForegroundColor Gray

    # 4. 提交与推送
    Write-Host "暂存更改 (Staging)..." -ForegroundColor Yellow
    Run-GitCommand "add ."
    
    $status = & $GitPath status --porcelain
    if ($status) {
        Run-GitCommand "commit -m ""Update EmbedBlocks board images (Lightweight Upload)"""
        
        Write-Host "推送到远程 (Pushing)..." -ForegroundColor Yellow
        Run-GitCommand "push origin main"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "成功: 上传完成！(SUCCESS)" -ForegroundColor Green
        } else {
            Write-Error "推送失败，请检查网络或权限。"
        }
    } else {
        Write-Host "成功: 没有检测到需要更新的图片。" -ForegroundColor Green
    }

} finally {
    Pop-Location
}

# 验证项目配置链接
$JsonPath = Join-Path $PSScriptRoot "..\src\data\standard_board_data.json"
if (Test-Path $JsonPath) {
    $content = Get-Content $JsonPath -Raw
    if ($content -match "raw.githubusercontent.com/luomuqingyun/pic") {
        Write-Host "`n[验证通过] standard_board_data.json 已正确链接到该图床。" -ForegroundColor Green
    }
}
