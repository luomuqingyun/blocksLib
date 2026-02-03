<#
.SYNOPSIS
    PlatformIO 离线环境自动化打包脚本 (Windows)
.DESCRIPTION
    此脚本会自动创建 bundled_pio 文件夹，建立 Python 虚拟环境，
    设置环境变量，并下载指定的平台和工具链，用于 EmbedBlocks 的离线分发。
.NOTES
    运行前请确保：
    1. 系统已安装 Python (或在 Conda 环境中)。
    2. PowerShell 执行策略允许运行脚本 (Set-ExecutionPolicy RemoteSigned)。
#>

# --- 配置区域 ---
$TargetDir = Join-Path $PSScriptRoot "..\bundled_pio" # 输出在项目根目录
$CoreDir = Join-Path $TargetDir "core"
$PenvDir = Join-Path $TargetDir "penv"

# 需要预下载的平台列表
$Platforms = @(
    "atmelavr",
    "espressif32",
    "ststm32"
)

# 需要额外预下载的工具 (特别是 STM32 相关的上传工具)
$ExtraTools = @(
    "tool-stm32duino",
    "tool-dfuutil",
    "tool-openocd",
    "tool-stlink"
    # "framework-stm32cubef1" # 如果需要支持 HAL 库可解注
)

# -----------------------------------------------------------

Write-Host ">>> [1/7] 初始化构建环境..." -ForegroundColor Cyan
# 确保在根目录
if (Test-Path $TargetDir) {
    Write-Host "发现旧的 bundled_pio，正在清理..." -ForegroundColor Yellow
    Remove-Item -Path $TargetDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TargetDir | Out-Null
New-Item -ItemType Directory -Path $CoreDir | Out-Null
Write-Host "目录创建完成: $TargetDir" -ForegroundColor Green

Write-Host "`n>>> [2/7] 创建 Python 虚拟环境 (venv)..." -ForegroundColor Cyan
try {
    python -m venv $PenvDir
} catch {
    Write-Error "创建虚拟环境失败，请检查 Python 是否安装。"
    exit 1
}

# 智能判断 Scripts 还是 bin
$PioExe = ""
$PipExe = ""
if (Test-Path "$PenvDir\Scripts\python.exe") {
    Write-Host "检测到 Windows 标准结构 (Scripts)" -ForegroundColor Gray
    $PioExe = "$PenvDir\Scripts\pio.exe"
    $PipExe = "$PenvDir\Scripts\pip.exe"
} elseif (Test-Path "$PenvDir\bin\python") {
    Write-Host "检测到 Posix 兼容结构 (bin)" -ForegroundColor Gray
    $PioExe = "$PenvDir\bin\pio"
    $PipExe = "$PenvDir\bin\pip"
} else {
    Write-Error "虚拟环境结构未知，无法继续。"
    exit 1
}

Write-Host "`n>>> [3/7] 安装 PlatformIO Core..." -ForegroundColor Cyan
& $PipExe install -U platformio | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "PIO 安装失败"; exit 1 }
Write-Host "PlatformIO Core 安装成功" -ForegroundColor Green

Write-Host "`n>>> [4/7] 配置离线环境变量..." -ForegroundColor Cyan
# 关键：设置当前 Session 的环境变量，强制指向我们的 core 目录
$env:PLATFORMIO_CORE_DIR = $CoreDir
$env:PLATFORMIO_GLOBALLIB_DIR = Join-Path $CoreDir "lib"
$env:PLATFORMIO_NO_SESSION_ACCESS = "1"
Write-Host "PLATFORMIO_CORE_DIR set to: $env:PLATFORMIO_CORE_DIR" -ForegroundColor Gray

Write-Host "`n>>> [5/7] 下载开发板平台 (Platforms)..." -ForegroundColor Cyan
foreach ($plat in $Platforms) {
    Write-Host "正在下载平台: $plat ..." -ForegroundColor Yellow
    & $PioExe pkg install --global --platform $plat
    if ($LASTEXITCODE -ne 0) { Write-Warning "平台 $plat 下载出现问题，但这可能只是网络波动。" }
}

Write-Host "`n>>> [6/7] 下载额外工具 (Tools)..." -ForegroundColor Cyan
foreach ($tool in $ExtraTools) {
    Write-Host "正在下载工具: $tool ..." -ForegroundColor Yellow
    & $PioExe pkg install --global --tool $tool
    if ($LASTEXITCODE -ne 0) { Write-Warning "工具 $tool 下载出现问题。" }
}

Write-Host "`n>>> [7/7] 清理缓存..." -ForegroundColor Cyan
$CacheDir = Join-Path $CoreDir ".cache"
if (Test-Path $CacheDir) {
    Remove-Item -Path $CacheDir -Recurse -Force
    Write-Host "已删除下载缓存 (.cache) 以减小体积" -ForegroundColor Green
}

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host "  ✅ 离线环境构建完成！" -ForegroundColor Green
Write-Host "  位置: $TargetDir"
Write-Host "  现在运行 'npm run build' 即可将其打包进安装程序。"
Write-Host "==============================================" -ForegroundColor Green