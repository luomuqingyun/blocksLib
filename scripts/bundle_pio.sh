#!/bin/bash

# SYNOPSIS
#     PlatformIO 离线环境自动化打包脚本 (Mac/Linux)
# DESCRIPTION
#     此脚本会自动创建 bundled_pio 文件夹，建立 Python 虚拟环境，
#     设置环境变量，并下载指定的平台和工具链，用于 EmbedBlocks 的离线分发。
# NOTES
#     运行前请确保：
#     1. 系统已安装 Python 3。
#     2. 脚本具有执行权限 (chmod +x bundle_pio.sh)。

# --- 配置区域 ---
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
TARGET_DIR="$SCRIPT_DIR/../bundled_pio" # 输出在项目根目录
CORE_DIR="$TARGET_DIR/core"
PENV_DIR="$TARGET_DIR/penv"

# 需要预下载的平台列表
PLATFORMS=(
    "atmelavr"
    "espressif32"
    "ststm32"
)

# 需要额外预下载的工具 (特别是 STM32 相关的上传工具)
EXTRA_TOOLS=(
    "tool-stm32duino"
    "tool-dfuutil"
    "tool-openocd"
    "tool-stlink"
    # "framework-stm32cubef1" # 如果需要支持 HAL 库可解注
)

# -----------------------------------------------------------

echo -e "\033[0;36m>>> [1/7] 初始化构建环境...\033[0m"
# 确保在根目录
if [ -d "$TARGET_DIR" ]; then
    echo -e "\033[0;33m发现旧的 bundled_pio，正在清理...\033[0m"
    rm -rf "$TARGET_DIR"
fi
mkdir -p "$TARGET_DIR"
mkdir -p "$CORE_DIR"
echo -e "\033[0;32m目录创建完成: $TARGET_DIR\033[0m"

echo -e "\n\033[0;36m>>> [2/7] 创建 Python 虚拟环境 (venv)...\033[0m"
if ! python3 -m venv "$PENV_DIR"; then
    echo -e "\033[0;31m创建虚拟环境失败，请检查 Python3 是否安装。\033[0m"
    exit 1
fi

# 智能判断 Scripts 还是 bin (Linux/Mac 通常是 bin)
PIO_EXE=""
PIP_EXE=""
if [ -f "$PENV_DIR/bin/python" ]; then
    echo -e "\033[0;37m检测到 Posix 兼容结构 (bin)\033[0m"
    PIO_EXE="$PENV_DIR/bin/pio"
    PIP_EXE="$PENV_DIR/bin/pip"
elif [ -f "$PENV_DIR/Scripts/python.exe" ]; then
    # 这种情况在 Linux/Mac 上不太可能发生，除非是在 Wine 下运行
    echo -e "\033[0;37m检测到 Windows 标准结构 (Scripts)\033[0m"
    PIO_EXE="$PENV_DIR/Scripts/pio.exe"
    PIP_EXE="$PENV_DIR/Scripts/pip.exe"
else
    echo -e "\033[0;31m虚拟环境结构未知，无法继续。\033[0m"
    exit 1
fi

echo -e "\n\033[0;36m>>> [3/7] 安装 PlatformIO Core...\033[0m"
"$PIP_EXE" install -U platformio > /dev/null
if [ $? -ne 0 ]; then
    echo -e "\033[0;31mPIO 安装失败\033[0m"
    exit 1
fi
echo -e "\033[0;32mPlatformIO Core 安装成功\033[0m"

echo -e "\n\033[0;36m>>> [4/7] 配置离线环境变量...\033[0m"
# 关键：设置当前 Session 的环境变量，强制指向我们的 core 目录
export PLATFORMIO_CORE_DIR="$CORE_DIR"
export PLATFORMIO_GLOBALLIB_DIR="$CORE_DIR/lib"
export PLATFORMIO_NO_SESSION_ACCESS="1"
echo -e "\033[0;37mPLATFORMIO_CORE_DIR set to: $PLATFORMIO_CORE_DIR\033[0m"

echo -e "\n\033[0;36m>>> [5/7] 下载开发板平台 (Platforms)...\033[0m"
for plat in "${PLATFORMS[@]}"; do
    echo -e "\033[0;33m正在下载平台: $plat ...\033[0m"
    "$PIO_EXE" pkg install --global --platform "$plat"
    if [ $? -ne 0 ]; then
        echo -e "\033[0;33m平台 $plat 下载出现问题，但这可能只是网络波动。\033[0m"
    fi
done

echo -e "\n\033[0;36m>>> [6/7] 下载额外工具 (Tools)...\033[0m"
for tool in "${EXTRA_TOOLS[@]}"; do
    echo -e "\033[0;33m正在下载工具: $tool ...\033[0m"
    "$PIO_EXE" pkg install --global --tool "$tool"
    if [ $? -ne 0 ]; then
        echo -e "\033[0;33m工具 $tool 下载出现问题。\033[0m"
    fi
done

echo -e "\n\033[0;36m>>> [7/7] 清理缓存...\033[0m"
CACHE_DIR="$CORE_DIR/.cache"
if [ -d "$CACHE_DIR" ]; then
    rm -rf "$CACHE_DIR"
    echo -e "\033[0;32m已删除下载缓存 (.cache) 以减小体积\033[0m"
fi

echo -e "\n\033[0;32m==============================================\033[0m"
echo -e "\033[0;32m  ✅ 离线环境构建完成！\033[0m"
echo -e "  位置: $TARGET_DIR"
echo -e "  现在运行 'npm run build' 即可将其打包进安装程序。"
echo -e "\033[0;32m==============================================\033[0m"
