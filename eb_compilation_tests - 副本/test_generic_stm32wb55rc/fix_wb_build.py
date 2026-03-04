# fix_wb_build.py (由 EmbedBlocks Studio 自动生成)
# 修复 STM32WB/WB0 系列在 STM32duino 框架中的多个编译兼容性问题
import os
import io
import re
import sys
from collections import deque
Import("env")

projenv = None
try:
    Import("projenv")
except:
    pass

# 1. 补充缺失的链接器符号 (Shared BLE Memory) 和保证基本宏定义
env.Append(LINKFLAGS=[
    "-Wl,--defsym=_sMB_MEM1=0x20030000",
    "-Wl,--defsym=_eMB_MEM1=0x20030000",
    "-Wl,--defsym=_siMB_MEM1=0x20030000",
    "-Wl,--defsym=_sMB_MEM2=0x20030000",
    "-Wl,--defsym=_eMB_MEM2=0x20030000",
    "-Wl,--defsym=_siMB_MEM2=0x20030000",
    "-Wl,--defsym=_sbssblue=0x20000000",
    "-Wl,--defsym=_ebssblue=0x20000000"
])

mcu = env.BoardConfig().get("build.mcu", "").lower()

def to_list(items):
    if items is None: return []
    if isinstance(items, list): return items
    if isinstance(items, (tuple, deque)): return list(items)
    try: return [str(x) for x in items]
    except: return [items]

def purge_wb0_defines(defines):
    raw_list = to_list(defines)
    new_defines = []
    
    for item in raw_list:
        item_str = str(item)
        if "STM32WBxx" in item_str and "STM32WB0x" not in item_str:
            pass # drop STM32WBxx for WB0
        else:
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                new_defines.append((str(item[0]), str(item[1])))
            else:
                new_defines.append(item)
    return new_defines

def redirect_wb0_paths(paths):
    raw_list = to_list(paths)
    new_paths = []
    for p in raw_list:
        p_str = str(p)
        if "STM32WBxx" in p_str and "STM32WB0x" not in p_str:
            new_p = p_str.replace("STM32WBxx", "STM32WB0x")
            new_paths.append(new_p)
        else: new_paths.append(p)
    return new_paths

def apply_wb0_fix(target_env):
    if target_env is None: return
    d = purge_wb0_defines(target_env.get("CPPDEFINES", []))
    if "STM32WB0x" not in str(d): d.append("STM32WB0x")
    target_env.Replace(CPPDEFINES=d)
    
    p = redirect_wb0_paths(target_env.get("CPPPATH", []))
    target_env.Replace(CPPPATH=p)

    def wb0_purge_middleware(cppdefines, cpppath, libpath, env=target_env):
        d = purge_wb0_defines(cppdefines)
        p = redirect_wb0_paths(cpppath)
        if "STM32WB0x" not in str(d): d.append("STM32WB0x")
        return d, p, libpath

    target_env.AddBuildMiddleware(wb0_purge_middleware)

# PIO 将 STM32WB0 的 series 解析为 STM32WBxx, 需要动态修正目录和宏
if "stm32wb0" in mcu:
    apply_wb0_fix(env)
    current_projenv = locals().get("projenv", None)
    if current_projenv and current_projenv != env:
        apply_wb0_fix(current_projenv)

# 获取 framework 目录 (最可靠的方式)
framework_dir = env.PioPlatform().get_package_dir("framework-arduinoststm32")
if not framework_dir:
    print("Warning: framework-arduinoststm32 not found, skipping WB patches")
