# fix_ll_dlyb.py (由 EmbedBlocks Studio 自动生成)
import os
Import("env")

def empty_ll_dlyb(source, target, env):
    # Find framework-arduinoststm32 package path
    framework_dir = env.PioPlatform().get_package_dir("framework-arduinoststm32")
    if framework_dir:
        dlyb_file = os.path.join(framework_dir, "libraries", "SrcWrapper", "src", "LL", "stm32yyxx_ll_dlyb.c")
        if os.path.exists(dlyb_file):
            print(f"\n[EmbedBlocks FIX] Emptying bugged LL library file: {dlyb_file}\n")
            with open(dlyb_file, "w") as f:
                f.write("/* Emptied by EmbedBlocks due to LL_DLYB_CfgTypeDef bug */\n")

empty_ll_dlyb(None, None, env)
