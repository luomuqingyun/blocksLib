# EmbedBlocks Terminal Helper
$OutputEncoding = [Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$Host.UI.RawUI.WindowTitle = "EmbedBlocks CLI - test_generic_stm32wb05tz"

# 自动跳转到项目目录
Set-Location -Path $PSScriptRoot

# 设置环境变量

# 欢迎信息 (Bilingual)
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "   EmbedBlocks CLI Terminal Ready" -ForegroundColor Cyan
Write-Host "   PIO: pio" -ForegroundColor Gray
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host " [CN] 你现在可以运行 'pio run', 'pio run -t upload' 等命令"
Write-Host " [EN] You can now run 'pio run', 'pio run -t upload', etc."

Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host " TIPS: 如果此窗口点击即消失，请改用双击 'eb_terminal.bat' 运行。" -ForegroundColor Yellow
Write-Host " TIPS: If this window closes immediately, please double-click 'eb_terminal.bat'." -ForegroundColor Yellow
