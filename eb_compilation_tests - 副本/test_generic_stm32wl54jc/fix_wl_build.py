# fix_wl_build.py (由 EmbedBlocks Studio 自动生成)
import os
Import("env")

# 修复 STM32WL 系列多个 variant_*.cpp 被同时包含的问题
# 只保留 variant_generic.cpp

def filter_variant_files(env):
    proj_dir = env.get("PROJECT_DIR", "")
    variant_dir = os.path.join(proj_dir, "variants", "eb_custom_variant")
    if not os.path.exists(variant_dir): return

    to_exclude = []
    for f in os.listdir(variant_dir):
        if f.startswith("variant_") and f.endswith(".cpp") and f != "variant_generic.cpp":
            to_exclude.append(f)
    
    if to_exclude:
        # 使用 SRC_FILTER 过滤掉这些多余的变体源文件
        # 在 pre-script 中, 我们直接修改 SRC_FILTER
        filter_str = " ".join([f"-<variants/eb_custom_variant/{x}>" for x in to_exclude])
        env.Append(SRC_FILTER=[filter_str])
        print(f"\n[EmbedBlocks FIX] (Pre-script) Excluded multiple WL variants: {', '.join(to_exclude)}\n")

filter_variant_files(env)
