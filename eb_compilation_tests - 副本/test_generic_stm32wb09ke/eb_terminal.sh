#!/bin/bash
cd "$(dirname "$0")"
export PATH=":$PATH"
echo "--------------------------------------------------"
echo "   EmbedBlocks CLI Terminal Ready"
echo "   PIO Path: pio"
echo "--------------------------------------------------"
echo " [CN] 你现在可以在此终端运行 pio 命令"
echo " [EN] You can now run pio commands in this terminal"
echo "--------------------------------------------------"
exec $SHELL