else:
    src_dir = os.path.join(framework_dir, "libraries", "SrcWrapper", "src")

    def patch_file(rel_path, description, check_fn, patch_fn):
        """通用的源码补丁工具函数"""
        filepath = os.path.join(src_dir, rel_path)
        if not os.path.exists(filepath):
            return
        try:
            with io.open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            if check_fn(content):
                print(f"[WB0 Fix] Patching {rel_path}: {description}")
                new_content = patch_fn(content)
                with io.open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"[WB0 Fix] {rel_path} patched successfully!")
        except Exception as e:
            print(f"[WB0 Fix] Failed to patch {rel_path}: {e}")

    # 2. 修复 HardwareTimer.cpp: hdma 成员在不支持 TIM_DMA 的芯片上不存在
    patch_file(
        "HardwareTimer.cpp",
        "guard hdma[] with TIM_DMA_SUPPORT",
        lambda c: "hdma[0]" in c and "TIM_DMA_SUPPORT" not in c,
        lambda c: re.sub(
            r"(_timerObj\.handle\.hdma\[0\].*?_timerObj\.handle\.hdma\[6\]\s*=\s*(?:NULL|nullptr);)",
            r"#if defined(TIM_DMA_SUPPORT)\n  \1\n#endif",
            c, flags=re.DOTALL
        )
    )

    # 3. 修复 timer.c: TIM1_CC_IRQn 在 WB0 系列未定义 (WB0 只有合并的 TIM1_IRQn)
    patch_file(
        os.path.join("stm32", "timer.c"),
        "add TIM1_CC_IRQn fallback to TIM1_IRQn",
        lambda c: "TIM1_CC_IRQn" in c and "ifndef TIM1_CC_IRQn" not in c,
        lambda c: c.replace(
            "#if defined(HAL_TIM_MODULE_ENABLED) && !defined(HAL_TIM_MODULE_ONLY)",
            "#if defined(HAL_TIM_MODULE_ENABLED) && !defined(HAL_TIM_MODULE_ONLY)\n"
            "/* [WB0 Fix] STM32WB0 系列没有独立的 TIM CC 中断, 回退到合并中断 */\n"
            "#if defined(TIM1_BASE) && !defined(TIM1_CC_IRQn)\n"
            "  #define TIM1_CC_IRQn TIM1_IRQn\n"
            "#endif\n"
            "#if defined(TIM8_BASE) && !defined(TIM8_CC_IRQn)\n"
            "  #define TIM8_CC_IRQn TIM8_IRQn\n"
            "#endif\n"
            "#if defined(TIM20_BASE) && !defined(TIM20_CC_IRQn)\n"
            "  #define TIM20_CC_IRQn TIM20_IRQn\n"
            "#endif"
        )
    )

    # 4. 修复 uart.c: 
    #    (1) LPUART1 clock source config #error
    #        WB06/WB07 定义了 LPUART1_BASE 但没有 RCC_CFGR_LPUCLKSEL，
    #        导致 __HAL_RCC_LPUART1_CONFIG 和 __HAL_RCC_LPUART1_CLK_CONFIG 都未定义
    #    (2) HAL_UARTEx_EnableStopMode/DisableStopMode 不支持
    patch_file(
        os.path.join("stm32", "uart.c"),
        "replace LPUART1 clock config #error with no-op fallback & fix StopMode",
        lambda c: '#error "LPUART1 clock source config  not defined"' in c or "HAL_UARTEx_EnableStopMode(huart);" in c,
        lambda c: c.replace(
            '#error "LPUART1 clock source config  not defined"',
            '/* [WB0 Fix] 此芯片 LPUART1 无独立时钟源配置宏, 使用默认时钟 */\n'
            '          (void)0;  /* no-op: use default clock */'
        ).replace(
            "      HAL_UARTEx_EnableStopMode(huart);\n    } else {",
            "      #if !defined(STM32WB0x)\n      HAL_UARTEx_EnableStopMode(huart);\n      #endif\n    } else {"
        ).replace(
            "      HAL_UARTEx_DisableStopMode(huart);\n    }",
            "      #if !defined(STM32WB0x)\n      HAL_UARTEx_DisableStopMode(huart);\n      #endif\n    }"
        )
    )

