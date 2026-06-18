# 打包插件与生成市场配置脚本 (Pack Plugins & Generate Marketplace JSON)
# 功能: 
# 1. 自动遍历当前目录下的所有插件文件夹，将其压缩为 .zip。
# 2. 读取每个插件的 manifest.json，自动生成新的 marketplace.json。
# 用法: 在 blocksLib 目录下运行 ./pack_plugins.ps1

Write-Host ">>> 开始执行自动化打包流程..." -ForegroundColor Cyan

# 配置
$RepoUser = "luomuqingyun"
$RepoName = "blocksLib"
$Branch = "main"
$BaseUrl = "https://raw.githubusercontent.com/$RepoUser/$RepoName/$Branch"

# 获取所有子文件夹 (排除 .git)
$dirs = Get-ChildItem -Directory | Where-Object { $_.Name -ne ".git" }
$extensionsList = @()

foreach ($dir in $dirs) {
    # ---------------------------
    # 1. 压缩逻辑
    # ---------------------------
    $zipName = "$($dir.Name).zip"
    # Write-Host "正在处理: $($dir.Name)" -NoNewline

    # 如果已存在 zip，删除旧的
    if (Test-Path $zipName) {
        Remove-Item $zipName -Force
    }
    
    # 压缩文件夹内容
    Compress-Archive -Path $dir.FullName -DestinationPath $zipName -Force
    # Write-Host " -> 已压缩" -ForegroundColor Green

    # ---------------------------
    # 2. 读取元数据生成 JSON
    # ---------------------------
    $manifestPath = Join-Path $dir.FullName "manifest.json"
    if (Test-Path $manifestPath) {
        try {
            # 读取 manifest.json
            $content = Get-Content $manifestPath -Raw -Encoding UTF8
            $manifest = $content | ConvertFrom-Json
            
            # 使用 manifest 中的 homepage (如果存在)，否则使用默认仓库链接
            $homepage = if ($manifest.homepage) { $manifest.homepage } else { "https://github.com/$RepoUser/$RepoName" }
            
            # 检查是否有 icon.png，如果有则生成链接
            $iconPath = Join-Path $dir.FullName "icon.png"
            $iconUrl = ""
            if (Test-Path $iconPath) {
                # 假设 icon 就在插件根目录
                $iconUrl = "$BaseUrl/$($dir.Name)/icon.png"
            }

            # 构建市场对象
            $extObj = [PSCustomObject]@{
                id          = $manifest.id
                version     = $manifest.version
                name        = $manifest.name
                description = $manifest.description
                author      = $manifest.author
                downloadUrl = "$BaseUrl/$zipName"
                homepage    = $homepage
                icon        = $iconUrl
            }
            
            # 如果是 board 类型，也带上 type 字段
            if ($manifest.type) {
                $extObj | Add-Member -MemberType NoteProperty -Name "type" -Value $manifest.type
            }

            $extensionsList += $extObj
            Write-Host "  + 已收录: $($manifest.name) (v$($manifest.version))" -ForegroundColor Gray

        }
        catch {
            Write-Warning "  ! 无法解析 $($dir.Name)/manifest.json: $_"
        }
    }
    else {
        Write-Warning "  ! 跳过 $($dir.Name): 未找到 manifest.json"
    }
}

# ---------------------------
# 3. 输出 marketplace.json
# ---------------------------
$marketJson = [Ordered]@{
    extensions = $extensionsList
}

$jsonContent = $marketJson | ConvertTo-Json -Depth 5
# 美化 JSON 输出 (PowerShell ConvertTo-Json 默认格式可能不太好看，手动加点换行)
# 为了简单，直接写入，大部分编辑器能自动格式化。这里不强求完美缩进。

$jsonOutputPath = "marketplace.json"
$jsonContent | Set-Content -Path $jsonOutputPath -Encoding UTF8

Write-Host ">>> marketplace.json 已自动更新！" -ForegroundColor Green
Write-Host "包含插件数: $($extensionsList.Count)"
Write-Host ">>> 流程结束。请提交更改。"
