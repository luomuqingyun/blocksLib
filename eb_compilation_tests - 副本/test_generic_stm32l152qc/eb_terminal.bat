@echo off
title EmbedBlocks CLI - test_generic_stm32l152qc
cd /d "%~dp0"
echo [EmbedBlocks] Starting development environment...
"D:\Program Files\PowerShell\7\pwsh.exe" -NoExit -ExecutionPolicy Bypass -File "%~dp0eb_terminal.ps1"
