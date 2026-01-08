# 打包插件脚本 (Pack Plugins Script)
# 功能: 自动遍历当前目录下的所有插件文件夹，并将其压缩为同名的 .zip 文件。
# 用法: 在 blocksLib 目录下运行 ./pack_plugins.ps1

Write-Host ">>> 开始打包插件..."

# 获取所有子文件夹 (排除 .git 和当前目录)
$dirs = Get-ChildItem -Directory | Where-Object { $_.Name -ne ".git" }

foreach ($dir in $dirs) {
    $zipName = "$($dir.Name).zip"
    Write-Host "正在压缩: $($dir.Name) -> $zipName"
    
    # 如果已存在 zip，先删除以确保是最新版本
    if (Test-Path $zipName) {
        Remove-Item $zipName -Force
    }
    
    # 压缩文件夹内容
    Compress-Archive -Path $dir.FullName -DestinationPath $zipName -Force
}

Write-Host ">>> 打包完成！"
Write-Host "请记得运行 'git add *.zip' 并提交更新。"
